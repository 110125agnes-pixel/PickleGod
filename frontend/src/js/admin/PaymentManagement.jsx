import React, { useState, useEffect } from 'react'

const PER_PAGE = 10

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

export default function PaymentManagement({ payments, courts, loading, onView }) {
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
