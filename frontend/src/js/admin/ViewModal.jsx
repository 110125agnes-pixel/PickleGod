import React from 'react'

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

export default function ViewModal({ payment, courts, onClose, onStatusUpdate }) {
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
