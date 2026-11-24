from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt):
    return dt.isoformat() + "Z" if dt else None


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    sessions = db.relationship("MonitoringSession", backref="user", cascade="all, delete-orphan")
    settings = db.relationship("UserSettings", backref="user", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class MonitoringSession(db.Model):
    __tablename__ = "monitoring_sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = db.Column(db.DateTime, default=utcnow, nullable=False)
    end_time = db.Column(db.DateTime)
    duration = db.Column(db.Integer, default=0, nullable=False)  # seconds
    total_blinks = db.Column(db.Integer, default=0, nullable=False)
    total_alerts = db.Column(db.Integer, default=0, nullable=False)

    events = db.relationship("DrowsinessEvent", backref="session", cascade="all, delete-orphan",
                             order_by="DrowsinessEvent.event_time")

    def to_dict(self):
        return {"id": self.id, "start_time": iso(self.start_time), "end_time": iso(self.end_time),
                "duration": self.duration, "total_blinks": self.total_blinks,
                "total_alerts": self.total_alerts}


class DrowsinessEvent(db.Model):
    __tablename__ = "drowsiness_events"
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("monitoring_sessions.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)
    event_time = db.Column(db.DateTime, default=utcnow, nullable=False)
    eye_aspect_ratio = db.Column(db.Float)

    def to_dict(self):
        return {"id": self.id, "event_type": self.event_type, "event_time": iso(self.event_time),
                "eye_aspect_ratio": self.eye_aspect_ratio}


class UserSettings(db.Model):
    __tablename__ = "user_settings"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    ear_threshold = db.Column(db.Float, default=0.21, nullable=False)
    alert_enabled = db.Column(db.Boolean, default=True, nullable=False)
    sensitivity = db.Column(db.String(10), default="medium", nullable=False)

    def to_dict(self):
        return {"ear_threshold": self.ear_threshold, "alert_enabled": self.alert_enabled,
                "sensitivity": self.sensitivity}
