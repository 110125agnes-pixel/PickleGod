import React from 'react'
import Sidebar from './AdminSidebar'

export default function AdminLayout({ section, setSection, children }) {
  return (
    <div className="adm-layout">
      <Sidebar section={section} setSection={setSection} />
      <main className="adm-main">{children}</main>
    </div>
  )
}
