from datetime import datetime, time, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from models import db, MonitoringSession as S, utcnow

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.get("")
@jwt_required()
def summary():
    uid = int(get_jwt_identity())
    tz = request.args.get("tz_offset", 0, type=int)  # JS getTimezoneOffset(): minutes behind UTC
    done = (S.user_id == uid, S.end_time.isnot(None))

    n, dur, blinks, alerts = db.session.query(
        func.count(S.id), func.coalesce(func.sum(S.duration), 0),
        func.coalesce(func.sum(S.total_blinks), 0), func.coalesce(func.sum(S.total_alerts), 0),
    ).filter(*done).one()

    recent = S.query.filter(*done).order_by(S.start_time.desc()).limit(5).all()

    first_day = (utcnow() - timedelta(minutes=tz)).date() - timedelta(days=6)
    since = datetime.combine(first_day, time.min) + timedelta(minutes=tz)
    buckets = {first_day + timedelta(days=i): {"sessions": 0, "minutes": 0.0, "alerts": 0, "blinks": 0}
               for i in range(7)}
    for s in S.query.filter(*done, S.start_time >= since).all():
        b = buckets.get((s.start_time - timedelta(minutes=tz)).date())
        if b:
            b["sessions"] += 1
            b["minutes"] += s.duration / 60
            b["alerts"] += s.total_alerts
            b["blinks"] += s.total_blinks

    weekly = [{"date": d.isoformat(), "label": d.strftime("%a %d"), **v, "minutes": round(v["minutes"], 1)}
              for d, v in buckets.items()]
    return jsonify(totals={"sessions": int(n), "duration": int(dur), "blinks": int(blinks), "alerts": int(alerts)},
                   recent=[r.to_dict() for r in recent], weekly=weekly)
