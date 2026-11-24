import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError

from models import db, User, UserSettings
from routes import err

bp = Blueprint("auth", __name__, url_prefix="/api/auth")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _token_response(user, code=200):
    return jsonify(token=create_access_token(identity=str(user.id)), user=user.to_dict()), code


@bp.post("/register")
def register():
    d = request.get_json(silent=True) or {}
    name, email, pw = (d.get("name") or "").strip(), (d.get("email") or "").strip().lower(), d.get("password") or ""
    if not 2 <= len(name) <= 100:
        return err("Name must be 2–100 characters.")
    if not EMAIL_RE.match(email) or len(email) > 255:
        return err("Enter a valid email address.")
    if len(pw) < 8 or len(pw) > 128:
        return err("Password must be 8–128 characters.")
    if User.query.filter_by(email=email).first():
        return err("An account with this email already exists.", 409)
    user = User(name=name, email=email, password_hash=generate_password_hash(pw))
    user.settings = UserSettings()
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return err("An account with this email already exists.", 409)
    return _token_response(user, 201)


@bp.post("/login")
def login():
    d = request.get_json(silent=True) or {}
    email, pw = (d.get("email") or "").strip().lower(), d.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, pw):
        return err("Incorrect email or password.", 401)
    return _token_response(user)


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    return jsonify(user=user.to_dict()) if user else err("User not found.", 404)
