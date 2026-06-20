import React from 'react'

// Decodes a JWT payload (no verify, server signs, this just reads exp/role).
// ponytail: client-side read only; the server re-verifies the signature.
function decode(token) {
    try {
        const p = JSON.parse(atob(token.split('.')[1]));
        if (p.exp * 1000 < Date.now()) return null; // expired
        return p;
    } catch {
        return null;
    }
}

// Returns the logged-in user {sub, role} or null. Also clears expired tokens.
export function useAuth() {
    const [token, setToken] = React.useState(() => localStorage.getItem('token'));
    const user = token && decode(token);
    if (token && !user) localStorage.removeItem('token'); // expired

    const login = (t) => { localStorage.setItem('token', t); setToken(t); };
    const logout = () => { localStorage.removeItem('token'); setToken(null); };
    return { user: user || null, login, logout };
}

export function Login({ onLogin }) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [err, setErr] = React.useState('');

    function submit(e) {
        e.preventDefault();
        setErr('');
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        })
            .then(async (r) => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || 'Login failed');
                onLogin(data.token);
            })
            .catch((e) => setErr(e.message));
    }

    return (
        <form className="login-card" onSubmit={submit}>
            <h1>ACME University</h1>
            <label>Username
                <input type="text" value={username} autoFocus
                    onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>Password
                <input type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} />
            </label>
            {err && <div className="login-err">{err}</div>}
            <button type="submit">Sign in</button>
        </form>
    );
}
