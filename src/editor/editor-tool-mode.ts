import type { IconKind } from '../db/database'
import type { DrawingType } from '../db/database'
import type { EditorMode } from './editor-types'

export type EditorToolMode = {
  editorMode: EditorMode
  placementKind?: IconKind
}

export function choosePlacement(kind: IconKind): EditorToolMode {
  return { editorMode: 'select', placementKind: kind }
}

export function chooseDrawing(editorMode: DrawingType): EditorToolMode {
  return { editorMode, placementKind: undefined }
}
