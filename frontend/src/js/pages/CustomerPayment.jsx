import React, { useEffect, useState } from 'react'
import PaymentForm from '../components/PaymentForm'

export default function CustomerPayment(){
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
    if(secondsLeft === 0){
      setMsg('Payment time expired. Redirecting to bookings...')
      try{
        sessionStorage.removeItem('bookingDraft')
        sessionStorage.setItem('expiredRedirect','1')
      }catch(_){ }
      setTimeout(()=>{ window.location.hash = '#/'; }, 800)
    }
  },[secondsLeft])

  if(draft === null) return (
    <div style={{maxWidth:720,margin:'40px auto',padding:20}}>
      <h3>No booking draft found</h3>
      <p>Please select slots and press "Hold Slots" to continue.</p>
      <button onClick={()=>{ window.location.hash = '#/'; }}>Back</button>
    </div>
  )

  return (
    <PaymentForm
      draft={draft}
      secondsLeft={secondsLeft}
      receipt={receipt}
      setReceipt={setReceipt}
      setMsg={setMsg}
      setLoading={setLoading}
    />
  )
}
