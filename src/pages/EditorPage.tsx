import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { miniBasketballCourt, type Point } from '../court/court-config'
import type { DrawingType, IconKind, Player, PlayType, Roster } from '../db/database'
import { CourtEditorCanvas } from '../editor/CourtEditorCanvas'
import {
  chooseDrawing,
  choosePlacement,
  canOpenAssignment,
  closeDrawingPalette,
  finishPlacementFlow,
  resetForStepOperation,
  type StepOperation,
} from '../editor/editor-tool-mode'
import { drawingModes, useEditorState } from '../editor/use-editor-state'
import {
  canPlaceIcon,
  countIconsOfKind,
  ICON_PLACEMENT_LIMITS,
  reachesPlacementLimitAfterAdd,
  shouldShowPlacementLimitMessage,
} from '../editor/icon-placement-limits'
import { decideBallPlacement, shouldEndPlacementAfterAdd } from '../editor/icon-placement'
import { useStepPlayback } from '../editor/use-step-playback'
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '../editor/step-playback'
import { loadPlayDocument, savePlayDocument } from '../db/play-repository'
import {
  createEditorFingerprint,
  hasUnsavedEditorChanges,
  requiresLeaveConfirmation,
  type SaveableEditorState,
} from '../editor/editor-save-state'
import { useUnsavedNavigation } from '../navigation/unsaved-navigation'
import { listRosterPlayers, listRosters } from '../db/roster-repository'
import { decoratePlayerIcons } from '../editor/player-icon-display'

type OpenPalette = 'placement' | 'drawing' | 'menu'

const iconTools: Array<{ kind: IconKind; label: string; symbol: string }> = [
  { kind: 'offense', label: '攻撃', symbol: 'O' },
  { kind: 'defense', label: '守備', symbol: 'D' },
  { kind: 'ball', label: 'ボール', symbol: '●' },
  { kind: 'cone', label: 'コーン', symbol: '▲' },
  { kind: 'chair', label: '椅子', symbol: '▣' },
]

const drawingLabels: Record<DrawingType, string> = {
  freehand: 'フリーハンド',
  line: '直線',
  arrow: '移動',
  pass: 'パス',
  dribble: 'ドリブル',
}

function useLandscape() {
  const [landscape, setLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches)
  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape)')
    const update = () => setLandscape(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return landscape
}

