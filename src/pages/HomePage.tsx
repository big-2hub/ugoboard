import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Play, PlayType } from '../db/database'
import { deletePlay, duplicatePlay, listPlays, updatePlayMetadata } from '../db/play-repository'
import { collectPlayTags, filterPlays } from '../library/play-library'

type EditForm = { id: string; name: string; type: PlayType; tags: string }

export function HomePage() {
  const [plays, setPlays] = useState<Play[]>([])
  const [typeFilter, setTypeFilter] = useState<'all' | PlayType>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [editForm, setEditForm] = useState<EditForm>()
  const [deleteTarget, setDeleteTarget] = useState<Play>()
  const [message, setMessage] = useState('')

  const refresh = async () => setPlays(await listPlays())
  useEffect(() => { void refresh() }, [])
  const tags = useMemo(() => collectPlayTags(plays), [plays])
  const visiblePlays = useMemo(
    () => filterPlays(plays, { type: typeFilter, tag: tagFilter }),
    [plays, tagFilter, typeFilter],
  )

  const duplicate = async (play: Play) => {
    await duplicatePlay(play.id)
    setMessage(`「${play.name}」を複製しました`)
    await refresh()
  }

  const saveMetadata = async () => {
    if (!editForm?.name.trim()) return
    await updatePlayMetadata(editForm.id, {
      name: editForm.name,
      type: editForm.type,
      tags: editForm.tags.split(/[,、]/),
    })
    setEditForm(undefined)
    await refresh()
  }

  const remove = async () => {
    if (!deleteTarget) return
    await deletePlay(deleteTarget.id)
    setMessage(`「${deleteTarget.name}」を削除しました`)
    setDeleteTarget(undefined)
    await refresh()
  }

  return (
    <div className="page-content library-page">
      <header className="page-heading">
        <div><p className="section-label">PLAY LIBRARY</p><h1>作戦とドリル</h1></div>
        <Link className="primary-button" to="/editor">＋ 新規作成</Link>
      </header>
      <div className="library-filters" aria-label="一覧フィルター">
        <div className="filter-row">
          {([['all', 'すべて'], ['play', '作戦'], ['drill', '練習ドリル']] as const).map(([value, label]) => (
            <button key={value} type="button" className={`filter-chip${typeFilter === value ? ' active' : ''}`} onClick={() => setTypeFilter(value)}>{label}</button>
          ))}
        </div>
        <label>タグ
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="">すべて</option>
            {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </label>
      </div>

      {message && <p className="library-message" role="status">{message}</p>}
      {visiblePlays.length === 0 ? (
        <section className="library-empty">
          <span aria-hidden="true">↗</span>
          <h2>{plays.length ? '条件に合う作戦はありません' : '最初の作戦を作りましょう'}</h2>
          <p>{plays.length ? 'フィルターを変更してください。' : '作成した内容は、保存ボタンでこの端末へ保存できます。'}</p>
        </section>
      ) : (
        <div className="play-list">
          {visiblePlays.map((play) => (
            <article className="play-card" key={play.id}>
              <div className="play-card-main">
                <span className={`play-type ${play.type}`}>{play.type === 'play' ? '作戦' : '練習ドリル'}</span>
                <h2>{play.name}</h2>
                <time dateTime={play.updatedAt}>更新 {new Date(play.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                {play.tags.length > 0 && <div className="play-tags">{play.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
              </div>
              <div className="play-card-actions">
                <Link className="primary-button" to={`/editor/${play.id}`}>開く</Link>
                <button type="button" onClick={() => void duplicate(play)}>複製</button>
                <button type="button" onClick={() => setEditForm({ id: play.id, name: play.name, type: play.type, tags: play.tags.join(', ') })}>情報編集</button>
                <button type="button" className="danger-tool" onClick={() => setDeleteTarget(play)}>削除</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editForm && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm save-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-play-title">
            <h2 id="edit-play-title">作戦情報を編集</h2>
            <label>名前<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} autoFocus /></label>
            <label>種別<select value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value as PlayType })}><option value="play">作戦</option><option value="drill">練習ドリル</option></select></label>
            <label>タグ（カンマ区切り）<input value={editForm.tags} onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })} /></label>
            <div><button type="button" onClick={() => setEditForm(undefined)}>キャンセル</button><button type="button" className="confirm-save" disabled={!editForm.name.trim()} onClick={() => void saveMetadata()}>保存</button></div>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-play-title">
            <h2 id="delete-play-title">「{deleteTarget.name}」を削除しますか？</h2>
            <p>全ステップと描画も削除されます。この操作は元に戻せません。</p>
            <div><button type="button" onClick={() => setDeleteTarget(undefined)}>キャンセル</button><button type="button" className="confirm-delete" onClick={() => void remove()}>削除する</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
