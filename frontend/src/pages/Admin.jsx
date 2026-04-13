import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

const API_URL = '/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 }
}

const initialPromoForm = {
  code: '',
  duration: 30,
  usageLimit: 1,
  expiresAt: ''
}

const initialOrgForm = {
  code: '',
  organizationName: '',
  planType: 'business',
  seatLimit: 10,
  duration: 30,
  expiresAt: ''
}

function StatCard({ title, value, icon }) {
  return (
    <motion.div className="admin-stat-card" variants={itemVariants}>
      <div className="admin-stat-top">
        <span className="admin-stat-icon">{icon}</span>
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{title}</div>
    </motion.div>
  )
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="admin-section-header">
      <div>
        <h2 className="admin-section-title">{title}</h2>
        {subtitle && <p className="admin-section-subtitle">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState('stats')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [promoCodes, setPromoCodes] = useState([])
  const [organizationCodes, setOrganizationCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [promoForm, setPromoForm] = useState(initialPromoForm)
  const [orgForm, setOrgForm] = useState(initialOrgForm)
  const [promoMessage, setPromoMessage] = useState('')
  const [orgMessage, setOrgMessage] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }

    fetchData()
  }, [user, navigate])

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('clauseg-token')
    return { Authorization: `Bearer ${token}` }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setPageError('')

      const requests = [
        axios.get(`${API_URL}/admin/stats`, { headers: authHeaders }),
        axios.get(`${API_URL}/admin/users`, { headers: authHeaders }),
        axios.get(`${API_URL}/admin/promo`, { headers: authHeaders })
      ]

      const results = await Promise.allSettled(requests)

      const statsRes = results[0]
      const usersRes = results[1]
      const promoRes = results[2]

      setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null)
      setUsers(usersRes.status === 'fulfilled' ? (usersRes.value.data.users || []) : [])
      setPromoCodes(promoRes.status === 'fulfilled' ? (promoRes.value.data || []) : [])

      try {
        const orgRes = await axios.get(`${API_URL}/admin/organization-codes`, { headers: authHeaders })
        setOrganizationCodes(orgRes.data || [])
      } catch {
        setOrganizationCodes([])
      }
    } catch (err) {
      console.error(err)
      setPageError('Admin ma’lumotlarini yuklab bo‘lmadi')
    } finally {
      setLoading(false)
    }
  }

  const togglePremium = async (userId, enable, isBusiness = false) => {
    const text = enable
      ? (isBusiness ? 'Foydalanuvchiga Business berilsinmi?' : 'Foydalanuvchiga Premium berilsinmi?')
      : 'Obuna olib tashlansinmi?'

    if (!window.confirm(text)) return

    try {
      setActionLoading(true)

      await axios.post(
        `${API_URL}/admin/users/${userId}/premium`,
        {
          duration: enable ? 30 : 0,
          isBusiness
        },
        { headers: authHeaders }
      )

      await fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Amal bajarilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleBlock = async (userId, block) => {
    const text = block
      ? 'Foydalanuvchi bloklansinmi?'
      : 'Foydalanuvchi blokdan chiqarilsinmi?'

    if (!window.confirm(text)) return

    try {
      setActionLoading(true)

      await axios.post(
        `${API_URL}/admin/users/${userId}/${block ? 'block' : 'unblock'}`,
        {},
        { headers: authHeaders }
      )

      await fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Amal bajarilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  const createPromoCode = async (e) => {
    e.preventDefault()
    setPromoMessage('')

    try {
      setActionLoading(true)

      let code = promoForm.code.trim().toUpperCase()
      if (!code) {
        code = `PROMO-${Date.now().toString().slice(-6)}`
      }

      await axios.post(
        `${API_URL}/admin/promo`,
        {
          code,
          duration: Number(promoForm.duration),
          usageLimit: Number(promoForm.usageLimit),
          expiresAt: promoForm.expiresAt
        },
        { headers: authHeaders }
      )

      setPromoMessage(`✅ Promo kod yaratildi: ${code}`)
      setPromoForm(initialPromoForm)
      await fetchData()
    } catch (err) {
      setPromoMessage(err.response?.data?.error || 'Promo kod yaratilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  const deletePromoCode = async (code) => {
    if (!window.confirm(`Promo kod o‘chirilsinmi: ${code}?`)) return

    try {
      setActionLoading(true)
      await axios.delete(`${API_URL}/admin/promo/${code}`, { headers: authHeaders })
      await fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Promo kod o‘chirilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  const createOrganizationCode = async (e) => {
    e.preventDefault()
    setOrgMessage('')

    try {
      setActionLoading(true)

      let code = orgForm.code.trim().toUpperCase()
      if (!code) {
        code = `ORG-${Date.now().toString().slice(-6)}`
      }

      await axios.post(
        `${API_URL}/admin/organization-codes`,
        {
          code,
          organizationName: orgForm.organizationName.trim(),
          planType: orgForm.planType,
          seatLimit: Number(orgForm.seatLimit),
          duration: Number(orgForm.duration),
          expiresAt: orgForm.expiresAt
        },
        { headers: authHeaders }
      )

      setOrgMessage(`✅ Tashkilot kodi yaratildi: ${code}`)
      setOrgForm(initialOrgForm)
      await fetchData()
    } catch (err) {
      setOrgMessage(err.response?.data?.error || 'Tashkilot kodi yaratilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteOrganizationCode = async (code) => {
    if (!window.confirm(`Tashkilot kodi o‘chirilsinmi: ${code}?`)) return

    try {
      setActionLoading(true)
      await axios.delete(`${API_URL}/admin/organization-codes/${code}`, { headers: authHeaders })
      await fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Tashkilot kodi o‘chirilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (pageError && !stats) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>{pageError}</p>
        <Link to="/" className="btn btn-primary">← Bosh sahifa</Link>
      </div>
    )
  }

  return (
    <motion.div
      className="admin-shell"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-brand">⚙️ Admin panel</div>
          <div className="admin-brand-sub">Clauseg.ai boshqaruv markazi</div>
        </div>

        <nav className="admin-sidebar-nav">
          <button
            className={`admin-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <span>📊</span>
            <span>Statistika</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span>👥</span>
            <span>Foydalanuvchilar</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === 'promo' ? 'active' : ''}`}
            onClick={() => setActiveTab('promo')}
          >
            <span>🎫</span>
            <span>Promo kodlar</span>
          </button>

          <button
            className={`admin-nav-btn ${activeTab === 'org' ? 'active' : ''}`}
            onClick={() => setActiveTab('org')}
          >
            <span>🏢</span>
            <span>Tashkilot kodlari</span>
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <Link to="/" className="admin-back-link">← Asosiy sahifa</Link>
        </div>
      </aside>

      <main className="admin-main">
        {activeTab === 'stats' && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Statistika"
              subtitle="Tizim bo‘yicha asosiy ko‘rsatkichlar"
            />

            <div className="admin-stats-grid">
              <StatCard title="Jami foydalanuvchilar" value={stats?.totalUsers || 0} icon="👤" />
              <StatCard title="Premium foydalanuvchilar" value={stats?.premiumUsers || 0} icon="💎" />
              <StatCard title="Business foydalanuvchilar" value={stats?.businessUsers || 0} icon="🏢" />
              <StatCard title="Bloklanganlar" value={stats?.blockedUsers || 0} icon="⛔" />
              <StatCard title="Jami tahlillar" value={stats?.totalAnalyses || 0} icon="📄" />
              <StatCard title="Bugungi tahlillar" value={stats?.analysesToday || 0} icon="📅" />
              <StatCard title="Promo kodlar" value={promoCodes.length} icon="🎫" />
              <StatCard title="Tashkilot kodlari" value={organizationCodes.length} icon="🏛️" />
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Foydalanuvchilar"
              subtitle="Obuna, rol va holatlarni boshqarish"
            />

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Foydalanuvchi</th>
                    <th>Rol</th>
                    <th>Obuna</th>
                    <th>Business ID</th>
                    <th>Tahlillar</th>
                    <th>Holat</th>
                    <th>Amallar</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((u) => {
                    const premiumActive =
                      u.isPremium &&
                      u.premiumExpiresAt &&
                      new Date(u.premiumExpiresAt) > new Date()

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar">
                              {u.firstName?.[0] || ''}{u.lastName?.[0] || ''}
                            </div>

                            <div>
                              <div className="admin-user-name">{u.firstName} {u.lastName}</div>
                              <div className="admin-user-username">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`admin-role-badge ${u.role}`}>{u.role}</span>
                        </td>

                        <td>
                          {u.role === 'business' ? (
                            <span className="admin-sub-badge business">🏢 Business</span>
                          ) : premiumActive ? (
                            <span className="admin-sub-badge premium">💎 Premium</span>
                          ) : (
                            <span className="admin-muted">Free</span>
                          )}
                        </td>

                        <td>{u.businessId || '-'}</td>
                        <td>{u.usageCount || 0}</td>

                        <td>
                          {u.isBlocked ? (
                            <span className="admin-status blocked">Bloklangan</span>
                          ) : (
                            <span className="admin-status active">Faol</span>
                          )}
                        </td>

                        <td>
                          <div className="admin-action-group">
                            {!premiumActive && u.role !== 'business' && (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => togglePremium(u.id, true, false)}
                                  disabled={actionLoading}
                                >
                                  Premium
                                </button>

                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => togglePremium(u.id, true, true)}
                                  disabled={actionLoading}
                                >
                                  Business
                                </button>
                              </>
                            )}

                            {(premiumActive || u.role === 'business') && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => togglePremium(u.id, false, false)}
                                disabled={actionLoading}
                              >
                                Olib tashlash
                              </button>
                            )}

                            <button
                              className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                              onClick={() => toggleBlock(u.id, !u.isBlocked)}
                              disabled={actionLoading}
                            >
                              {u.isBlocked ? 'Ochish' : 'Bloklash'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'promo' && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Promo kodlar"
              subtitle="Oddiy Premium promo kodlarni yaratish va boshqarish"
            />

            <div className="admin-panel-card">
              <form onSubmit={createPromoCode}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Kod</label>
                    <input
                      className="form-input"
                      placeholder="Bo‘sh qoldirsangiz avtomatik yaratiladi"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Muddati kunlarda</label>
                    <input
                      type="number"
                      className="form-input"
                      value={promoForm.duration}
                      onChange={(e) => setPromoForm({ ...promoForm, duration: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Foydalanish limiti</label>
                    <input
                      type="number"
                      className="form-input"
                      value={promoForm.usageLimit}
                      onChange={(e) => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tugash sanasi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={promoForm.expiresAt}
                      onChange={(e) => setPromoForm({ ...promoForm, expiresAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    ➕ Promo kod yaratish
                  </button>
                </div>

                {promoMessage && (
                  <p className={promoMessage.startsWith('✅') ? 'admin-msg success' : 'admin-msg error'}>
                    {promoMessage}
                  </p>
                )}
              </form>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Muddat</th>
                    <th>Limit</th>
                    <th>Ishlatilgan</th>
                    <th>Tugash sanasi</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.map((promo) => (
                    <tr key={promo.id}>
                      <td>{promo.code}</td>
                      <td>{promo.duration} kun</td>
                      <td>{promo.usageLimit}</td>
                      <td>{promo.usedCount}</td>
                      <td>{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deletePromoCode(promo.code)}
                          disabled={actionLoading}
                        >
                          O‘chirish
                        </button>
                      </td>
                    </tr>
                  ))}

                  {promoCodes.length === 0 && (
                    <tr>
                      <td colSpan="6" className="admin-empty-row">
                        Promo kodlar hali yaratilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'org' && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Tashkilot kodlari"
              subtitle="Firma va davlat idoralari uchun seat-limitli access kodlar"
            />

            <div className="admin-panel-card">
              <form onSubmit={createOrganizationCode}>
                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Tashkilot nomi</label>
                    <input
                      className="form-input"
                      placeholder="Masalan: Adliya bo‘limi yoki firma nomi"
                      value={orgForm.organizationName}
                      onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kod</label>
                    <input
                      className="form-input"
                      placeholder="Bo‘sh qoldirsangiz avtomatik yaratiladi"
                      value={orgForm.code}
                      onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tarif turi</label>
                    <select
                      className="form-input"
                      value={orgForm.planType}
                      onChange={(e) => setOrgForm({ ...orgForm, planType: e.target.value })}
                    >
                      <option value="business">Business</option>
                      <option value="government">Government</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Seat limiti</label>
                    <input
                      type="number"
                      className="form-input"
                      value={orgForm.seatLimit}
                      onChange={(e) => setOrgForm({ ...orgForm, seatLimit: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Muddati kunlarda</label>
                    <input
                      type="number"
                      className="form-input"
                      value={orgForm.duration}
                      onChange={(e) => setOrgForm({ ...orgForm, duration: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tugash sanasi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={orgForm.expiresAt}
                      onChange={(e) => setOrgForm({ ...orgForm, expiresAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    ➕ Tashkilot kodi yaratish
                  </button>
                </div>

                {orgMessage && (
                  <p className={orgMessage.startsWith('✅') ? 'admin-msg success' : 'admin-msg error'}>
                    {orgMessage}
                  </p>
                )}
              </form>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tashkilot</th>
                    <th>Kod</th>
                    <th>Tarif</th>
                    <th>Seat</th>
                    <th>Business ID</th>
                    <th>Tugash sanasi</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationCodes.map((org) => (
                    <tr key={org.id || org.code}>
                      <td>{org.organizationName || '-'}</td>
                      <td>{org.code}</td>
                      <td>{org.planType || 'business'}</td>
                      <td>{org.usedSeats || 0}/{org.seatLimit || 0}</td>
                      <td>{org.businessId || '-'}</td>
                      <td>{org.expiresAt ? new Date(org.expiresAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteOrganizationCode(org.code)}
                          disabled={actionLoading}
                        >
                          O‘chirish
                        </button>
                      </td>
                    </tr>
                  ))}

                  {organizationCodes.length === 0 && (
                    <tr>
                      <td colSpan="7" className="admin-empty-row">
                        Tashkilot kodlari hali yaratilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </motion.div>
  )
}