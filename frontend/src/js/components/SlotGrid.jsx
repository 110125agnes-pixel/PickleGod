import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Logo from '../../assets/logo.svg'
import Paddle from '../../assets/paddle.svg'
import Ball from '../../assets/ball.svg'
import './SlotGrid.css'
import BookingModal from './BookingModal'
import { timesBetween, formatTimer } from '../utils/time-utils'
import SlotGridView from './slot-grid/SlotGridView'

export default function SlotGrid(){
  const [courts, setCourts] = useState([])
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [reservedMap, setReservedMap] = useState({})
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
    const [pendingPayment, setPendingPayment] = useState(null)
    const [pendingSecondsLeft, setPendingSecondsLeft] = useState(null)
    const [showPendingModal, setShowPendingModal] = useState(false)
    const [showPendingBanner, setShowPendingBanner] = useState(()=>{
      try{
        const suppressed = (typeof localStorage !== 'undefined' && localStorage.getItem('suppressPendingModal') === '1') || (sessionStorage.getItem && sessionStorage.getItem('suppressPendingModal') === '1')
        if(suppressed){ try{ localStorage.removeItem('suppressPendingModal') }catch(_){ } try{ sessionStorage.removeItem('suppressPendingModal') }catch(_){ } return false }
        return sessionStorage.getItem('pendingBanner') === '1'
      }catch(_){ return false }
    })

    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    function handleCloseToBanner(){
      setShowPendingModal(false)
      setShowPendingBanner(true)
      try{ sessionStorage.setItem('pendingBanner','1') }catch(_){ }
    }

    function dismissBanner(){
      setShowPendingBanner(false)
      try{ sessionStorage.removeItem('pendingBanner') }catch(_){ }
    }

    function resumePayment(){
      try{
        const raw = sessionStorage.getItem('recentPayment')
        if(raw){
          const parsed = JSON.parse(raw)
          try{ window.dispatchEvent(new CustomEvent('recentPaymentSaved', { detail: parsed })) }catch(_){ }
        }
      }catch(_){ }
      try{ window.location.hash = '#/payment' }catch(_){ }
    }

  // configuration (make non-hardcoded/easy to change)
  const START_HOUR = 9
  const END_HOUR = 23
  const PRICE_PER_SLOT = 200
  const MAX_SELECTION = 6

  const times = timesBetween(START_HOUR, END_HOUR)

  // If returning from payment, immediately apply any recentPayment so pending
  // slots show up without waiting for the API round-trip.
  useEffect(()=>{
    try{
      const recent = sessionStorage.getItem('recentPayment')
      if(recent){
        const parsed = JSON.parse(recent)
        // removed debug log
        const map = {}
        ;(parsed.slots||[]).forEach(s=>{
          const k = `${s.courtId}|${s.date}|${s.time}`
          map[k] = (parsed.status || 'PENDING').toUpperCase()
        })
        // merge with existing reservedMap
        // only apply if not yet expired
        if(!parsed.expiry || Date.now() < parsed.expiry){
          setReservedMap(r=>({ ...(r||{}), ...map }))
        } else {
          // removed debug statement
        }
      }
      // If there is an ongoing server-side payment id, ensure we fetch and apply it
      try{
        const op = sessionStorage.getItem('ongoingPaymentId')
        if(op){
          axios.get('/api/payments').then(r=>{
            const p = (r.data||[]).find(x => String(x.id) === String(op))
            if(p){
              const map2 = {}
              ;(p.slots||[]).forEach(s=>{ map2[`${s.courtId}|${s.date}|${s.time}`] = (p.status||'PENDING').toUpperCase() })
              setReservedMap(rprev => ({ ...(rprev||{}), ...map2 }))
                // also set pending modal data from server payment
                try{
                  const raw = sessionStorage.getItem('recentPayment')
                  const parsedRecent = raw ? JSON.parse(raw) : null
                  const expiry = parsedRecent && parsedRecent.expiry ? parsedRecent.expiry : null
                  setPendingPayment({ ...p, expiry })
                  if(expiry) setPendingSecondsLeft(Math.max(0, Math.floor((expiry - Date.now())/1000)))
                    // Respect suppression flag (set when redirecting immediately after payment)
                    const suppressed = (typeof localStorage !== 'undefined' && localStorage.getItem('suppressPendingModal') === '1') || (sessionStorage.getItem && sessionStorage.getItem('suppressPendingModal') === '1')
                    if(suppressed){ try{ localStorage.removeItem('suppressPendingModal') }catch(_){ } try{ sessionStorage.removeItem('suppressPendingModal') }catch(_){ } }
                    else {
                      // Respect banner preference saved when user closed the modal
                      const bannerPref = sessionStorage.getItem('pendingBanner') === '1'
                      if(bannerPref){ setShowPendingBanner(true) } else { setShowPendingModal(true) }
                    }
                }catch(_){ }
            }
          }).catch(()=>{})
        }
      }catch(_){ }
        // if there's a recentPayment in session, open pending modal (or banner if user chose to minimize)
        try{
          const rawRecent = sessionStorage.getItem('recentPayment')
          if(rawRecent){
            const parsedRecent = JSON.parse(rawRecent)
            setPendingPayment(parsedRecent)
            if(parsedRecent.expiry) setPendingSecondsLeft(Math.max(0, Math.floor((parsedRecent.expiry - Date.now())/1000)))
            const suppressed = (typeof localStorage !== 'undefined' && localStorage.getItem('suppressPendingModal') === '1') || (sessionStorage.getItem && sessionStorage.getItem('suppressPendingModal') === '1')
            if(suppressed){ try{ localStorage.removeItem('suppressPendingModal') }catch(_){ } try{ sessionStorage.removeItem('suppressPendingModal') }catch(_){ } }
            else {
              const bannerPref = sessionStorage.getItem('pendingBanner') === '1'
              if(bannerPref){ setShowPendingBanner(true) } else { setShowPendingModal(true) }
            }
          }
        }catch(_){ }
    }catch(_){ }
  }, [])

    // update pending countdown while modal is visible
      useEffect(()=>{
        if(!showPendingModal && !showPendingBanner) return
        const tid = setInterval(()=>{
        try{
          const raw = sessionStorage.getItem('recentPayment')
          if(!raw) return
          const parsed = JSON.parse(raw)
              if(parsed && parsed.expiry){
              const s = Math.max(0, Math.floor((parsed.expiry - Date.now())/1000))
              setPendingSecondsLeft(s)
              if(s <= 0){
                // removed debug statement
                try{ sessionStorage.removeItem('ongoingPaymentId') }catch(_){ }
                setShowPendingModal(false)
                setShowPendingBanner(false)
                fetchPayments().catch(()=>{})
              }
            }
        }catch(_){ }
      }, 1000)
      return ()=> clearInterval(tid)
      },[showPendingModal, showPendingBanner])

    async function cancelExistingBooking(){
      try{
        const op = sessionStorage.getItem('ongoingPaymentId')
        if(op){
            await axios.delete(`/api/payments/${op}`)
        }
      }catch(_){ }
      try{ sessionStorage.removeItem('recentPayment') }catch(_){ }
      try{ sessionStorage.removeItem('ongoingPaymentId') }catch(_){ }
      try{ sessionStorage.removeItem('pendingBanner') }catch(_){ }
      setShowPendingModal(false)
      setShowPendingBanner(false)
        try{
          // ensure bookings and payments are refreshed from server so UI reflects deletion
          await fetchBookings()
          await fetchPayments()
        }catch(_){ }
        try{ window.dispatchEvent(new Event('refreshPayments')) }catch(_){ }
    }
  // Listen for recentPaymentSaved custom event (fired from Payment page)
  useEffect(()=>{
    function handleRecent(e){
      try{
        const parsed = e && e.detail ? e.detail : null
        if(!parsed) return
        // recentPaymentSaved event (debug removed)
        const map = {}
        ;(parsed.slots||[]).forEach(s=>{
          const k = `${s.courtId}|${s.date}|${s.time}`
          map[k] = (parsed.status || 'PENDING').toUpperCase()
        })
        // only apply if not expired
        if(!parsed.expiry || Date.now() < parsed.expiry){
          setReservedMap(r=>({ ...(r||{}), ...map }))
        }
      }catch(_){ }
    }
    window.addEventListener('recentPaymentSaved', handleRecent)

    function handleRefresh(){
      try{ fetchPayments().catch(()=>{}) }catch(_){ }
    }
    window.addEventListener('refreshPayments', handleRefresh)

    return ()=>{
      window.removeEventListener('recentPaymentSaved', handleRecent)
      window.removeEventListener('refreshPayments', handleRefresh)
    }
  }, [])

  useEffect(()=>{
    axios.get('/api/courts')
      .then(r=>setCourts(r.data))
      .catch(()=>setCourts([]))
  },[])

  // fetch payment groups so we can mark pending vs approved reservations
  function fetchPayments(){
    return axios.get('/api/payments')
      .then(r=>{
        setPayments(r.data || [])
        // build reserved map: key = `${courtId}|${date}|${time}` -> status
        const map = {}
        ;(r.data || []).forEach(pg=>{
          const status = (pg.status || '').toUpperCase()
          (pg.slots || []).forEach(s=>{
            const k = `${s.courtId}|${s.date}|${s.time}`
            map[k] = status
          })
        })
        // Merge with any recent in-session payment so UI updates immediately
        try{
          const recent = sessionStorage.getItem('recentPayment')
          if(recent){
            const parsed = JSON.parse(recent)
            ;(parsed.slots||[]).forEach(s=>{
              const k = `${s.courtId}|${s.date}|${s.time}`
              // only merge if not expired
              if(!parsed.expiry || Date.now() < parsed.expiry){
                map[k] = (parsed.status || 'PENDING').toUpperCase()
              }
            })
          }
        }catch(_){ }
        // replace reservedMap with authoritative map from server
        setReservedMap(map)
      })
      .catch(()=>{
        // If fetching payments fails (e.g., backend down), don't clear existing
        // reservedMap — instead preserve any in-session recentPayment so the
        // pending UI remains visible and prevents double-booking in the UI.
        setPayments([])
        try{
          const recent = sessionStorage.getItem('recentPayment')
          if(recent){
            const parsed = JSON.parse(recent)
            const fallback = {}
            ;(parsed.slots||[]).forEach(s=>{
              const k = `${s.courtId}|${s.date}|${s.time}`
              if(!parsed.expiry || Date.now() < parsed.expiry){
                fallback[k] = (parsed.status || 'PENDING').toUpperCase()
              }
            })
            setReservedMap(prev => ({ ...(prev || {}), ...fallback }))
          }
        }catch(_){ }
      })
  }

  // If pending modal is shown, also apply immediate DOM fallback so the
  // grid visually shows pending slots even if React state hasn't updated yet.
  useEffect(()=>{
    if(!showPendingModal || !pendingPayment) return
    try{
      const slots = pendingPayment.slots || pendingPayment.selected || []
      slots.forEach(s => {
        const key = `${s.courtId}|${s.date}|${s.time}`
        const el = document.querySelector(`[data-slot-key="${key}"]`)
        if(el){
          el.classList.remove('selected')
          el.classList.remove('booked')
          if(!el.classList.contains('pending')) el.classList.add('pending')
          try{ el.textContent = 'Pending' }catch(_){ }
        }
      })
    }catch(_){ }
  }, [showPendingModal, pendingPayment])

  // clear selection if we were redirected from an expired payment
  useEffect(()=>{
    try{
      const exp = sessionStorage.getItem('expiredRedirect')
      if(exp){
        setSelected([])
        // refresh bookings/payments so pending markers are removed immediately
        try{ fetchBookings().catch(()=>{}) }catch(_){ }
        sessionStorage.removeItem('expiredRedirect')
      }
    }catch(_){ }
  },[])

  useEffect(()=>{
    // Periodically clear expired recentPayment entries so pending UI expires
    const tid = setInterval(()=>{
      try{
        const raw = sessionStorage.getItem('recentPayment')
        if(!raw) return
        const parsed = JSON.parse(raw)
        if(parsed && parsed.expiry && Date.now() >= parsed.expiry){
          // removed debug statement
          // refresh state from server to remove pending markers
          fetchPayments().catch(()=>{})
        }
      }catch(_){ }
    }, 1000)

    // refresh bookings and payments when date changes
    fetchBookings()
    fetchPayments()
    return ()=> clearInterval(tid)
  },[date])

  function fetchBookings(){
    setLoading(true)
    return axios.get('/api/bookings')
      .then(r=>{
        setBookings(r.data.filter(b=>b.date === date))
        return r.data
      })
      .catch(()=>{
        setBookings([])
        return []
      })
      .finally(()=>{
        setLoading(false)
        // also refresh payments after bookings settled
        fetchPayments().catch(()=>{})
      })
  }

  function isBooked(courtId, time){
    const key = `${courtId}|${date}|${time}`
    // if reserved by a payment, treat as booked (but UI will show Pending if status is PENDING)
    if(reservedMap[key]) return true
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

  // centralised submit helper to avoid duplicated code
  function submitBookings(slotsToHold = []){
    if(!slotsToHold || slotsToHold.length === 0) return
    setShowPricingModal(false)
    setLoading(true)
    setMsg('')
    const promises = slotsToHold.map(slot => axios.post('/api/bookings', {
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

  function openPricingModal(){ if(selected.length===0) return; setShowPricingModal(true) }
  
  return (
    <div>
      <div className="app-bg" style={{backgroundImage: bgUrl ? `url(${bgUrl})` : 'none'}} />
      <div className="app-container slotgrid-container">
      <header className="app-header slotgrid-header">
        <div className="brand-info">

      {showPendingModal && pendingPayment && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{maxWidth:560, position:'relative'}}>
            <button className="pending-modal-close" onClick={handleCloseToBanner} aria-label="Close">✕</button>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:44,height:44,borderRadius:22,background:'#eef6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#2a6fb9'}}>
                ℹ
              </div>
              <div style={{flex:1}}>
                <h3 style={{margin:'0 0 8px 0'}}>You have a pending booking</h3>
                <div style={{color:'#666'}}>You already have a pending booking that needs to be completed or cancelled before booking new slots.</div>

                <div style={{marginTop:12,padding:12,borderRadius:8,background:'#f8fbff',border:'1px solid #e6eef0'}}>
                  <div style={{fontWeight:800}}>Active Pending Booking</div>
                  <div style={{fontSize:13,color:'#666',marginTop:6}}>
                    You have {pendingPayment.slots ? pendingPayment.slots.length : (pendingPayment.selected ? pendingPayment.selected.length : 0)} slots reserved with a {Math.ceil((pendingPayment.expiry ? Math.max(0,(pendingPayment.expiry - Date.now())/60000) : 10))}-minute payment window.
                  </div>
                  {pendingSecondsLeft != null && (
                    <div style={{marginTop:8,fontWeight:700,color:'#0b6fb0'}}>Expires in: {formatTimer(pendingSecondsLeft)}</div>
                  )}
                </div>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14}}>
                  <div style={{color:'#666'}}>Please complete or cancel your existing booking before selecting new slots.</div>
                    <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setShowCancelConfirm(true)} style={{background:'#e53935',color:'#fff',border:'none',padding:'10px 14px',borderRadius:8}}>Cancel Existing Booking</button>
                    <button onClick={()=>{ setShowPendingModal(false); try{ window.location.hash = '#/payment' }catch(_){ } }} style={{background:'#144b48',color:'#fff',border:'none',padding:'10px 14px',borderRadius:8}}>Continue with Existing Booking</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
          <div className="brand-title">Downtown Kinaladkad</div>
          <div className="brand-sub">Pickleball Hub — Reserve your court</div>
        </div>
        <img src={Logo} alt="logo" className="header-logo" />
        <img src={Paddle} alt="paddle" className="header-paddle" />
      </header>

      {showPendingBanner && pendingPayment && (
        <div className="pending-top-banner">
          <div className="pending-banner-left">
            <div className="pending-banner-icon">🔔</div>
            <div>
              <div className="pending-banner-title">You have a pending booking!</div>
              <div className="pending-banner-sub">Complete your payment to secure your slots. {pendingSecondsLeft != null ? `Expires in ${formatTimer(pendingSecondsLeft)}` : ''}</div>
            </div>
          </div>
          <div className="pending-banner-actions">
            <button className="btn-resume" onClick={resumePayment}>Resume Payment</button>
            <button className="pending-banner-close" onClick={dismissBanner} aria-label="dismiss">✕</button>
          </div>
        </div>
      )}

      {/* Static legend / status chips for customer view (visual only) */}
      <div className="legend-row">
        <div className="legend-list">
          <span className="chip chip-available">Available</span>
          <span className="chip chip-selected">Selected</span>
          <span className="chip chip-pending">Pending</span>
          <span className="chip chip-booked">Booked</span>
        </div>
      </div>

      {/* top-left brand removed per request */}

      {/* Controls placed below header (normal flow) */}
      <div className="controls-row">
        <div className="date-picker">
          <div className="date-label">Date</div>
          <div className="date-control">
            <input className="date-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <button className="calendar-btn" onClick={(e)=>{ e.preventDefault(); document.querySelector('.date-input').showPicker?.() || document.querySelector('.date-input').focus() }} title="Choose date">📅</button>
          </div>
        </div>
        {/* hide top action controls when there are selected slots (we show a bottom floating panel instead) */}
        {/* Top action controls removed per request */}
      </div>

      <SlotGridView
        courts={courts}
        times={times}
        date={date}
        reservedMap={reservedMap}
        isBooked={isBooked}
        isSelected={isSelected}
        toggleSelect={toggleSelect}
      />

      {showPricingModal && (
        <BookingModal
          open={showPricingModal}
          onClose={()=>{ setShowPricingModal(false); setFormErrors({}) }}
          selected={selected}
          date={date}
          pricePerSlot={PRICE_PER_SLOT}
          courts={courts}
          times={times}
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
        />
      )}

      {showLimitModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="limit-modal-center">
              <div className="limit-icon">
                <span style={{fontSize:22,color:'#d98218'}}>⚠️</span>
              </div>
              <h3 className="limit-title">Booking Limit Exceeded</h3>
              <div className="limit-text">Maximum 6 slots per transaction. Please reduce your selection.</div>
              <div style={{width:'100%'}}>
                <button onClick={()=>setShowLimitModal(false)} className="limit-ok">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{textAlign:'center'}}>
              <h3 style={{marginTop:0}}>Are you sure?</h3>
              <div style={{color:'#666',marginTop:8}}>This will cancel your pending booking and release the slots so others can book them.</div>
              <div style={{display:'flex',justifyContent:'center',gap:10,marginTop:14}}>
                <button onClick={()=>setShowCancelConfirm(false)} className="btn">No, keep booking</button>
                <button onClick={async ()=>{ try{ await cancelExistingBooking() }catch(_){ } setShowCancelConfirm(false) }} className="btn btn-cancel">Yes, cancel booking</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUndo && (
        <div className="undo-toast">
          <div className="toast-success">Slots held — <button className="undo-btn" onClick={undoRecent}>Undo</button></div>
        </div>
      )}

      {/* Floating bar: selected count, total, proceed button */}
      {selected.length > 0 && (
        <div className="floating-bar">
          <div className="floating-bar-inner">
            <div className="floating-bar-left">
              <div className="label">{selected.length} selected</div>
              <div className="count">{selected.length} slots</div>
              <div className="total">&nbsp; / Total: <strong>₱{(PRICE_PER_SLOT * selected.length).toFixed(0)}</strong></div>
            </div>
            <div className="floating-bar-action">
              <button className="btn-proceed" onClick={openPricingModal} disabled={loading}>{loading ? 'Working...' : 'Proceed to Pay'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom floating selected panel — appears when user has selected slots */}
      {/* Floating selected panel removed per request */}

      {celebrate && <img src={Ball} className="flying-ball" alt="celebrate" />}
      {celebrate && <img src={Ball} className="flying-ball" alt="celebrate" />}
      </div>
    </div>
  )
}
