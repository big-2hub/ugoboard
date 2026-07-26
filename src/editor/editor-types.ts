import type { Point } from '../court/court-config'
import type { DrawingType } from '../db/database'
import type { EditorIcon } from './editor-geometry'

export type EditorMode = 'select' | 'delete' | 'assign' | DrawingType

export type EditorDrawing = {
  id: string
  type: DrawingType
  points: Point[]
  color: string
  width: number
}

export type EditorSnapshot = {
  icons: EditorIcon[]
  drawings: EditorDrawing[]
}
