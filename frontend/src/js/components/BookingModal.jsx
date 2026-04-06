import React, { useState } from 'react'
import axios from 'axios'
import './BookingModal.css'

export default function BookingModal({
  open,
  onClose,
  selected = [],
  date,
  pricePerSlot = 0,
  courts = [],
  times = [],
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  formErrors = {},
  setFormErrors
}){
  if(!open) return null
  const [submitting, setSubmitting] = useState(false)

  function makeTxnId(){
    const a = Math.random().toString(36).substring(2,5).toUpperCase()
    const b = Math.random().toString(36).substring(2,5).toUpperCase()
    return a + '-' + b
  }

  async function handleProceed(){
    const errs = {}
    if(!fullName || fullName.trim().length===0) errs.fullName = true
    setFormErrors(errs)
    if(Object.keys(errs).length>0) return

    const draft = {
      selected: selected,
      date: date,
      pricePerSlot: pricePerSlot,
      courts: courts,
      times: times,
      customer: {
        fullName,
        email,
        phone
      },
      txnId: makeTxnId(),
      expiry: Date.now() + (10 * 60 * 1000)
    }
    // save draft to sessionStorage so payment page can read it
    try{ sessionStorage.setItem('bookingDraft', JSON.stringify(draft)) }catch(_){ }

    // Attempt to create a server-side PENDING payment now so slots are locked
    setSubmitting(true)
    try{
      const payload = {
        name: draft.customer.fullName || '',
        email: draft.customer.email || '',
        phone: draft.customer.phone || '',
        paymentMethod: 'GCASH',
        status: 'PENDING',
        slots: draft.selected.map(s=>({ courtId: s.courtId, date: s.date || draft.date, time: s.time })),
        totalPrice: draft.selected.length * draft.pricePerSlot,
        pricePerSlot: draft.pricePerSlot,
        txnId: draft.txnId || '',
        receipt: ''
      }
      const res = await axios.post('/api/payments', payload)
      const server = (res && res.data) ? res.data : null
      if(server){
        // merge server response with expiry so SlotGrid knows when to expire
        const recent = { ...(server || {}), expiry: draft.expiry }
        try{ sessionStorage.setItem('recentPayment', JSON.stringify(recent)) }catch(_){ }
        try{ sessionStorage.setItem('ongoingPaymentId', String(server.id)) }catch(_){ }
        try{ window.dispatchEvent(new CustomEvent('recentPaymentSaved', { detail: recent })) }catch(_){ }
        // close modal and navigate to payment page
        try{ onClose && onClose() }catch(_){ }
        setTimeout(()=>{ window.location.hash = '#/payment' }, 300)
        setSubmitting(false)
        return
      }
    }catch(_){
      // if server call fails, fall back to client-side only optimistic handoff
    }
    setSubmitting(false)

    // fallback: optimistic same-tab handoff (client-only)
    try{
      const recent = { slots: selected, status: 'PENDING', txnId: draft.txnId, expiry: draft.expiry }
      sessionStorage.setItem('recentPayment', JSON.stringify(recent))
      try{ window.dispatchEvent(new CustomEvent('recentPaymentSaved', { detail: recent })) }catch(_){ }
    }catch(_){ }

    // Also update the DOM immediately as a backup so the user sees the pending state
    try{
      selected.forEach(s => {
        const key = `${s.courtId}|${date}|${s.time}`
        const el = document.querySelector(`[data-slot-key="${key}"]`)
        if(el){
          el.classList.remove('selected')
          el.classList.add('pending')
          try{ el.textContent = 'Pending' }catch(_){ }
        }
      })
    }catch(_){ }

    // Close modal first so user sees the grid update, then navigate after a short delay
    try{ onClose && onClose() }catch(_){ }
    setTimeout(()=>{ window.location.hash = '#/payment' }, 300)
  }

  const total = pricePerSlot * selected.length

  return (
    <div className="booking-modal-backdrop">
      <div className="booking-modal">
        <h3>Complete Your Booking</h3>
        <div style={{color:'#666',marginBottom:12}}>Enter your details to hold these slots.</div>

        <div className="booking-summary">
          <div style={{fontSize:12,color:'#888'}}>Booking Summary</div>
          <div style={{fontWeight:700,marginTop:6}}>{new Date(date).toLocaleDateString()}</div>
          {selected.slice(0,4).map((s,idx)=>{
            const court = courts.find(c=>c.id===s.courtId)
            const courtName = court ? court.name : `Court ${s.courtId}`
              const timeLabel = (()=>{ 
                const t = times.find(t=>t.time === s.time)
                return t ? (t.label || t.display || s.time) : s.time
            })()
            return (
              <div key={idx} className="row">
                <div style={{fontSize:13,color:'#333'}}>{courtName} — {timeLabel} ({selected.length} slots)</div>
                <div style={{fontWeight:700}}>₱{pricePerSlot * selected.length}</div>
              </div>
            )
          })}
          <div style={{borderTop:'1px solid #e6eef0',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
            <div style={{fontWeight:800}}>Total:</div>
            <div style={{fontWeight:800}}>₱{total.toFixed(0)}</div>
          </div>
          <div style={{fontSize:11,color:'#888',marginTop:6}}>* Special pricing applied</div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:8}}>
          <div>
            <input className={formErrors.fullName ? 'booking-input error' : 'booking-input'} placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />
            {formErrors.fullName && <div style={{color:'#e03b3b',fontSize:12,marginTop:6}}>Name is required</div>}
          </div>
          <div>
            <input className="booking-input" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <input className="booking-input" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} />
          </div>
        </div>

        <div className="booking-actions">
          <button onClick={()=>{ onClose && onClose() ; setFormErrors && setFormErrors({})}} className="btn-secondary">Cancel</button>
          <button onClick={handleProceed} className="btn-primary">Hold Slots & Proceed to Payment</button>
        </div>
      </div>
    </div>
  )
}
