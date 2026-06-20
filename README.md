# ACME University — Student Enrollment

React (Vite) frontend + Flask backend. Currently: role-based login with an
expiring JWT (student / teacher / admin).

## Setup (once per clone)

```bash
# frontend deps
npm install

# backend deps
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..
```

## Run (two terminals)

```bash
# terminal 1 — backend (http://localhost:5001)
cd backend && .venv/bin/python app.py

# terminal 2 — frontend (http://localhost:5173)
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to Flask on 5001.

## Logins

| Username    | Password    | Role    |
|-------------|-------------|---------|
| `admin`     | `admin123`  | admin   |
| `stu`       | `student123`| student |
| `ahepworth` | `teacher123`| teacher |

Dev seeds only — change them, and set `JWT_SECRET`, before deploying.
