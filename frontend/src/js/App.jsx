import React, { useState, useEffect } from 'react'
import SlotGrid from './components/SlotGrid'
import CustomerPayment from './pages/CustomerPayment'
import Admin from './admin/Admin'

export default function App(){
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(()=>{
    const onHash = ()=> setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  if(route.startsWith('#/payment')){
    return <CustomerPayment />
  }
  if(route.startsWith('#/admin')){
    return <Admin />
  }
  return <SlotGrid />
}
