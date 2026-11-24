import os
from datetime import timedelta
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


def _require(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name} (see .env.example)")
    return value


class Config:
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://{u}:{p}@{h}:{port}/{d}".format(
        u=quote_plus(_require("DB_USER")),
        p=quote_plus(_require("DB_PASSWORD")),
        h=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "3306"),
        d=_require("DB_NAME"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}
    JWT_SECRET_KEY = _require("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "8")))
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # frames are small JPEGs
    FACE_MODEL_PATH = os.getenv("FACE_MODEL_PATH", "assets/face_landmarker.task")
