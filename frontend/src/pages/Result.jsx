import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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

function getRiskLevelLabel(level, t) {
  if (level === 'high') return t.riskHigh || '🔴 Yuqori'
  if (level === 'medium') return t.riskMedium || '🟡 O‘rtacha'
  return t.riskLow || '🟢 Past'
}

function getConfidenceLabel(confidence, t) {
  if (confidence === 'high') return t.confidenceHigh || 'Yuqori'
  if (confidence === 'medium') return t.confidenceMedium || 'O‘rtacha'
  return t.confidenceLow || 'Past'
}

function normalizeLaw(law) {
  if (typeof law === 'string') {
    return {
      title: law,
      article: '',
      reason: ''
    }
  }

  if (law && typeof law === 'object') {
    return {
      title: law.title || law.name || '',
      article: law.article || law.articleNumber || '',
      reason: law.reason || law.explanation || ''
    }
  }

  return null
}

export default function Result({ t, lang }) {
  const { id } = useParams()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const token = localStorage.getItem('clauseg-token')
        const res = await axios.get(`${API_URL}/analyze/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setAnalysis(res.data)
      } catch (err) {
        console.error(err)
        setError(err.response?.data?.error || t.resultLoadError || 'Natijani yuklab bo‘lmadi')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchResult()
    }
  }, [id, t])

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
        className="results-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{error}</p>
          <Link to="/" className="btn btn-primary">
            ← {t.backHome || 'Bosh sahifaga'}
          </Link>
        </div>
      </motion.div>
    )
  }

  if (!analysis || !analysis.result) {
    return (
      <motion.div
        className="results-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            {t.resultNotFound || 'Natija topilmadi'}
          </p>
          <Link to="/" className="btn btn-primary">
            ← {t.backHome || 'Bosh sahifaga'}
          </Link>
        </div>
      </motion.div>
    )
  }

  const { result } = analysis
  const normalizedLaws = Array.isArray(result.laws)
    ? result.laws.map(normalizeLaw).filter(Boolean)
    : []

  return (
    <motion.div
      className="results-section"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="result-header" variants={itemVariants}>
        <h2 className="result-title">{t.analysisResult || 'Tahlil natijasi'}</h2>
        <span className={`status-badge ${result.hasRisks ? 'danger' : 'safe'}`}>
          {result.hasRisks
            ? (t.riskDetected || '⚠️ Xavf bor')
            : (t.safeResult || '✅ Xavfsiz')}
        </span>
      </motion.div>

      <motion.div className="summary-card" variants={itemVariants}>
        <h3>{t.summaryTitle || '📋 Xulosa'}</h3>
        <p>{result.summary}</p>
      </motion.div>

      <motion.div className="summary-card" variants={itemVariants}>
        <h3>{t.jurisdictionInfoTitle || '🌍 Tahlil konteksti'}</h3>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <strong>{t.languageLabel || 'Til'}:</strong>{' '}
            {result.languageLabel || lang || 'Unknown'}
          </div>

          <div>
            <strong>{t.currentJurisdictionLabel || 'Huquqiy hudud'}:</strong>{' '}
            {result.jurisdictionLabel || result.jurisdiction || 'International'}
          </div>

          <div>
            <strong>{t.confidenceLabel || 'Aniqlik'}:</strong>{' '}
            {getConfidenceLabel(result.jurisdictionConfidence, t)}
          </div>

          {result.suggestedJurisdiction && (
            <div
              style={{
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                borderRadius: '12px',
                padding: '0.9rem'
              }}
            >
              <strong>{t.suggestedJurisdictionLabel || 'Hujjatdan sezilgan hudud'}:</strong>{' '}
              {result.suggestedJurisdictionLabel || result.suggestedJurisdiction}
            </div>
          )}
        </div>
      </motion.div>

      {result.risks && result.risks.length > 0 && (
        <motion.div className="risks-section" variants={itemVariants}>
          <h3 className="section-title">
            {t.risksTitle || '⚠️ Xavflar'} ({result.risks.length})
          </h3>

          <div className="risks-list">
            {result.risks.map((risk, index) => (
              <motion.div
                key={index}
                className={`risk-card ${risk.level || 'low'}`}
                variants={itemVariants}
              >
                <div className="risk-header">
                  <span className={`risk-level ${risk.level || 'low'}`}>
                    {getRiskLevelLabel(risk.level, t)}
                  </span>
                </div>

                {risk.clause && (
                  <p className="risk-clause">{risk.clause}</p>
                )}

                {risk.explanation && (
                  <p className="risk-explanation">{risk.explanation}</p>
                )}

                {risk.recommendation && (
                  <p className="risk-recommendation">
                    <strong>💡 {t.shortActionLabel || 'Qisqa tavsiya'}:</strong> {risk.recommendation}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {normalizedLaws.length > 0 && (
        <motion.div className="laws-section" variants={itemVariants}>
          <h3 className="section-title">
            {t.legalReferencesTitle || '⚖️ Huquqiy asoslar'}
          </h3>

          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {normalizedLaws.map((law, index) => (
              <div
                key={index}
                className="law-item"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '1rem'
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: law.article ? '0.5rem' : '0.35rem' }}>
                  {law.title}
                </div>

                {law.article && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.35rem 0.7rem',
                      borderRadius: '999px',
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                      fontSize: '0.85rem',
                      marginBottom: '0.6rem'
                    }}
                  >
                    {t.articleLabel || 'Modda'}: {law.article}
                  </div>
                )}

                {law.reason && (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {law.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {result.recommendations && result.recommendations.length > 0 && (
        <motion.div className="recommendations-section" variants={itemVariants}>
          <h3 className="section-title">
            {t.recommendationsTitle || '💡 Tavsiyalar'}
          </h3>

          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {result.recommendations.map((rec, index) => (
              <div
                key={index}
                className="recommendation-item"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem'
                }}
              >
                <span style={{ flexShrink: 0 }}>✓</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {result.jurisdictionSignals && result.jurisdictionSignals.length > 0 && (
        <motion.div className="summary-card" variants={itemVariants}>
          <h3>{t.detectedSignalsTitle || '🔎 Aniqlangan signallar'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t.detectedSignalsHint || 'Bu bo‘lim hujjatdan qaysi yurisdiksiya alomatlari topilganini ko‘rsatadi.'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {result.jurisdictionSignals.slice(0, 8).map((signal, index) => (
              <span
                key={index}
                style={{
                  padding: '0.45rem 0.7rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.85rem'
                }}
              >
                {signal.jurisdiction}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div style={{ marginTop: '2rem', textAlign: 'center' }} variants={itemVariants}>
        <Link to="/" className="btn btn-primary">
          ← {t.newAnalysis || 'Yangi tahlil'}
        </Link>
      </motion.div>
    </motion.div>
  )
}