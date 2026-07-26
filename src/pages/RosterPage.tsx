import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Roster } from '../db/database'
import {
  addPlayer,
  createRoster,
  deletePlayer,
  deleteRoster,
  listRosterPlayers,
  listRosters,
  renameRoster,
  reorderPlayers,
  updatePlayer,
} from '../db/roster-repository'
import { resizePlayerPhoto } from '../roster/resize-player-photo'

type DialogState =
  | { type: 'roster'; roster?: Roster; name: string }
  | { type: 'player'; player?: Player; displayName: string; jerseyNumber: string; photo?: Blob }
  | { type: 'delete-roster'; roster: Roster }
  | { type: 'delete-player'; player: Player }

function usePhotoUrl(photo?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(photo)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [photo])
  return url
}

function PlayerPhoto({ player }: { player: Player }) {
  const url = usePhotoUrl(player.photo)
  if (url) return <img src={url} alt="" />
  return <span aria-hidden="true">{player.displayName || player.jerseyNumber || '？'}</span>
}

export function RosterPage() {
  const [rosters, setRosters] = useState<Roster[]>([])
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [dialog, setDialog] = useState<DialogState>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialogViewport, setDialogViewport] = useState<{ height: number; offsetTop: number }>()
  const playerDialogRef = useRef<HTMLElement>(null)
  const jerseyInputRef = useRef<HTMLInputElement>(null)
  const savePlayerButtonRef = useRef<HTMLButtonElement>(null)
  const selectedRoster = useMemo(
    () => rosters.find((roster) => roster.id === selectedRosterId),
    [rosters, selectedRosterId],
  )
  const dialogPhotoUrl = usePhotoUrl(dialog?.type === 'player' ? dialog.photo : undefined)

  const refreshRosters = async (preferredId?: string) => {
    const next = await listRosters()
    setRosters(next)
    setSelectedRosterId((current) => {
      const desired = preferredId ?? current
      return next.some((roster) => roster.id === desired) ? desired : next[0]?.id ?? ''
    })
  }

  useEffect(() => {
    void refreshRosters()
  }, [])

  useEffect(() => {
    if (!selectedRosterId) {
      setPlayers([])
      return
    }
    let active = true
    listRosterPlayers(selectedRosterId).then((next) => {
      if (active) setPlayers(next)
    })
    return () => { active = false }
  }, [selectedRosterId])

  useEffect(() => {
    if (dialog?.type !== 'player') {
      setDialogViewport(undefined)
      return
    }
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      setDialogViewport({ height: viewport.height, offsetTop: viewport.offsetTop })
      window.setTimeout(() => {
        const active = document.activeElement
        if (active instanceof HTMLElement && playerDialogRef.current?.contains(active)) {
          active.scrollIntoView({ block: 'center' })
        }
      }, 80)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [dialog?.type])

  const refreshPlayers = async () => {
    if (selectedRosterId) setPlayers(await listRosterPlayers(selectedRosterId))
  }

  const selectRoster = (rosterId: string) => {
    setPlayers([])
    setSelectedRosterId(rosterId)
  }

  const keepFieldVisible = (element: HTMLElement) => {
    window.setTimeout(() => element.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
  }

  const submitRoster = async () => {
    if (dialog?.type !== 'roster' || !dialog.name.trim()) return
    setBusy(true)
    try {
      if (dialog.roster) {
        await renameRoster(dialog.roster.id, dialog.name)
        await refreshRosters(dialog.roster.id)
      } else {
        const roster = await createRoster(dialog.name)
        await refreshRosters(roster.id)
      }
      setDialog(undefined)
    } finally {
      setBusy(false)
    }
  }

  const submitPlayer = async () => {
    if (dialog?.type !== 'player' || !selectedRosterId) return
    if (!dialog.displayName.trim() && !dialog.jerseyNumber.trim()) {
      setMessage('表示名か背番号を入力してください')
      return
    }
    setBusy(true)
    try {
      const input = {
        displayName: dialog.displayName,
        jerseyNumber: dialog.jerseyNumber,
        photo: dialog.photo,
      }
      if (dialog.player) await updatePlayer(dialog.player.id, input)
      else await addPlayer(selectedRosterId, input)
      await refreshPlayers()
      await refreshRosters(selectedRosterId)
      setDialog(undefined)
    } finally {
      setBusy(false)
    }
  }

  const movePlayer = async (index: number, offset: -1 | 1) => {
    if (!selectedRosterId) return
    const target = index + offset
    if (target < 0 || target >= players.length) return
    const ids = players.map((player) => player.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    await reorderPlayers(selectedRosterId, ids)
    await refreshPlayers()
  }

  const handlePhoto = async (file?: File) => {
    if (!file || dialog?.type !== 'player') return
    setBusy(true)
    try {
      const photo = await resizePlayerPhoto(file)
      setDialog((current) => current?.type === 'player' ? { ...current, photo } : current)
      setMessage('写真を端末内保存用に縮小しました')
    } catch {
      setMessage('写真を読み込めませんでした。別の画像を選んでください')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-content roster-page">
      <header className="page-heading">
        <div><p className="section-label">TEAM ROSTER</p><h1>選手管理</h1></div>
        <button type="button" className="primary-button" onClick={() => setDialog({ type: 'roster', name: '' })}>＋ チーム作成</button>
      </header>

      <p className="privacy-note">🔒 顔写真はこの端末内だけに保存され、共有用データには含まれません。</p>
      {message && <p className="roster-message" role="status">{message}</p>}

      {rosters.length === 0 ? (
        <section className="library-empty roster-empty">
          <span aria-hidden="true">●</span>
          <p>チームを作成すると、選手の表示名・背番号・顔写真を登録できます。</p>
        </section>
      ) : (
        <>
          <section className="roster-selector" aria-label="チームロスター">
            <label>チーム
              <select value={selectedRosterId} onChange={(event) => selectRoster(event.target.value)}>
                {!selectedRosterId && <option value="">チームを選択</option>}
                {rosters.map((roster) => <option key={roster.id} value={roster.id}>{roster.teamName}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => selectedRoster && setDialog({ type: 'roster', roster: selectedRoster, name: selectedRoster.teamName })}>名前変更</button>
            <button type="button" className="danger-tool" onClick={() => selectedRoster && setDialog({ type: 'delete-roster', roster: selectedRoster })}>チーム削除</button>
            <button type="button" className="primary-button" onClick={() => setDialog({ type: 'player', displayName: '', jerseyNumber: '' })}>＋ 選手追加</button>
            <div className="roster-tab-list" role="tablist" aria-label="登録済みチーム一覧">
              {rosters.map((roster) => (
                <button
                  key={roster.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedRosterId === roster.id}
                  className={selectedRosterId === roster.id ? 'active' : ''}
                  onClick={() => selectRoster(roster.id)}
                >
                  {roster.teamName}
                </button>
              ))}
            </div>
          </section>

          <section className="player-list" aria-label={`${selectedRoster?.teamName ?? ''}の選手`}>
            {players.length === 0 && <p className="player-empty">まだ選手がいません。「選手追加」から登録してください。</p>}
            {players.map((player, index) => (
              <article className="player-card" key={player.id}>
                <div className="player-avatar"><PlayerPhoto player={player} /></div>
                <div className="player-summary">
                  <strong>{player.displayName || '表示名なし'}</strong>
                  <span>{player.jerseyNumber ? `背番号 ${player.jerseyNumber}` : '背番号なし'}</span>
                </div>
                <div className="player-order" aria-label={`${player.displayName || player.jerseyNumber}の並び替え`}>
                  <button type="button" disabled={index === 0} onClick={() => void movePlayer(index, -1)} aria-label="1つ上へ">↑</button>
                  <button type="button" disabled={index === players.length - 1} onClick={() => void movePlayer(index, 1)} aria-label="1つ下へ">↓</button>
                </div>
                <div className="player-actions">
                  <button type="button" onClick={() => setDialog({
                    type: 'player',
                    player,
                    displayName: player.displayName,
                    jerseyNumber: player.jerseyNumber,
                    photo: player.photo,
                  })}>編集</button>
                  <button type="button" className="danger-tool" onClick={() => setDialog({ type: 'delete-player', player })}>削除</button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {dialog?.type === 'roster' && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm save-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-dialog-title">
            <h2 id="roster-dialog-title">{dialog.roster ? 'チーム名を変更' : 'チームを作成'}</h2>
            <label>チーム名<input value={dialog.name} onChange={(event) => setDialog({ ...dialog, name: event.target.value })} /></label>
            <div>
              <button type="button" onClick={() => setDialog(undefined)}>キャンセル</button>
              <button type="button" className="confirm-save" disabled={busy || !dialog.name.trim()} onClick={() => void submitRoster()}>保存する</button>
            </div>
          </section>
        </div>
      )}

      {dialog?.type === 'player' && (
        <div
          className="confirm-backdrop keyboard-aware"
          role="presentation"
          style={dialogViewport ? {
            top: `${dialogViewport.offsetTop}px`,
            bottom: 'auto',
            height: `${dialogViewport.height}px`,
          } : undefined}
        >
          <section ref={playerDialogRef} className="clear-confirm save-dialog player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-dialog-title">
            <h2 id="player-dialog-title">{dialog.player ? '選手を編集' : '選手を追加'}</h2>
            <label>表示名（短い文字）
              <input
                maxLength={8}
                enterKeyHint="next"
                value={dialog.displayName}
                onFocus={(event) => keepFieldVisible(event.currentTarget)}
                onChange={(event) => setDialog({ ...dialog, displayName: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  jerseyInputRef.current?.focus()
                }}
                placeholder="例：ユウ"
              />
            </label>
            <label>背番号
              <input
                ref={jerseyInputRef}
                inputMode="numeric"
                enterKeyHint="done"
                maxLength={3}
                value={dialog.jerseyNumber}
                onFocus={(event) => keepFieldVisible(event.currentTarget)}
                onChange={(event) => setDialog({ ...dialog, jerseyNumber: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  event.currentTarget.blur()
                  keepFieldVisible(savePlayerButtonRef.current ?? event.currentTarget)
                }}
                placeholder="例：7"
              />
            </label>
            <label>端末から顔写真を選択
              <input type="file" accept="image/*" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
            </label>
            <label>カメラで顔写真を撮影
              <input type="file" accept="image/*" capture="environment" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
            </label>
            {dialog.photo && (
              <div className="photo-preview">
                {dialogPhotoUrl && <img src={dialogPhotoUrl} alt="選択した顔写真の確認" />}
                <button type="button" onClick={() => setDialog({ ...dialog, photo: undefined })}>写真を外す</button>
              </div>
            )}
            <p>写真は最大256pxへ縮小し、この端末のブラウザ内だけに保存します。</p>
            <div>
              <button type="button" onClick={() => setDialog(undefined)}>キャンセル</button>
              <button ref={savePlayerButtonRef} type="button" className="confirm-save" disabled={busy || (!dialog.displayName.trim() && !dialog.jerseyNumber.trim())} onClick={() => void submitPlayer()}>保存する</button>
            </div>
          </section>
        </div>
      )}

      {dialog?.type === 'delete-roster' && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-roster-title">
            <h2 id="delete-roster-title">「{dialog.roster.teamName}」を削除しますか？</h2>
            <p>登録した選手もこの端末から削除されます。作戦の配置と座標は残ります。</p>
            <div>
              <button type="button" onClick={() => setDialog(undefined)}>キャンセル</button>
              <button type="button" className="confirm-delete" onClick={async () => {
                await deleteRoster(dialog.roster.id)
                setDialog(undefined)
                await refreshRosters()
              }}>削除する</button>
            </div>
          </section>
        </div>
      )}

      {dialog?.type === 'delete-player' && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-player-title">
            <h2 id="delete-player-title">この選手を削除しますか？</h2>
            <p>{dialog.player.displayName || `背番号 ${dialog.player.jerseyNumber}`}をロスターから削除します。</p>
            <div>
              <button type="button" onClick={() => setDialog(undefined)}>キャンセル</button>
              <button type="button" className="confirm-delete" onClick={async () => {
                await deletePlayer(dialog.player.id)
                setDialog(undefined)
                await refreshPlayers()
              }}>削除する</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
