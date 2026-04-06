import React from 'react'

export default function SlotCell({ slotKey, className, label, onClick }){
  const cn = Array.isArray(className) ? className.join(' ') : (className || '')
  return (
    <div key={slotKey} data-slot-key={slotKey} className={cn} onClick={onClick}>
      {label}
    </div>
  )
}
