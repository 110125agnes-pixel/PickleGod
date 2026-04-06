import React, { useEffect, useState } from 'react'
import axios from 'axios'
import AdminLayout from './AdminLayout'
import PaymentManagement from './PaymentManagement'
import ViewModal from './ViewModal'

// ManageCalendar and ManageCourts removed to focus on Payment Management

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
      .catch(() => { console.error('Failed to update status') /* replace with UI notification if desired */ })
  }

  function renderContent() {
    return <PaymentManagement payments={payments} courts={courts} loading={loading} onView={setViewPayment} />
  }

  return (
    <AdminLayout section={section} setSection={setSection}>
      {renderContent()}
      {viewPayment && (
        <ViewModal
          payment={viewPayment}
          courts={courts}
          onClose={() => setViewPayment(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </AdminLayout>
  )
}
