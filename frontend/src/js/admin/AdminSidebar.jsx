import React, { useState } from 'react'
import Logo from '../../assets/logo.svg'

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)
const IconCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
// calendar and courts temporarily removed to focus on payments

export default function Sidebar({ section, setSection }) {
  const [bookingOpen, setBookingOpen] = useState(true)

  return (
    <aside className="adm-sidebar">
      <div className="adm-logo-wrap">
        <img src={Logo} alt="logo" className="adm-logo" />
      </div>

      <nav className="adm-nav">
        <button className="adm-nav-item" onClick={() => { window.location.hash = '#/' }}>
          <IconHome /> <span>Homepage</span>
        </button>

        <button
          className={`adm-nav-item adm-nav-group ${bookingOpen ? 'open' : ''}`}
          onClick={() => setBookingOpen(o => !o)}
        >
          <IconBook /> <span>Booking Management</span>
          <span className="adm-nav-arrow">{bookingOpen ? '❯' : '❯'}</span>
        </button>

        {bookingOpen && (
          <div className="adm-nav-sub">
            <button
              className={`adm-nav-item adm-nav-subitem ${section === 'payments' ? 'active' : ''}`}
              onClick={() => setSection('payments')}
            >
              <IconCard /> <span>Payment Management</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  )
}
