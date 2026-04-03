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

function formatSlotDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return iso }
}

function formatSlotTime(time24) {
  if (!time24) return ''
  const h = parseInt(time24.split(':')[0], 10)
  const fmt = (hr) => {
    const ampm = hr < 12 ? 'AM' : 'PM'
    const h12 = hr % 12 === 0 ? 12 : hr % 12
    return `${h12}:00 ${ampm}`
  }
  return `${fmt(h)}-${fmt(h + 1)}`
}

function ViewModal({ payment, courts, onClose, onStatusUpdate }) {
  if (!payment) return null

  function courtName(id) {
    const c = courts.find(c => c.id === id)
    return c ? c.name : `Court ${id}`
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 640, maxWidth: '95%', background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 12px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Payment Summary</h2>
          <button onClick={onClose} style={{ background: '#555', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 700, cursor: 'pointer' }}>CLOSE</button>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888' }}>Name:</div>
              <div style={{ fontWeight: 600 }}>{payment.name || '—'}</div>
              <div style={{ borderBottom: '1px solid #eee', marginTop: 8 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888' }}>Email:</div>
              <div>{payment.email || '—'}</div>
              <div style={{ borderBottom: '1px solid #eee', marginTop: 8 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>Phone:</div>
              <div>{payment.phone || '—'}</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888' }}>Payment Method:</div>
              <div style={{ fontWeight: 600 }}>{payment.paymentMethod || 'GCASH'}</div>
              <div style={{ borderBottom: '1px solid #eee', marginTop: 8 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888' }}>Submitted:</div>
              <div>{payment.paymentMethod || 'GCASH'}</div>
              <div style={{ borderBottom: '1px solid #eee', marginTop: 8 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>Status:</div>
              <StatusBadge status={payment.status || 'PENDING'} />
            </div>
          </div>

          <div style={{ flex: 1.3 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Slots Reserved:</div>
            <div style={{ background: '#f0e8e8', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
              {(payment.slots || []).map((slot, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', gap: 6, padding: '3px 0' }}>
                  <span style={{ color: '#555' }}>{formatSlotDate(slot.date)}</span>
                  <span>{courtName(slot.courtId)}</span>
                  <span>{formatSlotTime(slot.time)}</span>
                </div>
              ))}
            </div>
            {payment.receipt && (
              <div style={{ marginTop: 10, fontSize: 13, borderTop: '1px solid #eee', paddingTop: 8 }}>
                Receipt: <a href={payment.receipt} target="_blank" rel="noreferrer" style={{ color: '#2c6b67', fontWeight: 600 }}>View Receipt</a>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
          {(payment.status === 'APPROVED' || payment.status === 'DENIED') ? (
            <div style={{ color: payment.status === 'APPROVED' ? '#27ae60' : '#e74c3c', fontWeight: 700, fontSize: 15, padding: '10px 0' }}>
              {payment.status === 'APPROVED' ? '✓ This booking has been approved and cannot be changed.' : '✕ This booking has been denied and cannot be changed.'}
            </div>
          ) : (
            <>
              <button onClick={() => { if(window.confirm('Are you sure you want to VOID this booking?')) onStatusUpdate(payment.id, 'VOID') }} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 26px', fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>VOID</button>
              <button onClick={() => { if(window.confirm('Are you sure you want to DENY this booking? The slots will be freed.')) onStatusUpdate(payment.id, 'DENIED') }} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 26px', fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>DENY</button>
              <button onClick={() => { if(window.confirm('Are you sure you want to APPROVE this booking? This cannot be undone.')) onStatusUpdate(payment.id, 'APPROVED') }} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 26px', fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>APPROVE</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Column header with dropdown filter ──────────────────────────────────────
function ColHeader({ label, name, active, openDropdown, onToggle, children }) {
  return (
    <th style={{ position: 'relative', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span onClick={() => onToggle(name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 10, color: active ? '#2c6b67' : '#aaa' }}>{active ? '▼' : '⌄'}</span>
      </span>
      {openDropdown === name && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 999, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.13)', minWidth: 180, padding: 10 }}
          onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </th>
  )
}

function PaymentManagement({ payments, courts, loading, onView }) {
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null)

  const filtered = payments.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && p.status !== statusFilter) return false
    if (fromDate || toDate) {
      const d = new Date(p.createdAt)
      if (fromDate && d < new Date(fromDate + 'T00:00:00')) return false
      if (toDate && d > new Date(toDate + 'T23:59:59')) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function toggleDropdown(name) {
    setOpenDropdown(o => o === name ? null : name)
  }

  // close dropdown when clicking outside — defer so the opening click doesn't immediately close it
  React.useEffect(() => {
    if (!openDropdown) return
    const handler = () => setOpenDropdown(null)
    const id = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(id); document.removeEventListener('click', handler) }
  }, [openDropdown])

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">View &amp; Manage Payments</h2>
      {loading && <div className="adm-loading">Loading…</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'nowrap', overflow: 'hidden' }}>
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: 140, flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>Date:</span>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: 140, flexShrink: 0 }} />
        <span style={{ color: '#aaa', flexShrink: 0 }}>→</span>
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: 140, flexShrink: 0 }} />
        {(search || statusFilter || fromDate || toDate) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setFromDate(''); setToDate(''); setPage(1) }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Book ID</th>
              <ColHeader label="Name" name="name" active={!!search} openDropdown={openDropdown} onToggle={toggleDropdown}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Search name</div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Type to filter…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }}
                />
                {search && <button onClick={() => { setSearch(''); setPage(1) }} style={{ marginTop: 6, fontSize: 12, color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer' }}>✕ Clear</button>}
              </ColHeader>
              <th>Payment Method</th>
              <ColHeader label="Status" name="status" active={!!statusFilter} openDropdown={openDropdown} onToggle={toggleDropdown}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Filter by status</div>
                {['', 'PENDING', 'APPROVED', 'DENIED', 'VOID'].map(s => (
                  <div key={s} onClick={() => { setStatusFilter(s); setPage(1); setOpenDropdown(null) }}
                    style={{ padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: s === statusFilter ? 700 : 400, background: s === statusFilter ? '#f0f8f7' : 'transparent', color: s === 'APPROVED' ? '#27ae60' : s === 'DENIED' ? '#e74c3c' : s === 'PENDING' ? '#e67e22' : s === 'VOID' ? '#7f8c8d' : '#333' }}>
                    {s === '' ? 'All' : s}
                    {s === statusFilter && s !== '' && <span style={{ float: 'right' }}>✓</span>}
                  </div>
                ))}
              </ColHeader>
              <th>Total Price</th>
              <ColHeader label="Create At" name="date" active={!!(fromDate || toDate)} openDropdown={openDropdown} onToggle={toggleDropdown}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Filter by date range</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, color: '#666' }}>From</label>
                  <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <label style={{ fontSize: 12, color: '#666' }}>To</label>
                  <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  {(fromDate || toDate) && <button onClick={() => { setFromDate(''); setToDate(''); setPage(1) }} style={{ marginTop: 4, fontSize: 12, color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>✕ Clear dates</button>}
                </div>
              </ColHeader>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={7} className="adm-empty">No payments found</td></tr>
            )}
            {slice.map(p => (
              <tr key={p.id}>
                <td>#{String(p.id).padStart(3, '0')}</td>
                <td>{p.name || '—'}</td>
                <td>{p.paymentMethod || 'GCASH'}</td>
                <td><StatusBadge status={p.status || 'PENDING'} /></td>
                <td>₱{p.totalPrice || 0}</td>
                <td>{fmtDate(p.createdAt)}</td>
                <td><button className="adm-btn-view" onClick={() => onView(p)}>View</button></td>
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
  const [payments, setPayments] = useState([])
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewPayment, setViewPayment] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/courts').then(r => setCourts(r.data || [])).catch(() => {}),
      axios.get('/api/payments').then(r => setPayments(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  function handleStatusUpdate(id, status) {
    axios.patch(`/api/payments/${id}/status`, { status })
      .then(() => {
        setPayments(ps => ps.map(p => p.id === id ? { ...p, status } : p))
        setViewPayment(vp => vp && vp.id === id ? { ...vp, status } : vp)
      })
      .catch(() => alert('Failed to update status'))
  }

  function renderContent() {
    switch (section) {
      case 'payments': return <PaymentManagement payments={payments} courts={courts} loading={loading} onView={setViewPayment} />
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
      {viewPayment && (
        <ViewModal
          payment={viewPayment}
          courts={courts}
          onClose={() => setViewPayment(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  )
}
