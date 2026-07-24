import { useState } from 'react'
import { CourtCanvas } from '../court/CourtCanvas'
import { miniBasketballCourt } from '../court/court-config'

export function EditorPage() {
  const [view, setView] = useState<'half' | 'full'>('half')
  return (
    <div className="editor-page">
      <header className="editor-heading">
        <div><p className="section-label">EDITOR</p><h1>作戦盤</h1></div>
        <div className="view-toggle" role="group" aria-label="コート表示">
          <button type="button" className={view === 'half' ? 'active' : ''} aria-pressed={view === 'half'} onClick={() => setView('half')}>ハーフ</button>
          <button type="button" className={view === 'full' ? 'active' : ''} aria-pressed={view === 'full'} onClick={() => setView('full')}>フル</button>
        </div>
      </header>
      <div className="editor-workspace">
        <aside className="tool-placeholder" aria-label="編集ツール">
          <button type="button">選手</button>
          <button type="button">ボール</button>
          <button type="button">ペン</button>
          <button type="button">矢印</button>
        </aside>
        <section className="board-card" aria-label={`${miniBasketballCourt.name} ${view === 'half' ? 'ハーフ' : 'フル'}表示`}>
          <CourtCanvas config={miniBasketballCourt} view={view} />
        </section>
      </div>
      <div className="step-placeholder"><span>ステップ 1</span><button type="button">＋ ステップ追加</button></div>
    </div>
  )
}
