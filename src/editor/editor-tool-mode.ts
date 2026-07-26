import type { IconKind } from '../db/database'
import type { DrawingType } from '../db/database'
import type { EditorMode } from './editor-types'

export type EditorToolMode = {
  editorMode: EditorMode
  placementKind?: IconKind
}

export type StepOperation = 'add' | 'delete' | 'select'

export function choosePlacement(kind: IconKind): EditorToolMode {
  return { editorMode: 'select', placementKind: kind }
}

export function chooseDrawing(editorMode: DrawingType): EditorToolMode {
  return { editorMode, placementKind: undefined }
}

export function closeDrawingPalette(): EditorToolMode {
  return { editorMode: 'select', placementKind: undefined }
}

export function canDragIcon(editorMode: EditorMode, placementKind?: IconKind) {
  return editorMode === 'select' && placementKind === undefined
}

export function canInteractWithIcons(editorMode: EditorMode) {
  return editorMode === 'select' || editorMode === 'delete' || editorMode === 'assign'
}

export function canOpenAssignment(editorMode: EditorMode) {
  return editorMode === 'assign'
}

export function finishPlacementFlow(): EditorToolMode & { openPlacementPalette: true } {
  return {
    editorMode: 'select',
    placementKind: undefined,
    openPlacementPalette: true,
  }
}

export function resetForStepOperation(_operation: StepOperation): EditorToolMode & { openPalette: undefined } {
  return {
    editorMode: 'select',
    placementKind: undefined,
    openPalette: undefined,
  }
}

export function resetTransientIconState() {
  return undefined
}
