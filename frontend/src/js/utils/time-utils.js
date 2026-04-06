export function timesBetween(startHour = 9, endHour = 23) {
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

export function formatTimer(s){
  if(s == null) return ''
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const sec = (s%60).toString().padStart(2,'0')
  return `${m}:${sec}`
}
