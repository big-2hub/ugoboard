import { PlaceholderCard } from '../components/PlaceholderCard'

export function SettingsPage() {
  return (
    <div className="page-content">
      <header className="page-heading"><div><p className="section-label">SETTINGS</p><h1>設定</h1></div></header>
      <div className="settings-grid">
        <PlaceholderCard icon="▦" title="コート設定" description="現在：JBA U12 ミニバスコート（28m × 15m）" action="コートを選択" />
        <PlaceholderCard icon="⇄" title="データ入出力" description="JSON形式でバックアップ・端末移行ができます。" action="準備中" />
      </div>
    </div>
  )
}
