import datetime
import os

import jwt
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)

SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
TOKEN_TTL = datetime.timedelta(hours=2)

# SQLite database file will be made inside the backend folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "school.db")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + DB_PATH
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    teacher = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(80), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)


class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"), nullable=False)
    grade = db.Column(db.Float, nullable=True)

    user = db.relationship("User")
    course = db.relationship("Course")


def make_hash(password):
    return generate_password_hash(password, method="pbkdf2:sha256")


def make_token(user):
    exp = datetime.datetime.now(datetime.timezone.utc) + TOKEN_TTL
    token = jwt.encode(
        {"sub": user.username, "role": user.role, "name": user.display_name, "exp": exp},
        SECRET,
        algorithm="HS256",
    )
    return token


def current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth.replace("Bearer ", "", 1)
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
    except Exception:
        return None

    return User.query.filter_by(username=data.get("sub")).first()


def require_login():
    user = current_user()
    if user is None:
        return None, (jsonify(error="Please log in first"), 401)
    return user, None


def require_admin():
    user, error = require_login()
    if error:
        return None, error
    if user.role != "admin":
        return None, (jsonify(error="Admins only"), 403)
    return user, None


def course_to_dict(course, student=None):
    enrolled_count = Enrollment.query.filter_by(course_id=course.id).count()
    already_enrolled = False

    if student:
        already_enrolled = Enrollment.query.filter_by(
            user_id=student.id,
            course_id=course.id,
        ).first() is not None

    return {
        "id": course.id,
        "name": course.name,
        "teacher": course.teacher,
        "time": course.time,
        "capacity": course.capacity,
        "enrolled": enrolled_count,
        "spots": str(enrolled_count) + "/" + str(course.capacity),
        "full": enrolled_count >= course.capacity,
        "already_enrolled": already_enrolled,
    }


def user_to_dict(user, current_admin=None):
    can_delete = True

    if current_admin and user.id == current_admin.id:
        can_delete = False

    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "can_delete": can_delete,
    }


def enrollment_to_dict(row):
    return {
        "id": row.id,
        "student_id": row.user_id,
        "student_name": row.user.display_name,
        "username": row.user.username,
        "course_id": row.course_id,
        "course_name": row.course.name,
        "grade": row.grade,
    }


def seed_data():
    if User.query.first():
        return

    admin = User(username="admin", password_hash=make_hash("admin123"), role="admin", display_name="Admin")
    chuck = User(username="cnorris", password_hash=make_hash("student123"), role="student", display_name="Chuck")
    mindy = User(username="mlopez", password_hash=make_hash("student123"), role="student", display_name="Mindy")
    aditya = User(username="aranganath", password_hash=make_hash("student123"), role="student", display_name="Aditya Ranganath")
    nancy = User(username="nlittle", password_hash=make_hash("student123"), role="student", display_name="Nancy Little")
    yiwen = User(username="ychen", password_hash=make_hash("student123"), role="student", display_name="Yi Wen Chen")
    john = User(username="jstuart", password_hash=make_hash("student123"), role="student", display_name="John Stuart")
    teacher = User(username="ahepworth", password_hash=make_hash("teacher123"), role="teacher", display_name="Dr Hepworth")

    users = [admin, chuck, mindy, aditya, nancy, yiwen, john, teacher]
    for u in users:
        db.session.add(u)

    physics = Course(name="Physics 121", teacher="Susan Walker", time="TR 11:00-11:50 AM", capacity=10)
    cs106 = Course(name="CS 106", teacher="Ammon Hepworth", time="MWF 2:00-2:50 PM", capacity=10)
    math101 = Course(name="Math 101", teacher="Ralph Jenkins", time="MWF 10:00-10:50 AM", capacity=8)
    cs162 = Course(name="CS 162", teacher="Ammon Hepworth", time="TR 3:00-3:50 PM", capacity=4)

    courses = [physics, cs106, math101, cs162]
    for c in courses:
        db.session.add(c)

    db.session.commit()

    db.session.add(Enrollment(user_id=chuck.id, course_id=physics.id, grade=88))
    db.session.add(Enrollment(user_id=chuck.id, course_id=cs106.id, grade=91))
    db.session.add(Enrollment(user_id=mindy.id, course_id=math101.id, grade=85))
    db.session.add(Enrollment(user_id=aditya.id, course_id=cs162.id, grade=92))
    db.session.add(Enrollment(user_id=nancy.id, course_id=cs162.id, grade=78))
    db.session.add(Enrollment(user_id=yiwen.id, course_id=cs162.id, grade=95))
    db.session.add(Enrollment(user_id=john.id, course_id=cs162.id, grade=76))
    db.session.commit()


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "")
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid username or password"), 401

    return jsonify(
        token=make_token(user),
        role=user.role,
        username=user.username,
        display_name=user.display_name,
    )


