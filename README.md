# Course Enrollment System

A full-stack web application for managing university course enrollment, with
role-based access for students, teachers, and admins. Built to demonstrate
end-to-end full-stack development: authentication, a REST API, relational data
modeling, and a component-based UI.

## Tech Stack

**Frontend:** React 19, Vite
**Backend:** Flask, SQLAlchemy ORM, JWT auth
**Database:** SQLite
**Infra:** Docker (multi-stage build)

## Features

- **JWT authentication** with role-based access control (student / teacher / admin)
  and hashed passwords.
- **REST API** using proper HTTP verbs and status codes, guarding every endpoint
  by role.
- **Students** browse offered courses, see live enrollment counts, and add/drop
  classes (with capacity enforcement).
- **Teachers** view their rosters and edit student grades (validated 0–100).
- **Admins** get full CRUD over users, courses, and enrollments.

## Architecture

React SPA (Vite dev server) → proxied `/api` → Flask REST backend → SQLAlchemy → SQLite.
Auth is a JWT issued on login, sent as a Bearer token and verified per request.

## Running locally

Requires Node and Python 3.

**Backend** (terminal 1):
\`\`\`bash
cd backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
./venv/bin/python app.py        # http://localhost:5001
\`\`\`

**Frontend** (terminal 2):
\`\`\`bash
npm install
npm run dev                     # http://localhost:5173
\`\`\`

### Demo logins

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Teacher | ahepworth | teacher123 |
| Student | cnorris | student123 |

## Possible next steps

Refresh tokens, Postgres for production, pytest API coverage, and an nginx `/api`
proxy in the Docker image so the containerized build talks to the backend.
