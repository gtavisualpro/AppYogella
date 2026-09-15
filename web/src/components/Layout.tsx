import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  )
}

export function TabLayout() {
  return (
    <>
      <div className="app-main">
        <Outlet />
      </div>
      <TabBar />
    </>
  )
}

export function BareLayout() {
  return (
    <div className="app-main no-tabbar">
      <Outlet />
    </div>
  )
}