@app.get("/api/me")
def me():
    user, error = require_login()
    if error:
        return error
    return jsonify(user_to_dict(user))


# -------------------------
# Student pages / API
# -------------------------

@app.get("/api/student/my-courses")
def student_my_courses():
    user, error = require_login()
    if error:
        return error

    rows = Enrollment.query.filter_by(user_id=user.id).all()
    classes = []
    for row in rows:
        item = course_to_dict(row.course, user)
        item["grade"] = row.grade
        classes.append(item)

    return jsonify(classes)


@app.get("/api/student/classes")
def student_all_classes():
    user, error = require_login()
    if error:
        return error

    courses = Course.query.order_by(Course.name).all()
    return jsonify([course_to_dict(course, user) for course in courses])


@app.post("/api/student/classes/<int:course_id>/enroll")
def enroll_in_class(course_id):
    user, error = require_login()
    if error:
        return error

    if user.role != "student":
        return jsonify(error="Only students can add classes"), 403

    course = Course.query.get(course_id)
    if course is None:
        return jsonify(error="Class not found"), 404

    old_row = Enrollment.query.filter_by(user_id=user.id, course_id=course.id).first()
    if old_row:
        return jsonify(error="You are already in this class"), 400

    enrolled_count = Enrollment.query.filter_by(course_id=course.id).count()
    if enrolled_count >= course.capacity:
        return jsonify(error="This class is already full"), 400

    new_row = Enrollment(user_id=user.id, course_id=course.id, grade=None)
    db.session.add(new_row)
    db.session.commit()

    return jsonify(message="Class added", course=course_to_dict(course, user))


# -------------------------
# Simple teacher API, so the login is not a dead end
# -------------------------

@app.get("/api/teacher/courses")
def teacher_courses():
    user, error = require_login()
    if error:
        return error

    if user.role != "teacher":
        return jsonify(error="Teachers only"), 403

    teacher_name = user.display_name.replace("Dr ", "")
    courses = Course.query.filter(Course.teacher.contains(teacher_name)).all()
    return jsonify([course_to_dict(course) for course in courses])


# -------------------------
# Admin users CRUD
# -------------------------

@app.get("/api/admin/users")
def admin_get_users():
    admin, error = require_admin()
    if error:
        return error

    users = User.query.order_by(User.id).all()
    return jsonify([user_to_dict(user, admin) for user in users])


@app.post("/api/admin/users")
def admin_add_user():
    admin, error = require_admin()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "student").strip()
    display_name = data.get("display_name", "").strip()

    if not username or not password or not display_name:
        return jsonify(error="Username, password, and name are required"), 400

    if role not in ["student", "teacher", "admin"]:
        return jsonify(error="Role must be student, teacher, or admin"), 400

    old_user = User.query.filter_by(username=username).first()
    if old_user:
        return jsonify(error="That username already exists"), 400

    new_user = User(
        username=username,
        password_hash=make_hash(password),
        role=role,
        display_name=display_name,
    )
    db.session.add(new_user)
    db.session.commit()

    return admin_get_users()


