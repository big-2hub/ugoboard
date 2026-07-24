import { useCallback, useState } from 'react'
import type { Point } from '../court/court-config'
import type { DrawingType, IconKind } from '../db/database'
import { moveIconWithFollowers, type CourtFrame, type EditorIcon } from './editor-geometry'
import type { EditorDrawing, EditorMode, EditorSnapshot } from './editor-types'
import { createId } from '../utils/create-id'
import { takePreviousSnapshot } from './editor-history'

const iconLabels: Record<IconKind, string> = {
  offense: 'O',
  defense: 'D',
  ball: '',
  cone: '',
  chair: '',
}

export function useEditorState() {
  const [icons, setIcons] = useState<EditorIcon[]>([])
  const [drawings, setDrawings] = useState<EditorDrawing[]>([])
  const [selectedIconId, setSelectedIconId] = useState<string>()
  const [mode, setMode] = useState<EditorMode>('select')
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(4)
  const [history, setHistory] = useState<EditorSnapshot[]>([])

  const remember = useCallback(() => {
    setHistory((items) => [...items.slice(-29), { icons, drawings }])
  }, [drawings, icons])

  const addIcon = useCallback((kind: IconKind, visibleYMax: number) => {
    remember()
    setIcons((items) => [
      ...items,
      {
        id: createId(kind),
        kind,
        label: iconLabels[kind],
        position: { x: 0.5, y: visibleYMax / 2 },
      },
    ])
    setMode('select')
  }, [remember])

  const moveIcon = useCallback((id: string, position: Point, frame: CourtFrame) => {
    remember()
    setIcons((items) => moveIconWithFollowers(items, id, position, frame))
  }, [remember])

  const deleteSelected = useCallback(() => {
    if (!selectedIconId) return
    remember()
    setIcons((items) => items
      .filter((icon) => icon.id !== selectedIconId)
      .map((icon) => icon.holderId === selectedIconId
        ? { ...icon, holderId: undefined }
        : icon))
    setSelectedIconId(undefined)
  }, [remember, selectedIconId])

  const addDrawing = useCallback((drawing: Omit<EditorDrawing, 'id'>) => {
    remember()
    setDrawings((items) => [...items, { ...drawing, id: createId('drawing') }])
  }, [remember])

  const undo = useCallback(() => {
    const previous = takePreviousSnapshot(history)
    if (!previous) return
    setIcons(previous.snapshot.icons)
    setDrawings(previous.snapshot.drawings)
    setHistory(previous.remainingHistory)
    setSelectedIconId(undefined)
  }, [history])

  const clearDrawings = useCallback(() => {
    if (drawings.length === 0) return
    remember()
    setDrawings([])
  }, [drawings.length, remember])

  const clearAll = useCallback(() => {
    if (icons.length === 0 && drawings.length === 0) return
    remember()
    setIcons([])
    setDrawings([])
    setSelectedIconId(undefined)
  }, [drawings.length, icons.length, remember])

  return {
    icons,
    drawings,
    selectedIconId,
    mode,
    color,
    lineWidth,
    canUndo: history.length > 0,
    setSelectedIconId,
    setMode,
    setColor,
    setLineWidth,
    addIcon,
    moveIcon,
    deleteSelected,
    addDrawing,
    undo,
    clearDrawings,
    clearAll,
  }
}

export const drawingModes: Array<{ type: DrawingType; label: string }> = [
  { type: 'freehand', label: 'フリー' },
  { type: 'line', label: '直線' },
  { type: 'arrow', label: '移動' },
  { type: 'pass', label: 'パス' },
  { type: 'dribble', label: 'ドリブル' },
]
