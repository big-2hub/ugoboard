import { Link } from 'react-router-dom'
import { PlaceholderCard } from '../components/PlaceholderCard'

export function HomePage() {
  return (
    <div className="page-content">
      <header className="page-heading">
        <div><p className="section-label">PLAY LIBRARY</p><h1>作戦とドリル</h1></div>
        <Link className="primary-button" to="/editor">＋ 新規作成</Link>
      </header>
      <div className="filter-row" aria-label="一覧フィルター">
        <button type="button" className="filter-chip active">すべて</button>
        <button type="button" className="filter-chip">作戦</button>
        <button type="button" className="filter-chip">練習ドリル</button>
      </div>
      <PlaceholderCard icon="↗" title="最初の作戦を作りましょう" description="保存した作戦と練習ドリルがここに並びます。" action="一覧機能は次のステップで実装" />
    </div>
  )
}
