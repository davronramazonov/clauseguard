import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
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

const languageJurisdictionMap = {
  uz: 'uzbekistan',
  ru: 'russia',
  kk: 'kazakhstan',
  tr: 'turkey',
  en: 'international',
  kg: 'kyrgyzstan',
  tg: 'tajikistan',
  az: 'azerbaijan',
  ar: 'international'
}

export default function Home({ user, t, lang }) {
  const [mode, setMode] = useState('upload')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [extractedFileName, setExtractedFileName] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const navigate = useNavigate()

  const jurisdiction = useMemo(() => {
    return languageJurisdictionMap[lang] || 'international'
  }, [lang])

  const resetTransientState = () => {
    setError('')
    setLoading(false)
    setCopySuccess(false)
  }

  const switchMode = (nextMode) => {
    resetTransientState()
    setMode(nextMode)

    if (nextMode !== 'text') setText('')
    if (nextMode !== 'url') setUrl('')
    if (nextMode !== 'extract') {
      setExtractedText('')
      setExtractedFileName('')
    }
  }

  const uploadAnalyzeFile = useCallback(async (file) => {
    if (!file) return

    if (!user) {
      setError(t.loginRequired || 'Iltimos, avval tizimga kiring')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError(t.fileTooLarge || 'Fayl hajmi 10MB dan oshmasligi kerak')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lang', lang)
      formData.append('jurisdiction', jurisdiction)

      const token = localStorage.getItem('clauseg-token')
      const res = await axios.post(`${API_URL}/analyze/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })

      navigate(`/result/${res.data.id || 'upload'}`)
    } catch (err) {
      setError(err.response?.data?.error || t.uploadError || 'Faylni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [user, lang, jurisdiction, navigate, t])

  const extractTextFromFile = useCallback(async (file) => {
    if (!file) return

    if (!user) {
      setError(t.loginRequired || 'Iltimos, avval tizimga kiring')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError(t.fileTooLarge || 'Fayl hajmi 10MB dan oshmasligi kerak')
      return
    }

    setLoading(true)
    setError('')
    setExtractedText('')
    setExtractedFileName('')
    setCopySuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('clauseg-token')
      const res = await axios.post(`${API_URL}/extract-text/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })

      setExtractedText(res.data.extractedText || '')
      setExtractedFileName(res.data.fileName || file.name || '')
    } catch (err) {
      setError(err.response?.data?.error || t.extractTextError || 'Fayldan matn ajratib bo‘lmadi')
    } finally {
      setLoading(false)
    }
  }, [user, t])

  const onDropAnalyze = useCallback(async (files) => {
    const file = files[0]
    await uploadAnalyzeFile(file)
  }, [uploadAnalyzeFile])

  const onDropExtract = useCallback(async (files) => {
    const file = files[0]
    await extractTextFromFile(file)
  }, [extractTextFromFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: mode === 'extract' ? onDropExtract : onDropAnalyze,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  })

  const analyzeText = async () => {
    if (!text.trim()) {
      setError(t.enterText || 'Matn kiriting')
      return
    }

    if (!user) {
      setError(t.loginRequired || 'Iltimos, avval tizimga kiring')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('clauseg-token')
      const res = await axios.post(
        `${API_URL}/analyze`,
        {
          text,
          type: 'text',
          lang,
          jurisdiction
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      navigate(`/result/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || t.analyzeError || 'Tahlil xatosi')
    } finally {
      setLoading(false)
    }
  }

  const analyzeUrl = async () => {
    if (!url.trim()) {
      setError(t.enterUrl || 'URL kiriting')
      return
    }

    if (!user) {
      setError(t.loginRequired || 'Iltimos, avval tizimga kiring')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('clauseg-token')
      const res = await axios.post(
        `${API_URL}/analyze`,
        {
          url,
          type: 'url',
          lang,
          jurisdiction
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      navigate(`/result/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || t.analyzeError || 'Tahlil xatosi')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyExtractedText = async () => {
    if (!extractedText) return

    try {
      await navigator.clipboard.writeText(extractedText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      setError(t.copyFailed || 'Matnni nusxalab bo‘lmadi')
    }
  }

  return (
    <motion.div
      className="hero"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1 className="hero-title" variants={itemVariants}>
        {t.heroTitle || 'Hujjatlaringizni AI bilan tekshiring'}
      </motion.h1>

      <motion.p className="hero-subtitle" variants={itemVariants}>
        {t.heroSubtitle || 'Xavfli bandlarni aniqlang va himoyalaning'}
      </motion.p>

      <motion.div className="upload-tabs" variants={itemVariants}>
        <button
          className={`upload-tab ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => switchMode('upload')}
        >
          📄 {t.fileMode || 'Fayl'}
        </button>

        <button
          className={`upload-tab ${mode === 'text' ? 'active' : ''}`}
          onClick={() => switchMode('text')}
        >
          ✍️ {t.textMode || 'Matn'}
        </button>

        <button
          className={`upload-tab ${mode === 'url' ? 'active' : ''}`}
          onClick={() => switchMode('url')}
        >
          🔗 {t.urlMode || 'URL'}
        </button>

        <button
          className={`upload-tab ${mode === 'extract' ? 'active' : ''}`}
          onClick={() => switchMode('extract')}
        >
          📝 {t.extractTextMode || 'Matn chiqarish'}
        </button>
      </motion.div>

      <motion.p
        variants={itemVariants}
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          marginBottom: '1rem'
        }}
      >
        {t.currentJurisdictionLabel || 'Huquqiy hudud'}: <strong>{jurisdiction}</strong>
      </motion.p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            color: 'var(--danger)'
          }}
        >
          {error}
        </motion.div>
      )}

      {(mode === 'upload' || mode === 'extract') && (
        <motion.div variants={itemVariants}>
          <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-over' : ''}`}>
            <input {...getInputProps()} />
            <div className="upload-icon">{mode === 'extract' ? '📝' : '📄'}</div>
            <p className="upload-text">
              {mode === 'extract'
                ? (t.extractTextUploadText || 'Matnini chiqarish uchun faylni shu yerga olib keling yoki tanlang')
                : (t.uploadText || 'Hujjatni shu yerga olib keling yoki tanlang')}
            </p>
            <p className="upload-hint">
              {t.uploadHint || 'PDF, DOC, DOCX, TXT, JPG, PNG (10MB gacha)'}
            </p>
          </div>

          <p style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)' }}>
            {t.or || 'yoki'}
          </p>

          <label
            className="btn btn-primary"
            style={{ display: 'block', width: 'fit-content', margin: '0 auto', cursor: 'pointer' }}
          >
            {mode === 'extract'
              ? `📂 ${t.extractTextButton || 'Fayldan matn chiqarish'}`
              : `📂 ${t.chooseFile || 'Fayl tanlash'}`}
            <input
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (mode === 'extract') {
                  extractTextFromFile(file)
                } else {
                  uploadAnalyzeFile(file)
                }
              }}
            />
          </label>

          {mode === 'extract' && extractedText && (
            <motion.div
              variants={itemVariants}
              style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem'
                }}
              >
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>
                    {t.extractedTextTitle || 'Ajratilgan matn'}
                  </h3>
                  {extractedFileName && (
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                      {extractedFileName}
                    </p>
                  )}
                </div>

                <button className="btn btn-secondary" onClick={handleCopyExtractedText}>
                  {copySuccess
                    ? (t.copiedText || '✅ Nusxalandi')
                    : (t.copyText || '📋 Nusxalash')}
                </button>
              </div>

              <textarea
                readOnly
                value={extractedText}
                className="text-input"
                style={{ minHeight: '320px' }}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {mode === 'text' && (
        <motion.div className="text-input-area" variants={itemVariants}>
          <textarea
            className="text-input"
            placeholder={t.textPlaceholder || "Hujjat matnini shu yerda yozing yoki nusxa ko'chiring..."}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
          />

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => switchMode('upload')}>
              ← {t.back || 'Orqaga'}
            </button>

            <button
              className="btn btn-primary"
              onClick={analyzeText}
              disabled={loading || !text.trim()}
            >
              {loading ? (t.analyzing || '⏳ Tahlil qilinmoqda...') : `🚀 ${t.analyze || 'Tahlil qilish'}`}
            </button>
          </div>
        </motion.div>
      )}

      {mode === 'url' && (
        <motion.div className="text-input-area" variants={itemVariants}>
          <input
            className="url-input"
            placeholder="https://example.com/document"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
          />

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            {t.urlPremiumHint || '⚠️ Link tahlili faqat Premium foydalanuvchilar uchun'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => switchMode('upload')}>
              ← {t.back || 'Orqaga'}
            </button>

            <button
              className="btn btn-primary"
              onClick={analyzeUrl}
              disabled={loading || !url.trim()}
            >
              {loading ? (t.analyzing || '⏳ Tahlil qilinmoqda...') : `🚀 ${t.analyze || 'Tahlil qilish'}`}
            </button>
          </div>
        </motion.div>
      )}

      {loading && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="loading-spinner"></div>
          <p className="loading-text">
            {mode === 'extract'
              ? (t.extractingText || 'Matn ajratilmoqda...')
              : (t.aiAnalyzing || 'AI tahlil qilinmoqda...')}
          </p>
          <p className="loading-subtext">
            {mode === 'extract'
              ? (t.pleaseWaitExtract || 'Fayldagi matn tayyorlanmoqda')
              : (t.pleaseWaitAnalyze || 'Hujjatingizni tahlil qilish uchun kuting')}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}