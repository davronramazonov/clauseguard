import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = '/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Pricing({ user, t }) {
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const applyPromo = async (e) => {
    e.preventDefault()

    if (!promoCode.trim()) {
      setPromoError(t.enterPromoCode || 'Promo kodni kiriting')
      return
    }

    setLoading(true)
    setPromoError('')
    setPromoSuccess(false)

    try {
      const token = localStorage.getItem('clauseg-token')

      await axios.post(
        `${API_URL}/promo/apply`,
        { code: promoCode.trim() },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      )

      setPromoSuccess(true)
      setPromoCode('')
    } catch (err) {
      setPromoError(err.response?.data?.error || t.genericError || 'Xatolik')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="pricing-section"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 className="pricing-title" variants={itemVariants}>
        💎 {t.pricing || 'Narxlar'}
      </motion.h2>

      <motion.p className="pricing-subtitle" variants={itemVariants}>
        {t.pricingSubtitle || 'O‘zingizga mos tarifni tanlang va hujjatlaringizni ishonch bilan tekshiring'}
      </motion.p>

      <div className="pricing-grid">
        <motion.div className="pricing-card" variants={itemVariants}>
          <h3 className="pricing-plan">{t.free || 'Bepul'}</h3>
          <div className="pricing-price">
            $0<span>{t.monthly || 'oylik'}</span>
          </div>

          <ul className="pricing-features">
            <li>{t.freeFeature1 || '5 ta tahlil / oy'}</li>
            <li>{t.freeFeature2 || 'Asosiy hujjat tahlili'}</li>
            <li>{t.freeFeature3 || 'Xavf darajalari'}</li>
            <li>{t.freeFeature4 || 'Qisqa xulosa va tavsiyalar'}</li>
          </ul>

          <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
            {t.startNow || 'Boshlash'}
          </Link>
        </motion.div>

        <motion.div className="pricing-card popular" variants={itemVariants}>
          <span className="popular-badge">{t.popular || '⭐ Mashhur'}</span>

          <h3 className="pricing-plan">{t.premium_plan || 'Premium'}</h3>
          <div className="pricing-price">
            $2.5<span>{t.monthly || 'oylik'}</span>
          </div>

          <ul className="pricing-features">
            <li>{t.premiumFeature1 || '🚀 Cheksiz tahlil'}</li>
            <li>{t.premiumFeature2 || '📄 Ko‘proq fayl formatlari'}</li>
            <li>{t.premiumFeature3 || '🔗 URL / oferta tahlili'}</li>
            <li>{t.premiumFeature4 || '⚖️ Huquqiy asoslar'}</li>
            <li>{t.premiumFeature5 || '💡 AI tavsiyalar'}</li>
            <li>{t.premiumFeature6 || '🎯 Tezkor qo‘llab-quvvatlash'}</li>
          </ul>

          <a
            href="https://t.me/sharqtech_tolov"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            👉 {t.getPremium || 'Premium olish'}
          </a>
        </motion.div>

        <motion.div className="pricing-card" variants={itemVariants}>
          <h3 className="pricing-plan">🏢 {t.businessPlan || 'Business'}</h3>
          <div className="pricing-price">
            $999<span>{t.yearly || 'yillik'}</span>
          </div>

          <ul className="pricing-features">
            <li>{t.businessFeature1 || '🚀 Cheksiz tahlil'}</li>
            <li>{t.businessFeature2 || '🏷️ Kompaniya identifikatori'}</li>
            <li>{t.businessFeature3 || '⚙️ Admin boshqaruvi'}</li>
            <li>{t.businessFeature4 || '👥 Jamoa bilan ishlash'}</li>
            <li>{t.businessFeature5 || '🔒 Kuchliroq xavfsizlik'}</li>
            <li>{t.businessFeature6 || '💼 Biznes qo‘llab-quvvatlash'}</li>
          </ul>

          <a
            href="https://t.me/sharqtech_tolov"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            📞 {t.contactUs || "Bog'lanish"}
          </a>
        </motion.div>
      </div>

      {user && (
        <motion.div
          style={{ marginTop: '2rem', textAlign: 'center' }}
          variants={itemVariants}
        >
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {t.havePromo || '🎫 Promo kod bormi?'}
          </p>

          <form
            onSubmit={applyPromo}
            style={{
              display: 'inline-flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <input
              type="text"
              placeholder={t.promoPlaceholder || 'PROMO123'}
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value)
                setPromoError('')
                setPromoSuccess(false)
              }}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--secondary-bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                width: '220px'
              }}
            />

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? (t.activating || '⏳ Faollashtirilmoqda...')
                : (t.activatePromo || '✅ Faollashtirish')}
            </button>
          </form>

          {promoError && (
            <p className="error-text mt-1">{promoError}</p>
          )}

          {promoSuccess && (
            <p className="text-success mt-1">
              {t.promoActivated || '✓ Premium muvaffaqiyatli faollashdi!'}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}