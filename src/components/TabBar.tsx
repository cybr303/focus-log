import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import './TabBar.css'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/modules', label: 'Modules', icon: 'book' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/insights', label: 'Insights', icon: 'sparkles' },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tabbar-item">
          <Icon name={t.icon} size={26} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
