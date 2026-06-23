import React from 'react'

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
        <p>Teacher: ahepworth / teacher123</p>
        <p>Admin: admin / admin123</p>
      </div>
    </form>
  )
}
