import { NavLink } from 'react-router-dom'
import { IconHome, IconSearch, IconPulse, IconHeart, IconUser } from './icons'

const TABS = [
  { to: '/home', label: 'Accueil', Icon: IconHome, end: true },
  { to: '/recherche', label: 'Recherche', Icon: IconSearch },
  { to: '/pratique', label: 'Ma pratique', Icon: IconPulse },
  { to: '/favoris', label: 'Favoris', Icon: IconHeart },
  { to: '/profil', label: 'Profil', Icon: IconUser },
]

export function TabBar() {
  return (
    <div className="tabbar">
      <div className="tabs">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
            <Icon size={21} strokeWidth={2.4} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
