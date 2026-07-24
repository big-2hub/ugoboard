import { useState } from 'react'
import { CourtCanvas } from './court/CourtCanvas'
import { miniBasketballCourt } from './court/court-config'

export default function App() {
  const [view, setView] = useState<'half' | 'full'>('half')
  return <main className="app-shell">
    <header className="app-header">
      <div><p className="eyebrow">MINI BASKETBALL TACTICS</p><h1>UgoBoard</h1></div>
      <div className="view-toggle" role="group" aria-label="コート表示">
        <button type="button" className={view === 'half' ? 'active' : ''} aria-pressed={view === 'half'} onClick={() => setView('half')}>ハーフ</button>
        <button type="button" className={view === 'full' ? 'active' : ''} aria-pressed={view === 'full'} onClick={() => setView('full')}>フル</button>
      </div>
    </header>
    <section className="board-card" aria-label={`${miniBasketballCourt.name} ${view === 'half' ? 'ハーフ' : 'フル'}表示`}>
      <CourtCanvas config={miniBasketballCourt} view={view}/>
    </section>
    <footer><span className="status-dot"/>{miniBasketballCourt.name} · 28m × 15m</footer>
  </main>
}
