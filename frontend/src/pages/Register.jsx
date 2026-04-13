import { useState } from 'react'
import axios from 'axios'

const API_URL = '/api'

export default function Register({ onRegister, onSwitch, t }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        password: form.password
      }

      const res = await axios.post(`${API_URL}/auth/register`, payload)
      onRegister(res.data)
    } catch (err) {
      setError(err.response?.data?.error || t.registerFailed || "Ro'yxatdan o'tish muvaffaqiyatsiz bo‘ldi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="modal-title">{t.register || "Ro'yxatdan o'tish"}</h2>
      <p className="modal-subtitle">
        {t.registerSubtitle || 'Yangi hisob yarating'}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.firstNameLabel || 'Ism'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t.firstNamePlaceholder || 'Ism'}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.lastNameLabel || 'Familiya'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t.lastNamePlaceholder || 'Familiya'}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.usernameLabel || 'Username'}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t.usernamePlaceholder || 'username'}
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
            minLength={6}
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
              ? (t.registering || "⏳ Ro'yxatdan o'tilmoqda...")
              : `📝 ${t.register || "Ro'yxatdan o'tish"}`}
          </button>
        </div>
      </form>

      <div className="modal-footer">
        <p>
          {t.haveAccount || 'Hisobingiz bormi?'}{' '}
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
            {t.login || 'Kirish'}
          </button>
        </p>
      </div>
    </div>
  )
}