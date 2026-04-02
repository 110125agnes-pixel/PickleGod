import React, { useState, useEffect } from 'react'
import SlotGrid from './components/SlotGrid'
import Payment from './pages/Payment'
import Admin from './pages/Admin'

export default function App(){
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(()=>{
    const onHash = ()=> setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  if(route.startsWith('#/payment')){
    return <Payment />
  }
  if(route.startsWith('#/admin')){
    return <Admin />
  }
  return <SlotGrid />
}
