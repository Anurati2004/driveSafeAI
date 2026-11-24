from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, UserSettings
from routes import err

bp = Blueprint("settings", __name__, url_prefix="/api/settings")


def _get(uid):
    s = UserSettings.query.filter_by(user_id=uid).first()
    if not s:
        s = UserSettings(user_id=uid)
        db.session.add(s)
        db.session.commit()
    return s


@bp.get("")
@jwt_required()
def read():
    return jsonify(_get(int(get_jwt_identity())).to_dict())


@bp.put("")
@jwt_required()
def update():
    d = request.get_json(silent=True) or {}
    s = _get(int(get_jwt_identity()))
    if "ear_threshold" in d:
        try:
            v = float(d["ear_threshold"])
        except (TypeError, ValueError):
            return err("EAR threshold must be a number.")
        if not 0.15 <= v <= 0.30:
            return err("EAR threshold must be between 0.15 and 0.30.")
        s.ear_threshold = round(v, 3)
    if "alert_enabled" in d:
        if not isinstance(d["alert_enabled"], bool):
            return err("alert_enabled must be true or false.")
        s.alert_enabled = d["alert_enabled"]
    if "sensitivity" in d:
        if d["sensitivity"] not in ("low", "medium", "high"):
            return err("Sensitivity must be low, medium or high.")
        s.sensitivity = d["sensitivity"]
    db.session.commit()
    return jsonify(s.to_dict())