@app.put("/api/admin/users/<int:user_id>")
def admin_edit_user(user_id):
    admin, error = require_admin()
    if error:
        return error

    user = User.query.get(user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    if "display_name" in data:
        user.display_name = data["display_name"]
    if "role" in data:
        user.role = data["role"]
    if data.get("password"):
        user.password_hash = make_hash(data["password"])

    db.session.commit()
    return admin_get_users()


@app.delete("/api/admin/users/<int:user_id>")
def admin_delete_user(user_id):
    admin, error = require_admin()
    if error:
        return error

    user = User.query.get(user_id)
    if user is None:
        return jsonify(error="User not found"), 404

    if user.id == admin.id:
        return jsonify(error="You cannot delete the account you are logged into."), 400

    Enrollment.query.filter_by(user_id=user.id).delete()
    db.session.delete(user)
    db.session.commit()

    return admin_get_users()


# -------------------------
# Admin courses CRUD
# -------------------------

@app.get("/api/admin/courses")
def admin_get_courses():
    admin, error = require_admin()
    if error:
        return error

    courses = Course.query.order_by(Course.id).all()
    return jsonify([course_to_dict(course) for course in courses])


@app.post("/api/admin/courses")
def admin_add_course():
    admin, error = require_admin()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    try:
        capacity = int(data.get("capacity", 0))
    except ValueError:
        capacity = 0

    course = Course(
        name=data.get("name", "").strip(),
        teacher=data.get("teacher", "").strip(),
        time=data.get("time", "").strip(),
        capacity=capacity,
    )

    if not course.name or not course.teacher or not course.time or course.capacity <= 0:
        return jsonify(error="Fill in all course fields"), 400

    db.session.add(course)
    db.session.commit()
    return admin_get_courses()


@app.put("/api/admin/courses/<int:course_id>")
def admin_edit_course(course_id):
    admin, error = require_admin()
    if error:
        return error

    course = Course.query.get(course_id)
    if course is None:
        return jsonify(error="Course not found"), 404

    data = request.get_json(silent=True) or {}
    course.name = data.get("name", course.name)
    course.teacher = data.get("teacher", course.teacher)
    course.time = data.get("time", course.time)

    try:
        course.capacity = int(data.get("capacity", course.capacity))
    except ValueError:
        return jsonify(error="Capacity must be a number"), 400

    db.session.commit()

    return admin_get_courses()


@app.delete("/api/admin/courses/<int:course_id>")
def admin_delete_course(course_id):
    admin, error = require_admin()
    if error:
        return error

    course = Course.query.get(course_id)
    if course is None:
        return jsonify(error="Course not found"), 404

    Enrollment.query.filter_by(course_id=course.id).delete()
    db.session.delete(course)
    db.session.commit()

    return admin_get_courses()


# -------------------------
# Admin enrollments CRUD
# -------------------------

@app.get("/api/admin/enrollments")
def admin_get_enrollments():
    admin, error = require_admin()
    if error:
        return error

    rows = Enrollment.query.order_by(Enrollment.id).all()
    return jsonify([enrollment_to_dict(row) for row in rows])


@app.post("/api/admin/enrollments")
def admin_add_enrollment():
    admin, error = require_admin()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    try:
        user_id = int(data.get("user_id"))
        course_id = int(data.get("course_id"))
    except Exception:
        return jsonify(error="Choose a student and course"), 400

    grade = data.get("grade", None)

    student = User.query.get(user_id)
    course = Course.query.get(course_id)

    if student is None or course is None:
        return jsonify(error="Student or course not found"), 404

    old = Enrollment.query.filter_by(user_id=user_id, course_id=course_id).first()
    if old:
        return jsonify(error="Student is already in this course"), 400

    count = Enrollment.query.filter_by(course_id=course_id).count()
    if count >= course.capacity:
        return jsonify(error="Course is full"), 400

    row = Enrollment(user_id=user_id, course_id=course_id, grade=grade)
    db.session.add(row)
    db.session.commit()

    return admin_get_enrollments()


@app.put("/api/admin/enrollments/<int:enrollment_id>")
def admin_edit_enrollment(enrollment_id):
    admin, error = require_admin()
    if error:
        return error

    row = Enrollment.query.get(enrollment_id)
    if row is None:
        return jsonify(error="Enrollment not found"), 404

    data = request.get_json(silent=True) or {}
    row.grade = data.get("grade", row.grade)
    db.session.commit()

    return admin_get_enrollments()


@app.delete("/api/admin/enrollments/<int:enrollment_id>")
def admin_delete_enrollment(enrollment_id):
    admin, error = require_admin()
    if error:
        return error

    row = Enrollment.query.get(enrollment_id)
    if row is None:
        return jsonify(error="Enrollment not found"), 404

    db.session.delete(row)
    db.session.commit()

    return admin_get_enrollments()


with app.app_context():
    db.create_all()
    seed_data()


if __name__ == "__main__":
    app.run(port=5001, debug=True)
