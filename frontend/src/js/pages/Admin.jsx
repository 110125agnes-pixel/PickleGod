import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Logo from '../../assets/logo.svg'

const PRICE_PER_SLOT = 200

// ─── Icons (inline SVG to avoid extra deps) ─────────────────────────────────
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)
const IconCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconCourt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 12h20"/>
  </svg>
)

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ section, setSection }) {
  const [bookingOpen, setBookingOpen] = useState(true)

  return (
    <aside className="adm-sidebar">
      <div className="adm-logo-wrap">
        <img src={Logo} alt="logo" className="adm-logo" />
      </div>

      <nav className="adm-nav">
        <button className="adm-nav-item" onClick={() => { window.location.hash = '#/' }}>
          <IconHome /> <span>Homepage</span>
        </button>

        <button
          className={`adm-nav-item adm-nav-group ${bookingOpen ? 'open' : ''}`}
          onClick={() => setBookingOpen(o => !o)}
        >
          <IconBook /> <span>Booking Management</span>
          <span className="adm-nav-arrow">{bookingOpen ? '❯' : '❯'}</span>
        </button>

        {bookingOpen && (
          <div className="adm-nav-sub">
            <button
              className={`adm-nav-item adm-nav-subitem ${section === 'payments' ? 'active' : ''}`}
              onClick={() => setSection('payments')}
            >
              <IconCard /> <span>Payment Management</span>
            </button>
            <button
              className={`adm-nav-item adm-nav-subitem ${section === 'calendar' ? 'active' : ''}`}
              onClick={() => setSection('calendar')}
            >
              <IconCalendar /> <span>Manage Calendar</span>
            </button>
            <button
              className={`adm-nav-item adm-nav-subitem ${section === 'courts' ? 'active' : ''}`}
              onClick={() => setSection('courts')}
            >
              <IconCourt /> <span>Manage Court</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  )
}

// ─── Status badge helpers ────────────────────────────────────────────────────
const STATUS_STYLES = {
  APPROVED: { color: '#27ae60' },
  PENDING:  { color: '#e67e22' },
  DENIED:   { color: '#e74c3c' },
  VOID:     { color: '#7f8c8d' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING
  return <span style={{ fontWeight: 700, ...s }}>{status}</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// ─── Payment Management ──────────────────────────────────────────────────────
const PER_PAGE = 10

function PaymentManagement({ bookings, courts, loading, onDelete }) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(bookings.length / PER_PAGE))
  const slice = bookings.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function courtName(id) {
    const c = courts.find(c => c.id === id)
    return c ? c.name : `Court ${id}`
  }

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">View &amp; Manage Payments</h2>
      {loading && <div className="adm-loading">Loading…</div>}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Book ID</th>
              <th>Name</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Total Price</th>
              <th>Create At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={7} className="adm-empty">No bookings found</td>
              </tr>
            )}
            {slice.map(b => {
              const name = b.description && !b.description.startsWith('receipt:')
                ? b.description
                : '—'
              return (
                <tr key={b.id}>
                  <td>#{String(b.id).padStart(3, '0')}</td>
                  <td>{name}</td>
                  <td>GCash</td>
                  <td><StatusBadge status="PENDING" /></td>
                  <td>₱{PRICE_PER_SLOT}</td>
                  <td>{fmtDate(b.createdAt)}</td>
                  <td>
                    <button className="adm-btn-view" onClick={() => onDelete(b.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-pagination">
        <button className="adm-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
        <span>Page {page} of {totalPages}</span>
        <button className="adm-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
      </div>
    </div>
  )
}

// ─── Icon helpers for calendar actions ───────────────────────────────────────
const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const UD_KEY = 'adm_unavailable_dates'
function loadUD() {
  try { return JSON.parse(localStorage.getItem(UD_KEY)) || [] } catch { return [] }
}
function saveUD(list) {
  localStorage.setItem(UD_KEY, JSON.stringify(list))
}

const CAL_PER_PAGE = 10

// ─── Manage Calendar ─────────────────────────────────────────────────────────
function ManageCalendar() {
  const [entries, setEntries] = useState(() => loadUD())
  const [newDate, setNewDate]   = useState(new Date().toISOString().slice(0, 10))
  const [newReason, setNewReason] = useState('')
  const [selected, setSelected] = useState(null)
  const [editId, setEditId]     = useState(null)
  const [editReason, setEditReason] = useState('')
  const [page, setPage]         = useState(1)

  const totalPages = Math.max(1, Math.ceil(entries.length / CAL_PER_PAGE))
  const slice = entries.slice((page - 1) * CAL_PER_PAGE, page * CAL_PER_PAGE)

  function fmtDisplayDate(iso) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${m}-${d}-${y}`
  }

  function addEntry() {
    if (!newDate) return
    const already = entries.find(e => e.date === newDate)
    if (already) return
    const updated = [...entries, { id: Date.now(), date: newDate, reason: newReason.trim() || '' }]
    updated.sort((a, b) => a.date.localeCompare(b.date))
    setEntries(updated)
    saveUD(updated)
    setNewReason('')
  }

  function deleteEntry(id) {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    saveUD(updated)
    if (selected === id) setSelected(null)
  }

  function startEdit(entry) {
    setEditId(entry.id)
    setEditReason(entry.reason)
  }

  function saveEdit(id) {
    const updated = entries.map(e => e.id === id ? { ...e, reason: editReason.trim() } : e)
    setEntries(updated)
    saveUD(updated)
    setEditId(null)
  }

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Manage Unavailable Dates</h2>

      {/* Add row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <div className="adm-cal-date-wrap">
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="adm-cal-date-input"
          />
          <span className="adm-cal-date-icon"><IconCalendar /></span>
        </div>
        <input
          type="text"
          placeholder="Optional reason"
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          className="adm-cal-reason-input"
        />
        <button className="adm-btn-add" onClick={addEntry}>Add Date</button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Select</th>
              <th>Date</th>
              <th>Reason</th>
              <th style={{ width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={4} className="adm-empty">No unavailable dates added</td></tr>
            )}
            {slice.map(entry => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="radio"
                    name="cal-select"
                    checked={selected === entry.id}
                    onChange={() => setSelected(entry.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </td>
                <td>{fmtDisplayDate(entry.date)}</td>
                <td>
                  {editId === entry.id
                    ? <input
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                        onKeyDown={e => { if(e.key==='Enter') saveEdit(entry.id); if(e.key==='Escape') setEditId(null) }}
                        onBlur={() => saveEdit(entry.id)}
                        autoFocus
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #bbb', fontSize: 13, width: '100%' }}
                      />
                    : entry.reason || '—'
                  }
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <button className="adm-icon-btn" onClick={() => startEdit(entry)} title="Edit"><IconEdit /></button>
                    <button className="adm-icon-btn" onClick={() => deleteEntry(entry.id)} title="Delete"><IconTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-pagination">
        <button className="adm-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
        <span>Page {page} of {totalPages}</span>
        <button className="adm-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
      </div>
    </div>
  )
}

// ─── Manage Courts ───────────────────────────────────────────────────────────
function ManageCourts({ courts, loading }) {
  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Manage Courts</h2>
      {loading && <div className="adm-loading">Loading…</div>}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Court Name</th>
            </tr>
          </thead>
          <tbody>
            {courts.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Root Admin Component ────────────────────────────────────────────────────
export default function Admin() {
  const [section, setSection] = useState('payments')
  const [bookings, setBookings] = useState([])
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/courts').then(r => setCourts(r.data || [])).catch(() => {}),
      axios.get('/api/bookings').then(r => setBookings(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  function handleDelete(id) {
    if (!window.confirm(`Delete booking #${id}?`)) return
    axios.delete(`/api/bookings/${id}`)
      .then(() => setBookings(bs => bs.filter(b => b.id !== id)))
      .catch(() => alert('Failed to delete booking'))
  }

  function renderContent() {
    switch (section) {
      case 'payments': return <PaymentManagement bookings={bookings} courts={courts} loading={loading} onDelete={handleDelete} />
      case 'calendar': return <ManageCalendar />
      case 'courts':   return <ManageCourts courts={courts} loading={loading} />
      default:         return null
    }
  }

  return (
    <div className="adm-layout">
      <Sidebar section={section} setSection={setSection} />
      <main className="adm-main">
        {renderContent()}
      </main>
    </div>
  )
}
