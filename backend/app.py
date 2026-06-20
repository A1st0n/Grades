import datetime
import os

import jwt
from flask import Flask, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me-to-a-32-byte-string")
TOKEN_TTL = datetime.timedelta(hours=1)


def _hash(pw):
    return generate_password_hash(pw, method="pbkdf2:sha256")


# : seeded in-memory users. Swap for the SQLite/Flask-Admin DB the lab
# wants once the rest of the app lands login code below won't change.
USERS = {
    "admin": {"role": "admin", "pw": _hash("admin123")},
    "stu": {"role": "student", "pw": _hash("student123")},
    "ahepworth": {"role": "teacher", "pw": _hash("teacher123")},
}


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    user = USERS.get(data.get("username", ""))
    if not user or not check_password_hash(user["pw"], data.get("password", "")):
        return jsonify(error="Invalid username or password"), 401

    exp = datetime.datetime.now(datetime.timezone.utc) + TOKEN_TTL
    token = jwt.encode(
        {"sub": data["username"], "role": user["role"], "exp": exp},
        SECRET,
        algorithm="HS256",
    )
    return jsonify(token=token, role=user["role"])


if __name__ == "__main__":
    app.run(port=5001, debug=True)
