from flask import jsonify


def err(message, code=400):
    return jsonify(error=message), code
