import React, { useState } from 'react'
import axios from 'axios'
import './PaymentForm.css'

export default function PaymentForm({
  draft,
  secondsLeft,
  receipt,
  setReceipt,
  setMsg,
  setLoading
}){
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  if(!draft) return null

  const total = (draft.selected.length * draft.pricePerSlot)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function completePayment(){
    setLoading(true)
    setMsg('')
    if(secondsLeft !== null && secondsLeft <= 0){
      setLoading(false)
      setMsg('Payment time expired. Please restart booking.')
      return
    }
    try{
      const res = await axios.post('/api/payments', {
        name: draft.customer ? draft.customer.fullName : '',
        email: draft.customer ? draft.customer.email : '',
        phone: draft.customer ? draft.customer.phone : '',
        paymentMethod: 'GCASH',
        status: 'PENDING',
        slots: draft.selected.map(s => ({
          courtId: s.courtId,
          date: s.date || draft.date,
          time: s.time,
        })),
        totalPrice: total,
        pricePerSlot: draft.pricePerSlot,
        txnId: draft.txnId || '',
        receipt: receipt || '',
      })
      try{
        const payload = (res && res.data) ? res.data : {}
        sessionStorage.setItem('recentPayment', JSON.stringify(payload))
        // recentPayment saved (debug removed)
        try{ window.dispatchEvent(new CustomEvent('recentPaymentSaved', { detail: payload })) }catch(_){ }
      }catch(_){ }
      try{ sessionStorage.removeItem('bookingDraft') }catch(_){ }
      // Show a success modal and then redirect to homepage — payment remains PENDING until admin approves
      try{ setShowSuccessModal(true) }catch(_){ }
      setTimeout(()=>{ try{ setShowSuccessModal(false) }catch(_){ } ; try{ localStorage.setItem('suppressPendingModal','1') }catch(_){} ; try{ sessionStorage.setItem('suppressPendingModal','1') }catch(_){} ; try{ window.location.hash = '#/' }catch(_){ } }, 1800)
    }catch(err){
      const e = err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message
      setMsg('Error: '+e)
    }finally{ setLoading(false) }
  }

  function formatTimer(s){
    if(s == null) return ''
    const m = Math.floor(s/60).toString().padStart(2,'0')
    const sec = (s%60).toString().padStart(2,'0')
    return `${m}:${sec}`
  }

  return (
    <div className="payment-container">
      <div className="payment-top">
        <div>
          <h2 style={{margin:'6px 0 0 0'}}>Payment Required</h2>
          <div style={{color:'#666',fontSize:13}}>Transaction ID: <strong>{draft.txnId || ''}</strong></div>
        </div>
        <div className="payment-timer">{secondsLeft != null ? `${formatTimer(secondsLeft)} to complete payment` : ''}</div>
      </div>
      <div style={{height:12}} />
      <div style={{display:'flex',gap:20}}>
        <div className="scan-column">
          <h3 style={{marginTop:0}}>Payment Instructions</h3>
          <div style={{border:'1px solid #f0f0f0',padding:12,borderRadius:8,color:'#444'}}>
            Please complete the payment to secure your reserved slots. After payment, click "Complete Payment" to submit your booking and proceed.
          </div>
        </div>
        <div className="details-column">
          <h3 style={{marginTop:0}}>Booking Details</h3>
          <div style={{border:'1px solid #f0f0f0',padding:12,borderRadius:8}}>
            <div style={{marginBottom:8}}>Date: <strong>{draft.date}</strong></div>
            <div style={{marginBottom:8}}>Total: <strong>₱{total.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>
      <div className="payment-summary">
        {draft.selected.map((s,idx)=>{
          const court = (draft.courts||[]).find(c=>c.id===s.courtId)
          const courtName = court ? court.name : `Court ${s.courtId}`
          const timeLabel = (()=>{
            const t = (draft.times||[]).find(t=>t.time===s.time)
            return t ? (t.label || t.display || s.time) : s.time
          })()
          return (
            <div key={idx} className="payment-line">
              <div>{courtName} — {timeLabel}</div>
              <div style={{fontWeight:700}}>₱{draft.pricePerSlot.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
      {/* receipt upload removed per request */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontWeight:800}}>Total</div>
        <div style={{fontWeight:800}}>₱{total.toFixed(2)}</div>
      </div>
      <div className="payment-actions" style={{justifyContent:'space-between'}}>
        <div>
          <button onClick={()=>{
            // ensure SlotGrid picks up the recentPayment (in-case it wasn't applied)
            try{
              const raw = sessionStorage.getItem('recentPayment')
              if(raw){
                const parsed = JSON.parse(raw)
                // if user returned from Payment to Bookings, ensure we reopen the modal
                try{ sessionStorage.removeItem('pendingBanner') }catch(_){ }
                try{ window.dispatchEvent(new CustomEvent('recentPaymentSaved', { detail: parsed })) }catch(_){ }
              }
            }catch(_){ }
            // navigate back then force a full page reload so SlotGrid re-reads
            // authoritative server state (ensures pending markers persist)
            setTimeout(()=>{
              try{ window.location.hash = '#/'; }catch(_){ }
              setTimeout(()=>{
                try{ window.location.reload() }catch(_){ window.location.href = window.location.origin + window.location.pathname + '#/'; }
              }, 250)
            }, 350)
          }} className="btn">← Back to Bookings</button>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={async ()=>{
            // show confirmation modal before canceling
            setShowCancelConfirm(true)
          }} className="btn btn-cancel">Cancel Booking</button>
          <button onClick={completePayment} disabled={(secondsLeft!=null && secondsLeft<=0)} className="btn btn-primary">Complete Payment</button>
        </div>
      </div>
      {setMsg && <div className="toast-success">{/* message shown in Payment.jsx container */}</div>}

      {showCancelConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{maxWidth:480}}>
            <div style={{textAlign:'center'}}>
              <h3 style={{marginTop:0}}>Are you sure?</h3>
              <div style={{color:'#666',marginTop:8}}>Canceling will release your reserved slots and delete the pending payment. This action cannot be undone.</div>
              <div style={{display:'flex',justifyContent:'center',gap:10,marginTop:14}}>
                <button onClick={()=>setShowCancelConfirm(false)} className="btn">No, keep booking</button>
                <button onClick={async ()=>{
                  setLoading && setLoading(true)
                  try{
                    const op = sessionStorage.getItem('ongoingPaymentId')
                    if(op){
                      await axios.delete(`/api/payments/${op}`)
                    }
                  }catch(_){ }
                        // notify SlotGrid to refresh and navigate back
                        try{ window.dispatchEvent(new Event('refreshPayments')) }catch(_){ }
                        window.location.hash = '#/'
                  try{ sessionStorage.removeItem('recentPayment') }catch(_){ }
                  try{ sessionStorage.removeItem('pendingBanner') }catch(_){ }
                  try{ sessionStorage.removeItem('ongoingPaymentId') }catch(_){ }
                  try{ sessionStorage.setItem('expiredRedirect','1') }catch(_){ }
                  // notify other components (SlotGrid) to refresh immediately
                  try{ window.dispatchEvent(new Event('refreshPayments')) }catch(_){ }
                  setShowCancelConfirm(false)
                  setLoading && setLoading(false)
                  window.location.hash = '#/'
                }} className="btn btn-cancel">Yes, cancel booking</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{maxWidth:480}}>
            <div style={{textAlign:'center'}}>
              <h3 style={{marginTop:0}}>Payment Successful</h3>
              <div style={{color:'#666',marginTop:8}}>Your payment was submitted successfully and is pending admin approval. You will be redirected to the homepage shortly.</div>
              <div style={{display:'flex',justifyContent:'center',gap:10,marginTop:14}}>
                <button onClick={()=>{ try{ localStorage.setItem('suppressPendingModal','1') }catch(_){ } try{ sessionStorage.setItem('suppressPendingModal','1') }catch(_){ } setShowSuccessModal(false); try{ window.location.hash = '#/' }catch(_){ } }} className="btn btn-primary">Go to Home Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
