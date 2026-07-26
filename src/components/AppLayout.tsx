import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useUnsavedNavigation } from '../navigation/unsaved-navigation'

const navigation = [
  { to: '/', label: 'ホーム', icon: '⌂', end: true },
  { to: '/editor', label: '作戦盤', icon: '▦' },
  { to: '/playback', label: '再生', icon: '▶' },
  { to: '/roster', label: '選手', icon: '●' },
  { to: '/settings', label: '設定', icon: '⚙' },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { attemptNavigation } = useUnsavedNavigation()

  return (
    <div className="app-frame">
      <header className="top-bar">
        <div>
          <p className="eyebrow">MINI BASKETBALL TACTICS</p>
          <p className="brand">UgoBoard</p>
        </div>
        <span className="offline-badge"><span aria-hidden="true" />オフライン対応</span>
      </header>

      <main className="page-stage">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="メインナビゲーション">
        {navigation.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => isActive ? 'active' : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              if (attemptNavigation(to)) {
                event.preventDefault()
                return
              }
              event.preventDefault()
              navigate(to)
            }}
          >
            <span className="nav-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
