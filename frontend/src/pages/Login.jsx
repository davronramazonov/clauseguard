import { useState } from 'react'
import axios from 'axios'

const API_URL = '/api'

export default function Login({ onLogin, onSwitch, t }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isAdmin ? '/admin/login' : '/auth/login'
      const res = await axios.post(`${API_URL}${endpoint}`, {
        username: form.username.trim(),
        password: form.password
      })
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.error || t.loginFailed || 'Kirish muvaffaqiyatsiz bo‘ldi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="modal-title">
        {isAdmin
          ? (t.adminLoginTitle || '👑 Admin kirishi')
          : (t.login || 'Kirish')}
      </h2>

      <p className="modal-subtitle">
        {isAdmin
          ? (t.adminLoginSubtitle || 'Admin panelga kirish')
          : (t.loginSubtitle || 'Hisobingizga kiring')}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn ${!isAdmin ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => {
            setIsAdmin(false)
            setError('')
          }}
        >
          {t.userLoginTab || 'Foydalanuvchi'}
        </button>

        <button
          type="button"
          className={`btn ${isAdmin ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => {
            setIsAdmin(true)
            setError('')
          }}
        >
          👑 {t.adminLoginTab || 'Admin'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            {isAdmin
              ? (t.adminUsernameLabel || 'Admin username')
              : (t.usernameLabel || 'Username')}
          </label>

          <input
            type="text"
            className="form-input"
            placeholder={isAdmin
              ? (t.adminUsernamePlaceholder || 'sharqtech')
              : (t.usernamePlaceholder || 'username')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t.passwordLabel || 'Parol'}</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading
              ? (t.loggingIn || '⏳ Kirilmoqda...')
              : `🔑 ${isAdmin ? (t.adminLoginButton || 'Admin kirish') : (t.login || 'Kirish')}`}
          </button>
        </div>
      </form>

      {!isAdmin && (
        <div className="modal-footer">
          <p>
            {t.noAccount || "Hisobingiz yo'qmi?"}{' '}
            <button
              type="button"
              onClick={onSwitch}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              {t.register || "Ro'yxatdan o'tish"}
            </button>
          </p>
        </div>
      )}
    </div>
  )
}