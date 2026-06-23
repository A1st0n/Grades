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
