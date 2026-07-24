import { PlaceholderCard } from '../components/PlaceholderCard'

export function PlaybackPage() {
  return (
    <div className="page-content">
      <header className="page-heading"><div><p className="section-label">PLAYBACK</p><h1>再生ビュー</h1></div></header>
      <PlaceholderCard icon="▶" title="動きを再生" description="作戦を選ぶと、ここにアニメーションが表示されます。" />
      <section className="control-placeholder" aria-label="再生コントロール">
        <button type="button">|◀</button><button type="button" className="play-button">▶</button><button type="button">▶|</button>
        <button type="button" className="speed-button">1.0×</button>
      </section>
    </div>
  )
}
