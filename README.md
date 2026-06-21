# ACME University — Lab 6 Student Enrollment

This version uses a React frontend and a Flask backend with a SQLite database.
The student and admin parts are implemented in a simple way for class.

## What is included

- Login and logout
- Student page
  - See your courses
  - See all classes offered
  - See how many students are enrolled
  - Add a class if it is not full
- Admin page
  - Create, read, update, and delete users
  - Create, read, update, and delete courses
  - Create, read, update, and delete enrollments
- SQLite database using SQLAlchemy

## Test logins

| Role | Username | Password |
|------|----------|----------|
| Student | cnorris | student123 |
| Student | mlopez | student123 |
| Admin | admin | admin123 |
| Teacher | ahepworth | teacher123 |

## First time setup

Open one terminal in the main project folder and run:

```bash
npm install
```

Then install the backend packages:

```bash
cd backend
python -m pip install -r requirements.txt
```

On Windows, you may need:

```bash
py -m pip install -r requirements.txt
```

## Running the app

You need two terminals.

### Terminal 1: backend

```bash
cd backend
python app.py
```

or on Windows:

```bash
cd backend
py app.py
```

Leave this running. It uses port 5001.

### Terminal 2: frontend

From the main project folder:

```bash
npm run dev
```

Open the link Vite gives you, usually:

```text
http://localhost:5173
```

## Database note

The database file is created automatically as:

```text
backend/school.db
```

If you want to reset the sample data, stop Flask, delete `backend/school.db`, and run `python app.py` again.
