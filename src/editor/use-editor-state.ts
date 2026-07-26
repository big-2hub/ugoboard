import { useCallback, useState } from 'react'
import type { Point } from '../court/court-config'
import type { DrawingType, IconKind } from '../db/database'
import { moveIconWithFollowers, type CourtFrame, type EditorIcon } from './editor-geometry'
import type { EditorDrawing, EditorMode, EditorSnapshot } from './editor-types'
import { createId } from '../utils/create-id'
import { takePreviousSnapshot } from './editor-history'
import { deleteDrawingFromSnapshot } from './editor-delete'
import { canPlaceIcon } from './icon-placement-limits'
import {
  addIconToEveryStep,
  createInitialStep,
  deleteIconFromEveryStep,
  deleteStep,
  duplicateStep,
  updateStepIcons,
} from './editor-steps'
import type { EditorStep } from './editor-steps'
import { createPlacedIcon } from './icon-placement'

const iconLabels: Record<IconKind, string> = {
  offense: 'O',
  defense: 'D',
  ball: '',
  cone: '',
  chair: '',
}

export function useEditorState() {
  const [steps, setSteps] = useState(() => [createInitialStep(createId('step'))])
  const [currentStepId, setCurrentStepId] = useState(() => steps[0].id)
  const [drawings, setDrawings] = useState<EditorDrawing[]>([])
  const [selectedIconId, setSelectedIconId] = useState<string>()
  const [mode, setMode] = useState<EditorMode>('select')
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(4)
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const currentStep = steps.find((step) => step.id === currentStepId) ?? steps[0]
  const icons = currentStep.icons

  const setCurrentIcons = useCallback((update: (items: EditorIcon[]) => EditorIcon[]) => {
    setSteps((items) => updateStepIcons(items, currentStepId, update))
  }, [currentStepId])

  const remember = useCallback(() => {
    setHistory((items) => [...items.slice(-29), { icons, drawings }])
  }, [drawings, icons])

  const addIcon = useCallback((kind: IconKind, visibleYMax: number) => {
    if (!canPlaceIcon(icons, kind)) return
    const icon = {
        id: createId(kind),
        kind,
        label: iconLabels[kind],
        position: { x: 0.5, y: visibleYMax / 2 },
      }
    setSteps((items) => addIconToEveryStep(items, icon, currentStepId))
    setHistory([])
    setMode('select')
  }, [currentStepId, icons])

  const addIconAt = useCallback((kind: IconKind, position: Point, holderId?: string) => {
    if (!canPlaceIcon(icons, kind)) return
    const icon = createPlacedIcon(createId(kind), kind, position, iconLabels[kind], holderId)
    setSteps((items) => addIconToEveryStep(items, icon, currentStepId))
    setHistory([])
  }, [currentStepId, icons])

  const moveIcon = useCallback((id: string, position: Point, frame: CourtFrame) => {
    remember()
    setCurrentIcons((items) => moveIconWithFollowers(items, id, position, frame))
  }, [remember, setCurrentIcons])

  const deleteSelected = useCallback(() => {
    if (!selectedIconId) return
    setSteps((items) => deleteIconFromEveryStep(items, selectedIconId))
    setHistory([])
    setSelectedIconId(undefined)
  }, [selectedIconId])

  const deleteIcon = useCallback((iconId: string) => {
    setSteps((items) => deleteIconFromEveryStep(items, iconId))
    setHistory([])
    setSelectedIconId(undefined)
  }, [])

  const deleteDrawing = useCallback((drawingId: string) => {
    remember()
    const next = deleteDrawingFromSnapshot({ icons, drawings }, drawingId)
    setDrawings(next.drawings)
  }, [drawings, icons, remember])

  const addDrawing = useCallback((drawing: Omit<EditorDrawing, 'id'>) => {
    remember()
    setDrawings((items) => [...items, { ...drawing, id: createId('drawing') }])
  }, [remember])

  const undo = useCallback(() => {
    const previous = takePreviousSnapshot(history)
    if (!previous) return
    setCurrentIcons(() => previous.snapshot.icons)
    setDrawings(previous.snapshot.drawings)
    setHistory(previous.remainingHistory)
    setSelectedIconId(undefined)
  }, [history, setCurrentIcons])

  const clearDrawings = useCallback(() => {
    if (drawings.length === 0) return
    remember()
    setDrawings([])
  }, [drawings.length, remember])

  const clearAll = useCallback(() => {
    if (icons.length === 0 && drawings.length === 0) return
    setSteps((items) => items.map((step) => ({ ...step, icons: [], holderId: undefined })))
    setDrawings([])
    setHistory([])
    setSelectedIconId(undefined)
  }, [drawings.length, icons.length])

  const addStep = useCallback(() => {
    const id = createId('step')
    setSteps((items) => duplicateStep(items, currentStepId, id))
    setCurrentStepId(id)
    setSelectedIconId(undefined)
    setMode('select')
    setHistory([])
  }, [currentStepId])

  const selectStep = useCallback((stepId: string) => {
    if (stepId === currentStepId) return
    setCurrentStepId(stepId)
    setSelectedIconId(undefined)
    setMode('select')
    setHistory([])
  }, [currentStepId])

  const removeCurrentStep = useCallback(() => {
    if (steps.length <= 1) return
    const currentIndex = steps.findIndex((step) => step.id === currentStepId)
    const nextSteps = deleteStep(steps, currentStepId)
    const nextIndex = Math.min(currentIndex, nextSteps.length - 1)
    setSteps(nextSteps)
    setCurrentStepId(nextSteps[nextIndex].id)
    setSelectedIconId(undefined)
    setMode('select')
    setHistory([])
  }, [currentStepId, steps])

  const loadDocument = useCallback((nextSteps: EditorStep[], nextDrawings: EditorDrawing[]) => {
    const safeSteps = nextSteps.length > 0 ? nextSteps : [createInitialStep(createId('step'))]
    setSteps(safeSteps)
    setCurrentStepId(safeSteps[0].id)
    setDrawings(nextDrawings)
    setSelectedIconId(undefined)
    setMode('select')
    setHistory([])
  }, [])

  return {
    icons,
    steps,
    currentStepId,
    currentStepNumber: currentStep.order,
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
    addIconAt,
    moveIcon,
    deleteSelected,
    deleteIcon,
    deleteDrawing,
    addDrawing,
    undo,
    clearDrawings,
    clearAll,
    addStep,
    selectStep,
    removeCurrentStep,
    loadDocument,
  }
}

export const drawingModes: Array<{ type: DrawingType; label: string }> = [
  { type: 'freehand', label: 'フリー' },
  { type: 'line', label: '直線' },
  { type: 'arrow', label: '移動' },
  { type: 'pass', label: 'パス' },
  { type: 'dribble', label: 'ドリブル' },
]
