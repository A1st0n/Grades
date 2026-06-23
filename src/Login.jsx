import React from 'react'

function decode(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = React.useState(() => localStorage.getItem('token'))
  const user = token ? decode(token) : null

  function login(newToken) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (token && !user) {
    localStorage.removeItem('token')
  }

  return { user, token, login, logout }
}

export function Login({ onLogin }) {
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  function submit(e) {
    e.preventDefault()
    setError('')

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(result => {
        if (!result.ok) {
          setError(result.data.error || 'Login failed')
        } else {
          onLogin(result.data.token)
        }
      })
      .catch(() => setError('Could not reach server'))
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <h1>ACME University</h1>
      <label>
        Username
        <input value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button>Sign in</button>
      <div className="login-help">
        <p>Student: cnorris / student123</p>
        <p>Admin: admin / admin123</p>
      </div>
    </form>
  )
}
