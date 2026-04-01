import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Payment(){
  const [draft, setDraft] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(()=>{
    try{
      const raw = sessionStorage.getItem('bookingDraft')
      if(!raw) return setDraft(null)
      const parsed = JSON.parse(raw)
      setDraft(parsed)
      if(parsed.receipt) setReceipt(parsed.receipt)
      // setup timer using expiry in draft (ms)
      if(parsed.expiry){
        const update = ()=>{
          const s = Math.max(0, Math.floor((parsed.expiry - Date.now())/1000))
          setSecondsLeft(s)
        }
        update()
        const id = setInterval(update, 1000)
        return ()=>clearInterval(id)
      }
    }catch(e){
      setDraft(null)
    }
  },[])

  useEffect(()=>{
    // if timer reaches zero, mark expired (clear draft)
    if(secondsLeft === 0){
      setMsg('Payment time expired. Please restart booking.')
    }
  },[secondsLeft])

  if(draft === null) return (
    <div style={{maxWidth:720,margin:'40px auto',padding:20}}>
      <h3>No booking draft found</h3>
      <p>Please select slots and press "Hold Slots" to continue.</p>
      <button onClick={()=>{ window.location.hash = '#/'; }}>Back</button>
    </div>
  )

  const total = (draft.selected.length * draft.pricePerSlot)

  async function completePayment(){
    setLoading(true)
    setMsg('')
    if(secondsLeft !== null && secondsLeft <= 0){
      setLoading(false)
      setMsg('Payment time expired. Please restart booking.')
      return
    }
    try{
      const promises = draft.selected.map(s => axios.post('/api/bookings', {
        courtId: s.courtId,
        date: draft.date,
        time: s.time,
        description: receipt ? `receipt:${receipt}` : ''
      }))
      const results = await Promise.all(promises)
      // clear draft and navigate home
      sessionStorage.removeItem('bookingDraft')
      setMsg('Payment success — bookings created')
      setTimeout(()=>{ window.location.hash = '#/'; }, 1200)
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
    <div style={{maxWidth:920,margin:'24px auto',padding:20,background:'#fff',borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,0.08)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h2 style={{margin:'6px 0 0 0'}}>Payment Required</h2>
          <div style={{color:'#666',fontSize:13}}>Transaction ID: <strong>{draft.txnId || ''}</strong></div>
        </div>
        <div style={{background:'#e8f7ff',color:'#0b6fb0',padding:'8px 12px',borderRadius:8,fontWeight:700}}>
          {secondsLeft != null ? `${formatTimer(secondsLeft)} to complete payment` : ''}
        </div>
      </div>
      <div style={{height:12}} />
      <div style={{display:'flex',gap:20}}>
        <div style={{flex:1}}>
          <h3 style={{marginTop:0}}>Scan to Pay</h3>
          <div style={{border:'1px solid #f0f0f0',padding:12,borderRadius:8}}>Place QR and account info here.</div>
        </div>
        <div style={{width:360}}>
          <h3 style={{marginTop:0}}>Booking Details</h3>
          <div style={{border:'1px solid #f0f0f0',padding:12,borderRadius:8}}>
            <div style={{marginBottom:8}}>Date: <strong>{draft.date}</strong></div>
            <div style={{marginBottom:8}}>Total: <strong>₱{total.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>
      <div style={{borderTop:'1px solid #eee',paddingTop:12,marginBottom:12}}>
        {draft.selected.map((s,idx)=>{
          const court = (draft.courts||[]).find(c=>c.id===s.courtId)
          const courtName = court ? court.name : `Court ${s.courtId}`
          const timeLabel = (()=>{
            const t = (draft.times||[]).find(t=>t.time===s.time)
            // prefer the full duration label (e.g. "11:00 - 12:00 PM")
            return t ? (t.label || t.display || s.time) : s.time
          })()
          return (
            <div key={idx} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #fafafa'}}>
              <div>{courtName} — {timeLabel}</div>
              <div style={{fontWeight:700}}>₱{draft.pricePerSlot.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:12}}>
        <div style={{marginBottom:8,fontWeight:700}}>Upload receipt (optional)</div>
        <input type="file" accept="image/*" onChange={async (e)=>{
          const f = e.target.files && e.target.files[0]
          if(!f) return
          const reader = new FileReader()
          reader.onload = ()=>{
            const data = reader.result
            setReceipt(data)
            try{
              const raw = sessionStorage.getItem('bookingDraft')
              if(!raw) return
              const parsed = JSON.parse(raw)
              parsed.receipt = data
              sessionStorage.setItem('bookingDraft', JSON.stringify(parsed))
            }catch(_){}
          }
          reader.readAsDataURL(f)
        }} />
        {receipt && (
          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:12}}>
            <img src={receipt} alt="receipt" style={{width:120,height:'auto',borderRadius:6,boxShadow:'0 6px 18px rgba(0,0,0,0.08)'}} />
            <div>
              <div style={{marginBottom:8}}>Receipt attached</div>
              <button onClick={()=>{
                setReceipt(null)
                try{
                  const raw = sessionStorage.getItem('bookingDraft')
                  if(!raw) return
                  const parsed = JSON.parse(raw)
                  delete parsed.receipt
                  sessionStorage.setItem('bookingDraft', JSON.stringify(parsed))
                }catch(_){}
              }} style={{padding:'6px 10px',borderRadius:6}}>Remove</button>
            </div>
          </div>
        )}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontWeight:800}}>Total</div>
        <div style={{fontWeight:800}}>₱{total.toFixed(2)}</div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button onClick={()=>{ window.location.hash = '#/'; }} style={{padding:'8px 12px',borderRadius:8}}>Back</button>
        <button onClick={completePayment} disabled={loading || (secondsLeft!=null && secondsLeft<=0)} className="btn-animate">{loading ? 'Processing...' : 'Complete Payment'}</button>
      </div>
      {msg && <div style={{marginTop:12}} className="toast-success">{msg}</div>}
    </div>
  )
}
