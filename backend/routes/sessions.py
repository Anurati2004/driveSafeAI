import base64
import time
from datetime import timedelta

import cv2
import numpy as np
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, MonitoringSession, DrowsinessEvent, UserSettings, utcnow
from routes import err
from services import monitor
from services.detector import get_detector

bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")


def _close(s, end=None):
    st = monitor.pop(s.id)
    s.end_time = end or utcnow()
    s.duration = max(0, int((s.end_time - s.start_time).total_seconds()))
    if st:
        s.total_blinks, s.total_alerts = st.blinks, st.alerts
    else:  # server restarted mid-session: blinks are lost, alerts are recoverable
        s.total_alerts = DrowsinessEvent.query.filter_by(session_id=s.id).count()


@bp.post("/start")
@jwt_required()
def start():
    uid = int(get_jwt_identity())
    for stale in MonitoringSession.query.filter_by(user_id=uid, end_time=None).all():
        st = monitor.get(stale.id)  # abandoned tab: end it at its last received frame
        _close(stale, stale.start_time + timedelta(seconds=(st.last_seen - st.started)) if st else stale.start_time)
    settings = UserSettings.query.filter_by(user_id=uid).first() or UserSettings(user_id=uid)
    s = MonitoringSession(user_id=uid)
    db.session.add(s)
    db.session.commit()
    monitor.create(s.id, uid, settings)
    return jsonify(id=s.id), 201


@bp.post("/<int:sid>/frame")
@jwt_required()
def frame(sid):
    uid = int(get_jwt_identity())
    st = monitor.get(sid)
    if st is None:  # unknown, finished, or lost after a restart
        return err("Session is not active.", 409)
    if st.user_id != uid:
        return err("Session not found.", 404)

    image = (request.get_json(silent=True) or {}).get("image")
    if not isinstance(image, str) or len(image) > 1_500_000:
        return err("A base64 'image' field is required.")
    try:
        raw = base64.b64decode(image.split(",", 1)[-1])
        bgr = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        bgr = None
    if bgr is None:
        return err("Could not decode image.")

    try:
        ear = get_detector(current_app.config["FACE_MODEL_PATH"]).analyze(bgr)
    except FileNotFoundError as e:
        return err(str(e), 503)

    result = st.update(ear, time.time())
    if result["new_alert"]:
        db.session.add(DrowsinessEvent(session_id=sid, event_type="prolonged_eye_closure",
                                       event_time=utcnow(), eye_aspect_ratio=result["ear"]))
        db.session.commit()
    return jsonify(result)


@bp.post("/<int:sid>/stop")
@jwt_required()
def stop(sid):
    s = MonitoringSession.query.filter_by(id=sid, user_id=int(get_jwt_identity())).first()
    if not s:
        return err("Session not found.", 404)
    if s.end_time is None:
        _close(s)
        db.session.commit()
    return jsonify(s.to_dict())


@bp.get("")
@jwt_required()
def list_sessions():
    limit = min(request.args.get("limit", 100, type=int), 500)
    rows = (MonitoringSession.query
            .filter(MonitoringSession.user_id == int(get_jwt_identity()), MonitoringSession.end_time.isnot(None))
            .order_by(MonitoringSession.start_time.desc()).limit(limit).all())
    return jsonify(sessions=[r.to_dict() for r in rows])


@bp.get("/<int:sid>")
@jwt_required()
def detail(sid):
    s = MonitoringSession.query.filter_by(id=sid, user_id=int(get_jwt_identity())).first()
    if not s:
        return err("Session not found.", 404)
    return jsonify(session=s.to_dict(), events=[e.to_dict() for e in s.events])
