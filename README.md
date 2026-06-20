# ACME University — Student Enrollment

A React (Vite) frontend talking to a Flask backend. Right now it does
role-based login with an expiring JWT (student / teacher / admin).

You run **two things at once**: the backend (Flask, port 5001) and the
frontend (Vite, port 5173). They talk to each other, so both must be running.

---

## 1. First-time setup (do this once after cloning)

You need [Node.js](https://nodejs.org) and Python 3 installed first.

```bash
# install frontend dependencies
npm install

# install backend dependencies into a virtual environment
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..
```

What this does:
 `npm install` → downloads the React/Vite packages into `node_modules/`.
`python3 -m venv .venv` → creates an isolated Python environment in `backend/.venv/`.
 `pip install -r requirements.txt` → installs Flask + PyJWT into that environment.

You only do this once. `node_modules/` and `.venv/` are gitignored, so they
are **not** on GitHub — every person who clones runs this step themselves.

---

## 2. Running the app (every time)

Open **two terminals**.

**Terminal 1 — backend:**
```bash
cd backend
.venv/bin/python app.py
```
Wait until you see `Running on http://127.0.0.1:5001`. Leave it running.

**Terminal 2 — frontend:**
```bash
npm run dev
```
Then open the URL it prints: **http://localhost:5173**

To stop either one, press `Ctrl+C` in its terminal.

---

## 3. Logging in

| Username    | Password     | Role    |
|-------------|--------------|---------|
| `admin`     | `admin123`   | admin   |
| `stu`       | `student123` | student |
| `ahepworth` | `teacher123` | teacher |

These are development logins only. Change them and set a real `JWT_SECRET`
environment variable, before putting this anywhere public.

---

## Troubleshooting

**"Failed to execute 'json' on 'Response'" when I click Sign in**
The backend isn't running, or the frontend can't reach it. Make sure Terminal 1
(`.venv/bin/python app.py`) is running and shows port **5001**.

**Terminal shows `ECONNREFUSED` / `http proxy error`**
Same cause — the backend isn't up. Start it (Terminal 1) and try again.

**`Address already in use` on port 5001**
Something else grabbed the port. Stop it, or change the port in both
`backend/app.py` (`app.run(port=...)`) and `vite.config.js` (the proxy target).
Note: on macOS, port **5000** is used by AirPlay Receiver — that's why this app
uses 5001.

**Changed `vite.config.js` and nothing happened**
Vite only reads its config at startup. Stop `npm run dev` (`Ctrl+C`) and run it
again.
