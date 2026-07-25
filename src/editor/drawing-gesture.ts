import type { Point } from '../court/court-config'
import type { EditorDrawing, EditorMode } from './editor-types'

export type UnifiedPointerInput = {
  inputType: 'pointer' | 'touch'
  point: Point
}

export function startDrawingGesture(
  input: UnifiedPointerInput,
  mode: EditorMode,
  color: string,
  width: number,
): Omit<EditorDrawing, 'id'> | undefined {
  if (mode === 'select' || mode === 'delete') return undefined
  return {
    type: mode,
    points: [input.point, input.point],
    color,
    width,
  }
}

export function updateDrawingGesture(
  drawing: Omit<EditorDrawing, 'id'>,
  input: UnifiedPointerInput,
): Omit<EditorDrawing, 'id'> {
  return drawing.type === 'freehand'
    ? { ...drawing, points: [...drawing.points, input.point] }
    : { ...drawing, points: [drawing.points[0], input.point] }
}

export function isCompletedDrawing(drawing: Omit<EditorDrawing, 'id'>): boolean {
  if (drawing.points.length < 2) return false
  const start = drawing.points[0]
  const end = drawing.points.at(-1)!
  return Math.hypot(start.x - end.x, start.y - end.y) > 0.005
}
