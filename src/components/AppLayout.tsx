import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/', label: 'ホーム', icon: '⌂', end: true },
  { to: '/editor', label: '作戦盤', icon: '▦' },
  { to: '/playback', label: '再生', icon: '▶' },
  { to: '/roster', label: '選手', icon: '●' },
  { to: '/settings', label: '設定', icon: '⚙' },
]

export function AppLayout() {
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
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'active' : undefined}>
            <span className="nav-icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
