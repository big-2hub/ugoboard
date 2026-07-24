import { PlaceholderCard } from '../components/PlaceholderCard'

export function RosterPage() {
  return (
    <div className="page-content">
      <header className="page-heading">
        <div><p className="section-label">TEAM ROSTER</p><h1>選手管理</h1></div>
        <button type="button" className="primary-button">＋ 選手追加</button>
      </header>
      <PlaceholderCard icon="●" title="選手はまだいません" description="頭文字・背番号・端末内の顔写真を登録できます。" action="選手登録は次のステップで実装" />
    </div>
  )
}
