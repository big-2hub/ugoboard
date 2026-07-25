import { useEffect, useState } from 'react'
import { miniBasketballCourt, type Point } from '../court/court-config'
import type { DrawingType, IconKind } from '../db/database'
import { CourtEditorCanvas } from '../editor/CourtEditorCanvas'
import { chooseDrawing, choosePlacement } from '../editor/editor-tool-mode'
import { drawingModes, useEditorState } from '../editor/use-editor-state'
import { canPlaceIcon, countIconsOfKind, ICON_PLACEMENT_LIMITS, reachesPlacementLimitAfterAdd } from '../editor/icon-placement-limits'

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
  const [view, setView] = useState<'half' | 'full'>('half')
  const [openPalette, setOpenPalette] = useState<OpenPalette>()
  const [placementKind, setPlacementKind] = useState<IconKind>()
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [toast, setToast] = useState<string>()
  const landscape = useLandscape()
  const editor = useEditorState()
  const drawingMode = editor.mode === 'select' || editor.mode === 'delete' ? undefined : editor.mode
  const placementLabel = iconTools.find((tool) => tool.kind === placementKind)?.label

  const openPlacement = () => {
    if (placementKind) {
      setPlacementKind(undefined)
      editor.setMode('select')
      return
    }
    editor.setMode('select')
    editor.setSelectedIconId(undefined)
    setOpenPalette(openPalette === 'placement' ? undefined : 'placement')
  }

  const openDrawing = () => {
    setPlacementKind(undefined)
    if (editor.mode === 'delete') editor.setMode('select')
    editor.setSelectedIconId(undefined)
    setOpenPalette(openPalette === 'drawing' ? undefined : 'drawing')
  }

  const showLimitToast = (kind: IconKind) => {
    const label = iconTools.find((tool) => tool.kind === kind)?.label
    setToast(`${label}は${ICON_PLACEMENT_LIMITS[kind]}個まで配置できます`)
  }

  const placeIcon = (kind: IconKind, position: Point) => {
    if (!canPlaceIcon(editor.icons, kind)) {
      setPlacementKind(undefined)
      editor.setMode('select')
      showLimitToast(kind)
      return
    }
    editor.addIconAt(kind, position)
    if (reachesPlacementLimitAfterAdd(editor.icons, kind)) {
      setPlacementKind(undefined)
      editor.setMode('select')
      showLimitToast(kind)
    }
  }

  const toggleDeleteMode = () => {
    setPlacementKind(undefined)
    setOpenPalette(undefined)
    editor.setSelectedIconId(undefined)
    editor.setMode(editor.mode === 'delete' ? 'select' : 'delete')
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="editor-page">
      <header className="editor-heading">
        <div><p className="section-label">EDITOR</p><h1>作戦盤</h1></div>
        <div className="editor-status" aria-live="polite">
          <span>{editor.icons.length} アイコン</span>
          <span>{editor.drawings.length} ライン</span>
        </div>
      </header>

      <section className="board-card editor-board" aria-label={`${miniBasketballCourt.name} ${view === 'half' ? 'ハーフ' : 'フル'}表示`}>
        <CourtEditorCanvas
          config={miniBasketballCourt}
          view={view}
          orientation={landscape ? 'landscape' : 'portrait'}
          icons={editor.icons}
          drawings={editor.drawings}
          selectedIconId={editor.selectedIconId}
          mode={editor.mode}
          placementKind={placementKind}
          color={editor.color}
          lineWidth={editor.lineWidth}
          onSelectIcon={editor.setSelectedIconId}
          onPlaceIcon={placeIcon}
          onMoveIcon={editor.moveIcon}
          onAddDrawing={editor.addDrawing}
          onDeleteIcon={editor.deleteIcon}
          onDeleteDrawing={editor.deleteDrawing}
        />
      </section>

      {openPalette && (
        <aside className={`detail-palette ${openPalette}-palette`} aria-label={`${openPalette === 'placement' ? '配置' : openPalette === 'drawing' ? '描画' : 'その他'}パレット`}>
          <div className="palette-heading">
            <strong>{openPalette === 'placement' ? '配置するもの' : openPalette === 'drawing' ? '描画設定' : 'メニュー'}</strong>
            <button type="button" onClick={() => setOpenPalette(undefined)} aria-label="詳細パレットを閉じる">閉じる</button>
          </div>

          {openPalette === 'placement' && (
            <div className="palette-grid icon-choice-grid">
              {iconTools.map((tool) => (
                (() => {
                  const count = countIconsOfKind(editor.icons, tool.kind)
                  const limit = ICON_PLACEMENT_LIMITS[tool.kind]
                  const atLimit = count >= limit
                  return (
                <button
                  key={tool.kind}
                  type="button"
                  className={placementKind === tool.kind ? 'active' : ''}
                  aria-pressed={placementKind === tool.kind}
                  aria-label={`${tool.label}を連続配置（${count}/${limit}）`}
                  disabled={atLimit}
                  onClick={() => {
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
              <div className="view-toggle" role="group" aria-label="コート表示">
                <button type="button" className={view === 'half' ? 'active' : ''} aria-pressed={view === 'half'} onClick={() => setView('half')}>ハーフ</button>
                <button type="button" className={view === 'full' ? 'active' : ''} aria-pressed={view === 'full'} onClick={() => setView('full')}>フル</button>
              </div>
              <button type="button" disabled={editor.drawings.length === 0} onClick={() => { editor.clearDrawings(); setOpenPalette(undefined) }}>描画のみ全消去</button>
              <button type="button" className="danger-tool" disabled={editor.icons.length === 0 && editor.drawings.length === 0} onClick={() => setShowClearConfirmation(true)}>編集内容を全消去</button>
            </div>
          )}
        </aside>
      )}

      <nav className="editor-category-bar" aria-label="編集カテゴリ">
        <button type="button" className={placementKind || openPalette === 'placement' ? 'active' : ''} aria-pressed={Boolean(placementKind || openPalette === 'placement')} onClick={openPlacement}>
          {placementKind ? `✓ ${placementLabel}完了` : '＋ 配置'}
        </button>
        <button type="button" className={drawingMode || openPalette === 'drawing' ? 'active' : ''} aria-pressed={Boolean(drawingMode || openPalette === 'drawing')} onClick={openDrawing}>
          ✏ {drawingMode ? drawingLabels[drawingMode] : '描画'}
        </button>
        <button type="button" className={editor.mode === 'delete' ? 'active delete-mode-button' : 'delete-mode-button'} aria-pressed={editor.mode === 'delete'} onClick={toggleDeleteMode} aria-label="アイコンや描画を連続削除">⌫ 削除</button>
        <button type="button" disabled={!editor.canUndo} onClick={editor.undo} aria-label="直前の操作を取り消す">↶ Undo</button>
        <button type="button" className={openPalette === 'menu' ? 'active' : ''} aria-pressed={openPalette === 'menu'} onClick={() => setOpenPalette(openPalette === 'menu' ? undefined : 'menu')}>… メニュー</button>
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
    </div>
  )
}