export function EditorPage() {
  const { playId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { registerLeaveRequestHandler } = useUnsavedNavigation()
  const [view, setView] = useState<'half' | 'full'>('half')
  const [openPalette, setOpenPalette] = useState<OpenPalette>()
  const [placementKind, setPlacementKind] = useState<IconKind>()
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [showStepDeleteConfirmation, setShowStepDeleteConfirmation] = useState(false)
  const [toast, setToast] = useState<string>()
  const [savedPlayId, setSavedPlayId] = useState(playId)
  const [playName, setPlayName] = useState('')
  const [playType, setPlayType] = useState<PlayType>('play')
  const [tagsText, setTagsText] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveState, setSaveState] = useState<'loading' | 'saving' | 'saved' | 'error'>(playId ? 'loading' : 'saved')
  const [savedFingerprint, setSavedFingerprint] = useState('')
  const [pendingDestination, setPendingDestination] = useState<string>()
  const [destinationAfterFirstSave, setDestinationAfterFirstSave] = useState<string>()
  const [rosterId, setRosterId] = useState<string>()
  const [rosters, setRosters] = useState<Roster[]>([])
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([])
  const [playerPhotoUrls, setPlayerPhotoUrls] = useState<Map<string, string>>(new Map())
  const loadedRef = useRef(!playId)
  const saveSequence = useRef(0)
  const landscape = useLandscape()
  const editor = useEditorState()
  const playback = useStepPlayback(editor.steps, () => {
    const lastStep = editor.steps.at(-1)
    if (lastStep) editor.selectStep(lastStep.id)
  })
  const drawingMode = drawingModes.some((tool) => tool.type === editor.mode)
    ? editor.mode as DrawingType
    : undefined
  const placementLabel = iconTools.find((tool) => tool.kind === placementKind)?.label
  const sourceIcons = playback.icons ?? editor.icons
  const displayedIcons = useMemo(
    () => decoratePlayerIcons(sourceIcons, rosterPlayers, playerPhotoUrls),
    [playerPhotoUrls, rosterPlayers, sourceIcons],
  )
  const selectedPlayerIcon = editor.icons.find((icon) =>
    icon.id === editor.selectedIconId && (icon.kind === 'offense' || icon.kind === 'defense'))
  const saveableState: SaveableEditorState = {
    steps: editor.steps,
    drawings: editor.drawings,
    courtView: view,
    loopPlayback: playback.loop,
    rosterId,
  }
  const hasUnsavedChanges = savedFingerprint
    ? hasUnsavedEditorChanges(savedFingerprint, saveableState)
    : false

  useEffect(() => {
    listRosters().then(setRosters)
  }, [])

  useEffect(() => {
    if (!rosterId) {
      setRosterPlayers([])
      return
    }
    let active = true
    listRosterPlayers(rosterId).then((players) => {
      if (active) setRosterPlayers(players)
    })
    return () => { active = false }
  }, [rosterId])

  useEffect(() => {
    const urls = new Map<string, string>()
    rosterPlayers.forEach((player) => {
      if (player.photo) urls.set(player.id, URL.createObjectURL(player.photo))
    })
    setPlayerPhotoUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [rosterPlayers])

  useEffect(() => {
    if (!playId && !savedFingerprint) setSavedFingerprint(createEditorFingerprint(saveableState))
    // 新規作成時の最初の状態だけを保存基準にする。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!playId) return
    let active = true
    loadPlayDocument(playId).then((document) => {
      if (!active) return
      if (!document) {
        navigate('/', { replace: true })
        return
      }
      editor.loadDocument(document.steps, document.drawings)
      setPlayName(document.play.name)
      setPlayType(document.play.type)
      setTagsText(document.play.tags.join(', '))
      setView(document.play.courtView)
      setRosterId(document.play.rosterId)
      playback.setLoop(document.play.loopPlayback)
      setSavedPlayId(document.play.id)
      setSavedFingerprint(createEditorFingerprint({
        steps: document.steps,
        drawings: document.drawings,
        courtView: document.play.courtView,
        loopPlayback: document.play.loopPlayback,
        rosterId: document.play.rosterId,
      }))
      setSaveState('saved')
      loadedRef.current = true
    }).catch(() => {
      if (active) setSaveState('error')
    })
    return () => { active = false }
    // 読み込みはURLの作戦IDが変わったときだけ行う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId])

  const saveCurrent = useCallback(async (id = savedPlayId) => {
    if (!playName.trim()) return undefined
    const stateAtSave: SaveableEditorState = {
      steps: editor.steps,
      drawings: editor.drawings,
      courtView: view,
      loopPlayback: playback.loop,
      rosterId,
    }
    const sequence = ++saveSequence.current
    setSaveState('saving')
    try {
      const nextId = await savePlayDocument({
        id,
        name: playName,
        type: playType,
        tags: tagsText.split(/[,、]/),
        courtView: view,
        loopPlayback: playback.loop,
        rosterId,
        includePhotosInShare: false,
        steps: editor.steps,
        drawings: editor.drawings,
      })
      if (sequence === saveSequence.current) {
        setSavedFingerprint(createEditorFingerprint(stateAtSave))
        setSaveState('saved')
      }
      return nextId
    } catch {
      if (sequence === saveSequence.current) setSaveState('error')
      return undefined
    }
  }, [editor.drawings, editor.steps, playName, playType, playback.loop, rosterId, savedPlayId, tagsText, view])

  const createFirstSave = async () => {
    if (!playName.trim()) return
    const id = await saveCurrent(savedPlayId ?? undefined)
    if (!id) return
    setSavedPlayId(id)
    setShowSaveDialog(false)
    loadedRef.current = true
    if (destinationAfterFirstSave) {
      const destination = destinationAfterFirstSave
      setDestinationAfterFirstSave(undefined)
      navigate(destination)
    } else if (!playId) {
      navigate(`/editor/${id}`, { replace: true })
    }
  }

  const requestLeave = useCallback((destination: string) => {
    if (!requiresLeaveConfirmation(hasUnsavedChanges, location.pathname, destination)) return false
    setPendingDestination(destination)
    return true
  }, [hasUnsavedChanges, location.pathname])

  useEffect(() => registerLeaveRequestHandler(requestLeave), [registerLeaveRequestHandler, requestLeave])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const returnToList = () => {
    if (!requestLeave('/')) navigate('/')
  }

  const saveAndLeave = async () => {
    const destination = pendingDestination
    if (!destination) return
    setPendingDestination(undefined)
    if (!savedPlayId) {
      setDestinationAfterFirstSave(destination)
      setShowSaveDialog(true)
      return
    }
    const id = await saveCurrent()
    if (id) navigate(destination)
  }

  const resetStepInteraction = (operation: StepOperation) => {
    const reset = resetForStepOperation(operation)
    setPlacementKind(reset.placementKind)
    setOpenPalette(reset.openPalette)
    editor.setSelectedIconId(undefined)
    editor.setMode(reset.editorMode)
  }

  const addStep = () => {
    resetStepInteraction('add')
    editor.addStep()
  }

  const selectStep = (stepId: string) => {
    if (stepId === editor.currentStepId) return
    resetStepInteraction('select')
    editor.selectStep(stepId)
  }

  const removeCurrentStep = () => {
    resetStepInteraction('delete')
    editor.removeCurrentStep()
    setShowStepDeleteConfirmation(false)
  }

  const togglePlayback = () => {
    if (playback.isPlaying) {
      playback.stop()
      return
    }
    resetStepInteraction('select')
    setShowClearConfirmation(false)
    setShowStepDeleteConfirmation(false)
    const firstStep = editor.steps[0]
    if (firstStep) editor.selectStep(firstStep.id)
    playback.start()
  }

  const finishPlacement = () => {
    const next = finishPlacementFlow()
    setPlacementKind(next.placementKind)
    editor.setMode(next.editorMode)
    editor.setSelectedIconId(undefined)
    setOpenPalette('placement')
  }

  const openPlacement = () => {
    if (placementKind) {
      finishPlacement()
      return
    }
    editor.setMode('select')
    editor.setSelectedIconId(undefined)
    setOpenPalette(openPalette === 'placement' ? undefined : 'placement')
  }

  const openDrawing = () => {
    setPlacementKind(undefined)
    if (editor.mode === 'delete' || editor.mode === 'assign') editor.setMode('select')
    editor.setSelectedIconId(undefined)
    setOpenPalette(openPalette === 'drawing' ? undefined : 'drawing')
  }

  const showLimitToast = (kind: IconKind) => {
    const label = iconTools.find((tool) => tool.kind === kind)?.label
    setToast(`${label}は${ICON_PLACEMENT_LIMITS[kind]}個まで配置できます`)
  }

  const placeIcon = (kind: IconKind, position: Point, holderId?: string) => {
    if (!canPlaceIcon(editor.icons, kind)) {
      setPlacementKind(undefined)
      editor.setMode('select')
      showLimitToast(kind)
      setOpenPalette('placement')
      return
    }
    if (kind === 'ball') {
      const decision = decideBallPlacement(editor.icons, holderId)
      if (!decision.allowed) {
        setToast(decision.message)
        finishPlacement()
        return
      }
    }
    editor.addIconAt(kind, position, holderId)
    if (shouldEndPlacementAfterAdd(kind)) {
      finishPlacement()
      return
    }
    if (reachesPlacementLimitAfterAdd(editor.icons, kind)) {
      setPlacementKind(undefined)
      editor.setMode('select')
      setOpenPalette('placement')
    }
  }

  const toggleDeleteMode = () => {
    setPlacementKind(undefined)
    setOpenPalette(undefined)
    editor.setSelectedIconId(undefined)
    editor.setMode(editor.mode === 'delete' ? 'select' : 'delete')
  }

  const toggleAssignmentMode = () => {
    setPlacementKind(undefined)
    setOpenPalette(undefined)
    editor.setSelectedIconId(undefined)
    editor.setMode(editor.mode === 'assign' ? 'select' : 'assign')
  }

  const closeDetailPalette = () => {
    if (openPalette === 'drawing') {
      const nextMode = closeDrawingPalette()
      setPlacementKind(nextMode.placementKind)
      editor.setMode(nextMode.editorMode)
      editor.setSelectedIconId(undefined)
    }
    if (openPalette === 'placement') {
      setPlacementKind(undefined)
      editor.setMode('select')
      editor.setSelectedIconId(undefined)
    }
    setOpenPalette(undefined)
  }

  const changeRoster = (nextRosterId?: string) => {
    if (nextRosterId === rosterId) return
    editor.clearPlayerAssignments()
    setRosterId(nextRosterId)
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="editor-page">
      <header className="editor-heading">
        <div><p className="section-label">EDITOR</p><h1>{playName || '作戦盤'}</h1></div>
        <div className="editor-status" aria-live="polite">
          <span>{editor.icons.length} アイコン</span>
          <span>{editor.drawings.length} ライン</span>
          <span>{saveState === 'loading' ? '読込中…' : saveState === 'saving' ? '保存中…' : saveState === 'error' ? '保存失敗' : hasUnsavedChanges || !savedPlayId ? '未保存' : '保存済み'}</span>
        </div>
        <div className="editor-save-actions">
          <button type="button" onClick={returnToList}>← 一覧へ</button>
          <button type="button" className={`primary-button${hasUnsavedChanges ? ' unsaved' : ''}`} onClick={() => savedPlayId ? void saveCurrent() : setShowSaveDialog(true)}>
            {savedPlayId ? hasUnsavedChanges ? '● 保存' : '保存' : '名前を付けて保存'}
          </button>
        </div>
      </header>

      <section className="step-bar" aria-label="ステップ管理">
        <div className="step-summary" aria-live="polite">
          <span>STEP</span>
          <strong>{editor.currentStepNumber} / {editor.steps.length}</strong>
        </div>
        <div className="step-list" role="tablist" aria-label="ステップを切り替える">
          {editor.steps.map((step) => (
            <button
              key={step.id}
              type="button"
              role="tab"
              disabled={playback.isPlaying}
              aria-selected={step.id === editor.currentStepId}
              className={step.id === editor.currentStepId ? 'active' : ''}
              onClick={() => selectStep(step.id)}
            >
              {step.order}
            </button>
          ))}
        </div>
        <button type="button" className="step-add" disabled={playback.isPlaying} onClick={addStep} aria-label="現在の配置を複製してステップを追加">＋ 追加</button>
        <button
          type="button"
          className={`step-playback${playback.isPlaying ? ' active' : ''}`}
          disabled={!playback.isPlaying && editor.steps.length < 2}
          aria-pressed={playback.isPlaying}
          onClick={togglePlayback}
        >
          {playback.isPlaying ? '■ 中断' : '▶ 再生'}
        </button>
        <button
          type="button"
          className="step-delete"
          disabled={editor.steps.length === 1 || playback.isPlaying}
          onClick={() => setShowStepDeleteConfirmation(true)}
          aria-label="現在のステップを削除"
        >
          削除
        </button>
        <div className="landscape-save-actions">
          <button type="button" onClick={returnToList}>← 一覧</button>
          <button type="button" className={hasUnsavedChanges ? 'unsaved' : ''} onClick={() => savedPlayId ? void saveCurrent() : setShowSaveDialog(true)}>
            {hasUnsavedChanges ? '● 保存' : '保存'}
          </button>
        </div>
      </section>

      <section className="board-card editor-board" aria-label={`${miniBasketballCourt.name} ${miniBasketballCourt.viewLabels[view]}表示`}>
        <CourtEditorCanvas
          config={miniBasketballCourt}
          view={view}
          orientation={landscape ? 'landscape' : 'portrait'}
          icons={displayedIcons}
          drawings={editor.drawings}
          selectedIconId={playback.isPlaying ? undefined : editor.selectedIconId}
          mode={editor.mode}
          placementKind={placementKind}
          color={editor.color}
          lineWidth={editor.lineWidth}
          readOnly={playback.isPlaying}
          onSelectIcon={editor.setSelectedIconId}
          onPlaceIcon={placeIcon}
          onMoveIcon={editor.moveIcon}
          onAddDrawing={editor.addDrawing}
          onDeleteIcon={editor.deleteIcon}
          onDeleteDrawing={editor.deleteDrawing}
        />
        {playback.isPlaying && (
          <section className="playback-controls" aria-label="再生コントロール">
            <span className="playback-position" aria-live="polite">
              {playback.waitingForLoop
                ? '次の周回を準備中'
                : `${playback.segmentIndex + 1} → ${playback.segmentIndex + 2}`}
            </span>
            <button
              type="button"
              onClick={playback.seekBack}
              disabled={playback.segmentIndex === 0 && playback.progress === 0}
              aria-label="1ステップ戻す"
            >
              ◀
            </button>
            <button type="button" onClick={playback.togglePause} aria-label={playback.isPaused ? '再生を再開' : '一時停止'}>
              {playback.isPaused ? '▶ 再開' : 'Ⅱ 一時停止'}
            </button>
            <button
              type="button"
              onClick={playback.seekForward}
              disabled={playback.segmentIndex === editor.steps.length - 2 && playback.progress >= 1}
              aria-label="1ステップ進める"
            >
              ▶
            </button>
            <label>
              <span>速度</span>
              <select
                value={playback.speed}
                onChange={(event) => playback.setSpeed(Number(event.target.value) as PlaybackSpeed)}
                aria-label="再生速度"
              >
                {PLAYBACK_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}倍</option>)}
              </select>
            </label>
            <button
              type="button"
              className={playback.loop ? 'active' : ''}
              aria-pressed={playback.loop}
              onClick={playback.toggleLoop}
            >
              ↻ ループ
            </button>
          </section>
        )}
      </section>

      {openPalette && (
        <aside className={`detail-palette ${openPalette}-palette`} aria-label={`${openPalette === 'placement' ? '配置' : openPalette === 'drawing' ? '描画' : 'その他'}パレット`}>
          <div className="palette-heading">
            <strong>{openPalette === 'placement' ? '配置するもの' : openPalette === 'drawing' ? '描画設定' : 'メニュー'}</strong>
            <button type="button" onClick={closeDetailPalette} aria-label={openPalette === 'drawing' ? '描画を終了してパレットを閉じる' : '詳細パレットを閉じる'}>閉じる</button>
          </div>

          {openPalette === 'placement' && (
            <div className="palette-grid icon-choice-grid">
              {iconTools.map((tool) => (
                (() => {
                  const count = countIconsOfKind(editor.icons, tool.kind)
                  const limit = ICON_PLACEMENT_LIMITS[tool.kind]
                  const atLimit = shouldShowPlacementLimitMessage(editor.icons, tool.kind)
                  return (
                <button
                  key={tool.kind}
                  type="button"
                  className={placementKind === tool.kind ? 'active' : ''}
                  aria-pressed={placementKind === tool.kind}
                  aria-label={`${tool.label}を連続配置（${count}/${limit}）`}
                  data-limit-reached={atLimit || undefined}
                  onClick={() => {
                    if (atLimit) {
                      showLimitToast(tool.kind)
                      return
                    }
                    const nextMode = choosePlacement(tool.kind)
                    setPlacementKind(nextMode.placementKind)
                    editor.setMode(nextMode.editorMode)
                    editor.setSelectedIconId(undefined)
                    setOpenPalette(undefined)
                  }}
                >
                  <span aria-hidden="true">{tool.symbol}</span>
                  <span>{tool.label}<small>{count}/{limit}</small></span>
                </button>
                  )
                })()
              ))}
            </div>
          )}

          {openPalette === 'drawing' && (
            <>
              <div className="palette-grid drawing-choice-grid">
                {drawingModes.map((tool) => (
                  <button key={tool.type} type="button" className={editor.mode === tool.type ? 'active' : ''} aria-pressed={editor.mode === tool.type} onClick={() => {
                    const nextMode = chooseDrawing(tool.type)
                    setPlacementKind(nextMode.placementKind)
                    editor.setMode(nextMode.editorMode)
                    editor.setSelectedIconId(undefined)
                    setOpenPalette(undefined)
                  }}>
                    {drawingLabels[tool.type]}
                  </button>
                ))}
              </div>
              <div className="drawing-options">
                <div className="color-presets" aria-label="線色プリセット">
                  {[['#ef4444', '赤'], ['#2563eb', '青'], ['#fffaf0', '白']].map(([value, label]) => (
                    <button key={value} type="button" className={editor.color === value ? 'active' : ''} style={{ backgroundColor: value }} aria-label={`色: ${label}`} aria-pressed={editor.color === value} onClick={() => editor.setColor(value)} />
                  ))}
                </div>
                <label className="color-tool">色<input type="color" value={editor.color} onChange={(event) => editor.setColor(event.target.value)} aria-label="線の色" /></label>
                <label className="width-tool">太さ
                  <select value={editor.lineWidth} onChange={(event) => editor.setLineWidth(Number(event.target.value))} aria-label="線の太さ">
                    <option value="2">細</option><option value="4">中</option><option value="7">太</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {openPalette === 'menu' && (
            <div className="menu-actions">
              <label className="roster-choice">使用するチーム
                <select value={rosterId ?? ''} onChange={(event) => changeRoster(event.target.value || undefined)}>
                  <option value="">ロスターなし</option>
                  {rosters.map((roster) => <option key={roster.id} value={roster.id}>{roster.teamName}</option>)}
                </select>
              </label>
              <div className="view-toggle" role="group" aria-label="コート表示">
                <button type="button" className={view === 'half' ? 'active' : ''} aria-pressed={view === 'half'} onClick={() => setView('half')}>{miniBasketballCourt.viewLabels.half}</button>
                <button type="button" className={view === 'full' ? 'active' : ''} aria-pressed={view === 'full'} onClick={() => setView('full')}>{miniBasketballCourt.viewLabels.full}</button>
              </div>
              <button type="button" disabled={editor.drawings.length === 0} onClick={() => { editor.clearDrawings(); setOpenPalette(undefined) }}>描画のみ全消去</button>
              <button type="button" className="danger-tool" disabled={editor.icons.length === 0 && editor.drawings.length === 0} onClick={() => setShowClearConfirmation(true)}>編集内容を全消去</button>
            </div>
          )}
        </aside>
      )}

      {!playback.isPlaying && !openPalette && canOpenAssignment(editor.mode) && selectedPlayerIcon && (
        <aside className="detail-palette assignment-palette" aria-label="選手をアイコンへ割り当て">
          <div className="palette-heading">
            <strong>選手を割り当て</strong>
            <button type="button" onClick={() => {
              editor.setSelectedIconId(undefined)
              editor.setMode('select')
            }}>閉じる</button>
          </div>
          <label className="roster-choice">チーム
            <select value={rosterId ?? ''} onChange={(event) => changeRoster(event.target.value || undefined)}>
              <option value="">チームを選択</option>
              {rosters.map((roster) => <option key={roster.id} value={roster.id}>{roster.teamName}</option>)}
            </select>
          </label>
          {!rosterId && <p>「選手」タブでチームを作成し、ここで選択してください。</p>}
          {rosterId && rosterPlayers.length === 0 && <p>このチームには選手が登録されていません。</p>}
          {rosterPlayers.length > 0 && (
            <div className="assignment-grid">
              {rosterPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={selectedPlayerIcon.playerId === player.id ? 'active' : ''}
                  aria-pressed={selectedPlayerIcon.playerId === player.id}
                  onClick={() => {
                    editor.assignPlayer(selectedPlayerIcon.id, player.id)
                    editor.setSelectedIconId(undefined)
                  }}
                >
                  {playerPhotoUrls.get(player.id)
                    ? <img src={playerPhotoUrls.get(player.id)} alt="" />
                    : <span className="assignment-avatar" aria-hidden="true">{player.displayName || player.jerseyNumber}</span>}
                  <span>{player.displayName || '名前なし'}<small>{player.jerseyNumber ? `#${player.jerseyNumber}` : '番号なし'}</small></span>
                </button>
              ))}
            </div>
          )}
          {selectedPlayerIcon.playerId && (
            <button type="button" className="unassign-button" onClick={() => {
              editor.assignPlayer(selectedPlayerIcon.id, undefined)
              editor.setSelectedIconId(undefined)
            }}>割り当てを外す</button>
          )}
        </aside>
      )}

      <nav className="editor-category-bar" aria-label="編集カテゴリ">
        <button type="button" disabled={playback.isPlaying} className={placementKind || openPalette === 'placement' ? 'active' : ''} aria-pressed={Boolean(placementKind || openPalette === 'placement')} onClick={openPlacement}>
          {placementKind ? `✓ ${placementLabel}完了` : '＋ 配置'}
        </button>
        <button type="button" disabled={playback.isPlaying} className={drawingMode || openPalette === 'drawing' ? 'active' : ''} aria-pressed={Boolean(drawingMode || openPalette === 'drawing')} onClick={openDrawing}>
          ✏ {drawingMode ? drawingLabels[drawingMode] : '描画'}
        </button>
        <button type="button" disabled={playback.isPlaying} className={editor.mode === 'assign' ? 'active assign-mode-button' : 'assign-mode-button'} aria-pressed={editor.mode === 'assign'} onClick={toggleAssignmentMode} aria-label="選手の割り当てモード">
          👤 割当
        </button>
        <button type="button" disabled={playback.isPlaying} className={editor.mode === 'delete' ? 'active delete-mode-button' : 'delete-mode-button'} aria-pressed={editor.mode === 'delete'} onClick={toggleDeleteMode} aria-label="アイコンや描画を連続削除">⌫ 削除</button>
        <button type="button" disabled={playback.isPlaying || !editor.canUndo} onClick={editor.undo} aria-label="直前の操作を取り消す">↶ Undo</button>
        <button type="button" disabled={playback.isPlaying} className={openPalette === 'menu' ? 'active' : ''} aria-pressed={openPalette === 'menu'} onClick={() => setOpenPalette(openPalette === 'menu' ? undefined : 'menu')}>… メニュー</button>
      </nav>

      {toast && <div className="editor-toast" role="status" aria-live="polite">{toast}</div>}

      {showClearConfirmation && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm" role="dialog" aria-modal="true" aria-labelledby="clear-confirm-title">
            <h2 id="clear-confirm-title">編集中の内容を全消去しますか？</h2>
            <p>アイコンと描画がすべて消えます。直後ならUndoで戻せます。</p>
            <div>
              <button type="button" onClick={() => setShowClearConfirmation(false)}>キャンセル</button>
              <button type="button" className="confirm-delete" onClick={() => { editor.clearAll(); setShowClearConfirmation(false); setOpenPalette(undefined) }}>すべて消す</button>
            </div>
          </section>
        </div>
      )}

      {showStepDeleteConfirmation && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm" role="dialog" aria-modal="true" aria-labelledby="step-delete-title">
            <h2 id="step-delete-title">ステップ{editor.currentStepNumber}を削除しますか？</h2>
            <p>このステップに記録した座標とボール保持状態が削除されます。この操作はUndoでは戻せません。</p>
            <div>
              <button type="button" onClick={() => setShowStepDeleteConfirmation(false)}>キャンセル</button>
              <button type="button" className="confirm-delete" onClick={removeCurrentStep}>削除する</button>
            </div>
          </section>
        </div>
      )}

      {showSaveDialog && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
            <h2 id="save-dialog-title">作戦を保存</h2>
            <label>名前<input value={playName} onChange={(event) => setPlayName(event.target.value)} /></label>
            <label>種別
              <select value={playType} onChange={(event) => setPlayType(event.target.value as PlayType)}>
                <option value="play">作戦</option>
                <option value="drill">練習ドリル</option>
              </select>
            </label>
            <label>タグ（カンマ区切り）<input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="例：オフェンス, 低学年" /></label>
            <div>
              <button type="button" onClick={() => {
                setShowSaveDialog(false)
                setDestinationAfterFirstSave(undefined)
              }}>キャンセル</button>
              <button type="button" className="confirm-save" disabled={!playName.trim() || saveState === 'saving'} onClick={() => void createFirstSave()}>保存する</button>
            </div>
          </section>
        </div>
      )}

      {pendingDestination && (
        <div className="confirm-backdrop" role="presentation">
          <section className="clear-confirm leave-confirm" role="dialog" aria-modal="true" aria-labelledby="leave-confirm-title">
            <h2 id="leave-confirm-title">変更が保存されていません</h2>
            <p>移動する前に、この作戦の変更を保存しますか？</p>
            <div>
              <button type="button" onClick={() => setPendingDestination(undefined)}>キャンセル</button>
              <button type="button" className="discard-button" onClick={() => {
                const destination = pendingDestination
                setPendingDestination(undefined)
                navigate(destination)
              }}>保存しない</button>
              <button type="button" className="confirm-save" onClick={() => void saveAndLeave()}>保存する</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
