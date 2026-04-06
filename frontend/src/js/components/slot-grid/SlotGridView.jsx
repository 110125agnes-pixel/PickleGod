import React from 'react'
import SlotCell from './SlotCell'

export default function SlotGridView({ courts, times, date, reservedMap, isBooked, isSelected, toggleSelect }){
  return (
    <div className="slot-grid">
      <div className="grid-header">
        <div className="time-col">TIME</div>
        {courts.map(c => <div key={c.id} className="court-col">{c.name}</div>)}
      </div>
      <div className="grid-body">
        {times.map(t=> (
          <div key={t.time} className="grid-row">
            <div className="time-col">{t.label}</div>
            {courts.map(c=>{
              const key = `${c.id}|${date}|${t.time}`
              const reservedStatus = reservedMap[key] || null
              const booked = isBooked ? isBooked(c.id, t.time) : false
              const sel = isSelected ? isSelected(c.id, t.time) : false
              const classes = ['cell']
              if(reservedStatus === 'PENDING') classes.push('pending')
              else if(reservedStatus === 'APPROVED' || reservedStatus === 'BOOKED') classes.push('booked')
              else if(sel) classes.push('selected')
              const label = reservedStatus === 'PENDING' ? 'Pending' : (reservedStatus === 'APPROVED' || reservedStatus === 'BOOKED' ? 'Booked' : (sel ? 'Selected' : (t.display || t.time)))
              return <SlotCell key={c.id} slotKey={key} className={classes} label={label} onClick={()=>toggleSelect(c.id, t.time)} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
