import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

const API_URL = '/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Profile({ user, t }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgMessage, setOrgMessage] = useState('')
  const navigate = useNavigate()

  const loadProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/users/profile`)
      setProfile(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || t.profileLoadError || 'Profilni yuklab bo‘lmadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    loadProfile()
  }, [user, navigate])

  const applyOrganizationCode = async (e) => {
    e.preventDefault()
    setOrgMessage('')

    if (!orgCode.trim()) {
      setOrgMessage(t.enterOrganizationCode || 'Tashkilot kodini kiriting')
      return
    }

    try {
      setOrgLoading(true)

      const res = await axios.post(`${API_URL}/organization/apply`, {
        code: orgCode.trim()
      })

      setOrgMessage(
        `${t.organizationCodeApplied || '✅ Tashkilot kodi muvaffaqiyatli faollashdi'}${
          res.data?.organizationName ? `: ${res.data.organizationName}` : ''
        }`
      )

      setOrgCode('')
      await loadProfile()
    } catch (err) {
      setOrgMessage(
        err.response?.data?.error ||
          t.organizationCodeFailed ||
          'Tashkilot kodini faollashtirib bo‘lmadi'
      )
    } finally {
      setOrgLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        className="profile-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <Link to="/" className="btn btn-primary">
            ← {t.backHome || 'Bosh sahifaga'}
          </Link>
        </div>
      </motion.div>
    )
  }

  if (!profile) {
    return (
      <motion.div
        className="profile-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '1rem' }}>{t.profileNotFound || 'Profil topilmadi'}</p>
          <Link to="/" className="btn btn-primary">
            ← {t.backHome || 'Bosh sahifaga'}
          </Link>
        </div>
      </motion.div>
    )
  }

  const isPremium =
    profile.isPremium &&
    profile.premiumExpiresAt &&
    new Date(profile.premiumExpiresAt) > new Date()

  const isBusiness = profile.role === 'business'
  const hasUnlimited = isPremium || isBusiness
  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.trim() || 'U'

  return (
    <motion.div
      className="profile-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="profile-card" variants={itemVariants}>
        <motion.div className="profile-header" variants={itemVariants}>
          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-info">
            <h2>{profile.firstName} {profile.lastName}</h2>
            <p>@{profile.username}</p>
          </div>
        </motion.div>

        <motion.div className="stats-grid" variants={itemVariants}>
          <div className="stat-item">
            <div className="stat-value">{profile.usageCount || 0}</div>
            <div className="stat-label">📊 {t.totalAnalysesLabel || 'Jami tahlillar'}</div>
          </div>

          <div className="stat-item">
            <div className="stat-value">
              {hasUnlimited ? (t.unlimited || 'Unlimited') : `${profile.monthlyUsage || 0}/5`}
            </div>
            <div className="stat-label">📅 {t.thisMonthLabel || 'Bu oy'}</div>
          </div>

          <div className="stat-item">
            <div
              className="stat-value"
              style={{
                color: hasUnlimited ? 'var(--success)' : 'var(--text-secondary)'
              }}
            >
              {isBusiness
                ? `🏢 ${t.businessPlan || 'Business'}`
                : isPremium
                  ? `💎 ${t.premium_plan || 'Premium'}`
                  : (t.free || 'Free')}
            </div>
            <div className="stat-label">💰 {t.planLabel || 'Tarif'}</div>
          </div>

          <div className="stat-item">
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>
              {profile.role}
            </div>
            <div className="stat-label">👤 {t.roleLabel || 'Rol'}</div>
          </div>
        </motion.div>

        {isPremium && profile.premiumExpiresAt && (
          <motion.div className="premium-banner" variants={itemVariants}>
            <h4>🎉 {t.premiumActive || 'Premium faol'}</h4>
            <p>
              {(t.validUntil || 'Amal qiladi')}: {new Date(profile.premiumExpiresAt).toLocaleDateString()}
            </p>
          </motion.div>
        )}

        {isBusiness && profile.businessId && (
          <motion.div
            className="premium-banner"
            variants={itemVariants}
            style={{ borderColor: 'var(--accent)' }}
          >
            <h4>🏢 {t.businessPlan || 'Business access faol'}</h4>
            <p>{t.organizationLinked || 'Tashkilotga ulangan account'}</p>
            <p style={{ marginTop: '0.35rem' }}>ID: {profile.businessId}</p>
          </motion.div>
        )}

        {!hasUnlimited && (
          <motion.div style={{ textAlign: 'center', marginTop: '1.5rem' }} variants={itemVariants}>
            <Link to="/pricing" className="btn btn-primary">
              💎 {t.getPremium || 'Premium olish'} →
            </Link>
          </motion.div>
        )}

        {!hasUnlimited && (
          <motion.div
            variants={itemVariants}
            style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '16px',
              border: '1px solid var(--border)'
            }}
          >
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>
              🏢 {t.organizationCodeTitle || 'Tashkilot kodi'}
            </h3>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
              {t.organizationCodeHint || 'Agar sizga firma yoki davlat tashkiloti maxsus kod bergan bo‘lsa, shu yerga kiriting.'}
            </p>

            <form onSubmit={applyOrganizationCode}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t.organizationCodePlaceholder || 'Masalan: ORG-123456'}
                  value={orgCode}
                  onChange={(e) => {
                    setOrgCode(e.target.value)
                    setOrgMessage('')
                  }}
                  style={{ flex: '1', minWidth: '220px' }}
                />

                <button type="submit" className="btn btn-primary" disabled={orgLoading}>
                  {orgLoading
                    ? (t.activating || '⏳ Faollashtirilmoqda...')
                    : (t.activateOrganizationCode || 'Faollashtirish')}
                </button>
              </div>
            </form>

            {orgMessage && (
              <p
                style={{
                  marginTop: '1rem',
                  color: orgMessage.startsWith('✅') ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.92rem'
                }}
              >
                {orgMessage}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
            ℹ️ {t.aboutUsTitle || 'Biz haqimizda'}
          </h3>

          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontSize: '0.9375rem'
            }}
          >
            {t.aboutUsText || "Clauseg.ai — bu sun'iy intellekt yordamida hujjatlarni tahlil qiluvchi platforma. Xavfli bandlarni va huquqiy xatarlarni aniqlashga yordam beradi."}
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="https://t.me/SharqTech"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ flex: '1', justifyContent: 'center', minWidth: '140px' }}
            >
              📱 Telegram
            </a>

            <a
              href="https://www.instagram.com/sharqtech.uz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ flex: '1', justifyContent: 'center', minWidth: '140px' }}
            >
              📸 Instagram
            </a>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}