import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Logo from '../../assets/logo.svg'
import Paddle from '../../assets/paddle.svg'
import Ball from '../../assets/ball.svg'

function timesBetween(startHour = 9, endHour = 23) {
  const times = []
  function format12(h) {
    const hour = h % 12 === 0 ? 12 : h % 12
    const ampm = h < 12 ? 'AM' : 'PM'
    return `${hour}:00 ${ampm}`
  }
  for (let h = startHour; h < endHour; h++) {
    const from24 = `${String(h).padStart(2,'0')}:00`
    const to24 = `${String(h+1).padStart(2,'0')}:00`
    const fromLabel = format12(h)
    const toLabel = format12(h+1)
    times.push({ label: `${fromLabel} - ${toLabel}`, time: from24, display: fromLabel })
  }
  return times
}

export default function SlotGrid(){
  const [courts, setCourts] = useState([])
  const [bookings, setBookings] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [selected, setSelected] = useState([])
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const [bgUrl, setBgUrl] = useState(null)
  const [recentBookingIds, setRecentBookingIds] = useState([])
  const [showUndo, setShowUndo] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const times = timesBetween(9, 23)
  const MAX_SELECTION = 6

  useEffect(()=>{
    axios.get('/api/courts')
      .then(r=>setCourts(r.data))
      .catch(()=>setCourts([]))
  },[])

  useEffect(()=>{
    fetchBookings()
  },[date])

  function fetchBookings(){
    setLoading(true)
    axios.get('/api/bookings')
      .then(r=>{
        setBookings(r.data.filter(b=>b.date === date))
      })
      .catch(()=>setBookings([]))
      .finally(()=>setLoading(false))
  }

  function isBooked(courtId, time){
    return bookings.some(b=>b.courtId === courtId && b.time === time)
  }

  function isSelected(courtId, time){
    return selected.some(s=>s.courtId===courtId && s.time===time)
  }

  function toggleSelect(courtId, time){
    if(isBooked(courtId,time)) return
    if(isSelected(courtId,time)){
      setSelected(s=>s.filter(x=>!(x.courtId===courtId && x.time===time)))
    } else {
      // enforce maximum selection
      setSelected(s=>{
        if(s.length >= MAX_SELECTION){
          setShowLimitModal(true)
          return s
        }
        return [...s,{courtId,time,date}]
      })
    }
  }

  function holdSlots(){
    if(selected.length===0) return
    setLoading(true)
    setMsg('')
    const promises = selected.map(slot => axios.post('/api/bookings', {
      courtId: slot.courtId,
      date: slot.date,
      time: slot.time,
      description: ''
    }))
    Promise.all(promises)
      .then((responses)=>{
        const ids = responses.map(r=> r.data && r.data.id).filter(Boolean)
        if(ids.length) {
          setRecentBookingIds(ids)
          setShowUndo(true)
          setTimeout(()=>setShowUndo(false), 8000)
        }
        setMsg('Slots held successfully')
        setSelected([])
        setCelebrate(true)
        setTimeout(()=>setCelebrate(false), 1400)
        fetchBookings()
      })
      .catch(err=>{
        const e = err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message
        setMsg('Error: '+e)
      })
      .finally(()=>setLoading(false))
  }

  // price per slot (easy to change or fetch from API later)
  const PRICE_PER_SLOT = 200

  // perform the actual booking requests (called after user confirms in modal)
  function performHoldSlots(){
    if(selected.length===0) return
    setShowPricingModal(false)
    setLoading(true)
    setMsg('')
    const promises = selected.map(slot => axios.post('/api/bookings', {
      courtId: slot.courtId,
      date: slot.date,
      time: slot.time,
      description: ''
    }))
    Promise.all(promises)
      .then((responses)=>{
        const ids = responses.map(r=> r.data && r.data.id).filter(Boolean)
        if(ids.length) {
          setRecentBookingIds(ids)
          setShowUndo(true)
          setTimeout(()=>setShowUndo(false), 8000)
        }
        setMsg('Slots held successfully')
        setSelected([])
        setCelebrate(true)
        setTimeout(()=>setCelebrate(false), 1400)
        fetchBookings()
      })
      .catch(err=>{
        const e = err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message
        setMsg('Error: '+e)
      })
      .finally(()=>setLoading(false))
  }

  function openPricingModal(){
    if(selected.length===0) return
    setShowPricingModal(true)
  }
  
  return (
    <div>
      <div className="app-bg" style={{backgroundImage: bgUrl ? `url(${bgUrl})` : 'none'}} />
      <div className="app-container" style={{maxWidth:1100,margin:'20px auto'}}>
      <header className="app-header">
        <div style={{marginRight:8}}>
          <div className="brand-title">Downtown Kinaladkad</div>
          <div className="brand-sub">Pickleball Hub — Reserve your court</div>
        </div>
        <img src={Logo} alt="logo" style={{height:44}} />
        <img src={Paddle} alt="paddle" style={{marginLeft:'auto',height:36,opacity:0.95}} />
        <button
          onClick={()=>{ window.location.hash = '#/admin' }}
          style={{marginLeft:16,padding:'6px 14px',borderRadius:8,border:'1px solid rgba(7,59,52,0.2)',background:'rgba(7,59,52,0.06)',color:'var(--brand-1)',fontWeight:600,cursor:'pointer',fontSize:13}}
        >
          Admin
        </button>
      </header>

      {/* top-left brand removed per request */}

      {/* Controls placed below header (normal flow) */}
      <div style={{display:'flex',gap:12,alignItems:'center',margin:'8px 0 18px 0'}}>
        <div className="date-picker">
          <div className="date-label">Date</div>
          <div className="date-control">
            <input className="date-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="calendar-btn" onClick={(e)=>{ e.preventDefault(); document.querySelector('.date-input').showPicker?.() || document.querySelector('.date-input').focus() }} title="Choose date">📅</button>
          </div>
        </div>
        {/* hide top action controls when there are selected slots (we show a bottom floating panel instead) */}
        <div style={{display: selected.length > 0 ? 'none' : 'flex', alignItems:'center',gap:12,marginLeft:8}}>
          <div style={{fontWeight:700}}><strong>{selected.length}</strong> selected</div>
          <button className="btn-animate" onClick={openPricingModal} disabled={selected.length===0 || loading}>
            {loading ? 'Working...' : 'Hold Slots'}
            <span style={{display:'inline-block',transform:'translateX(4px)'}}>🏓</span>
          </button>
          <button onClick={()=>{setSelected([])}} disabled={selected.length===0}>Clear</button>
          {msg && <div className="toast-success" style={{marginLeft:12}}>{msg}</div>}
        </div>
      </div>

      <div className="slot-grid">
        <div className="grid-header">
          <div className="time-col">TIME</div>
          {courts.map(c => <div key={c.id} className="court-col">{c.name}</div>)}
        </div>
        <div className="grid-body">
          {times.map(t=> (
            <div key={t.time} className="grid-row">
              <div className="time-col">{t.label}</div>
              {courts.map(c=> {
                const booked = isBooked(c.id, t.time)
                const sel = isSelected(c.id, t.time)
                const classes = ['cell']
                if(booked) classes.push('booked')
                else if(sel) classes.push('selected')
                return (
                  <div key={c.id} className={classes.join(' ')} onClick={()=>toggleSelect(c.id, t.time)}>
                    {booked ? 'Booked' : (sel ? 'Selected' : t.display || t.time)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {showPricingModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{width:420,maxWidth:'95%',background:'#fff',borderRadius:10,padding:20,boxShadow:'0 10px 40px rgba(0,0,0,0.3)'}}>
            <h3 style={{marginTop:0}}>Complete Your Booking</h3>
            <div style={{color:'#666',marginBottom:12}}>Enter your details to hold these slots.</div>

            <div style={{background:'#f6f8f9',padding:12,borderRadius:8,marginBottom:12}}>
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
                  <div key={idx} style={{display:'flex',justifyContent:'space-between',paddingTop:8}}>
                    <div style={{fontSize:13,color:'#333'}}>{courtName} — {timeLabel} ({selected.length} slots)</div>
                    <div style={{fontWeight:700}}>₱{PRICE_PER_SLOT * selected.length}</div>
                  </div>
                )
              })}
              <div style={{borderTop:'1px solid #e6eef0',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                <div style={{fontWeight:800}}>Total:</div>
                <div style={{fontWeight:800}}>₱{(PRICE_PER_SLOT * selected.length).toFixed(0)}</div>
              </div>
              <div style={{fontSize:11,color:'#888',marginTop:6}}>* Special pricing applied</div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:8}}>
              <div>
                <input placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:6,border: formErrors.fullName ? '2px solid #e03b3b' : '1px solid #ddd'}} />
                {formErrors.fullName && <div style={{color:'#e03b3b',fontSize:12,marginTop:6}}>Name is required</div>}
              </div>
              <div>
                <input placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ddd'}} />
              </div>
              <div>
                <input placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:6,border:'1px solid #ddd'}} />
              </div>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>{ setShowPricingModal(false) ; setFormErrors({})}} style={{padding:'8px 12px',borderRadius:8}}>Cancel</button>
              <button onClick={()=>{
                // validate
                const errs = {}
                if(!fullName || fullName.trim().length===0) errs.fullName = true
                setFormErrors(errs)
                if(Object.keys(errs).length>0) return
                // store draft and navigate to payment page
                function makeTxnId(){
                  const a = Math.random().toString(36).substring(2,5).toUpperCase()
                  const b = Math.random().toString(36).substring(2,5).toUpperCase()
                  return a + '-' + b
                }
                const draft = {
                  selected: selected,
                  date: date,
                  pricePerSlot: PRICE_PER_SLOT,
                  courts: courts,
                  times: times,
                  customer: {
                    fullName,
                    email,
                    phone
                  },
                  txnId: makeTxnId(),
                  // expiry timestamp (ms) - 30 seconds for quick test
                  expiry: Date.now() + (30 * 1000)
                }
                sessionStorage.setItem('bookingDraft', JSON.stringify(draft))
                // navigate to payment page
                window.location.hash = '#/payment'
              }} className="btn-animate" style={{background:'#2c6b67',color:'#fff',padding:'10px 12px',borderRadius:8}}>Hold Slots & Proceed to Payment</button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{width:420,maxWidth:'95%',background:'#fff',borderRadius:10,padding:20,boxShadow:'0 10px 40px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',flexDirection:'column',gap:8}}>
              <div style={{width:56,height:56,borderRadius:28,background:'#fff6e6',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #f2d59a'}}>
                <span style={{fontSize:22,color:'#d98218'}}>⚠️</span>
              </div>
              <h3 style={{margin:'6px 0'}}>Booking Limit Exceeded</h3>
              <div style={{color:'#444',textAlign:'center',marginBottom:12}}>Maximum 6 slots per transaction. Please reduce your selection.</div>
              <div style={{width:'100%'}}>
                <button onClick={()=>setShowLimitModal(false)} style={{width:'100%',background:'#144b48',color:'#fff',padding:'10px 12px',borderRadius:8}}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUndo && (
        <div style={{position:'fixed',right:24,bottom:24,display:'flex',gap:8,alignItems:'center'}}>
          <div className="toast-success">Slots held — <button style={{marginLeft:8}} onClick={undoRecent}>Undo</button></div>
        </div>
      )}

      {/* Bottom floating selected panel — appears when user has selected slots */}
      {selected.length > 0 && (
        <div style={{position:'fixed',left:0,right:0,bottom:18,display:'flex',justifyContent:'center',pointerEvents:'none',zIndex:9998}}>
          <div style={{width:'min(980px,95%)',pointerEvents:'auto',background:'#fff',borderRadius:10,boxShadow:'0 8px 30px rgba(0,0,0,0.12)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:12,color:'#666'}}>SELECTED SLOTS</div>
              <div style={{fontWeight:800}}>{selected.length} slots</div>
              <div style={{color:'#888'}}> / {MAX_SELECTION} max</div>
              <div style={{marginLeft:12,color:'#666'}}>Total: <span style={{fontWeight:800}}>₱{(PRICE_PER_SLOT * selected.length).toFixed(0)}</span></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setSelected([])} style={{border:'none',background:'transparent',color:'#666'}}>✕</button>
              <button onClick={openPricingModal} className="btn-animate" style={{background:'#0b4f4b',color:'#fff',padding:'10px 18px',borderRadius:8}}>Proceed to Pay ▸</button>
            </div>
          </div>
        </div>
      )}

      {celebrate && <img src={Ball} className="flying-ball" alt="celebrate" />}
      {celebrate && <img src={Ball} className="flying-ball" alt="celebrate" />}
      </div>
    </div>
  )
}
