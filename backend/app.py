import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db
from routes.auth import bp as auth_bp
from routes.dashboard import bp as dashboard_bp
from routes.sessions import bp as sessions_bp
from routes.settings import bp as settings_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})
    db.init_app(app)
    JWTManager(app)

    for bp in (auth_bp, dashboard_bp, sessions_bp, settings_bp):
        app.register_blueprint(bp)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found."), 404

    @app.errorhandler(413)
    def too_large(_):
        return jsonify(error="Request too large."), 413

    @app.errorhandler(500)
    def server_error(_):
        db.session.rollback()
        return jsonify(error="Internal server error."), 500

    with app.app_context():
        db.create_all()
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
