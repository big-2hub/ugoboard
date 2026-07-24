import { describe, expect, it } from 'vitest'
import { isCompletedDrawing, startDrawingGesture, updateDrawingGesture } from './drawing-gesture'
import type { EditorMode } from './editor-types'

describe('スマホのタッチ描画入力', () => {
  it.each<EditorMode>(['freehand', 'line', 'arrow', 'pass', 'dribble'])(
    'touch入力で%s描画を開始・更新・確定できる',
    (mode) => {
      const started = startDrawingGesture(
        { inputType: 'touch', point: { x: 0.2, y: 0.25 } },
        mode,
        '#2563eb',
        4,
      )
      expect(started).toBeDefined()
      const updated = updateDrawingGesture(started!, {
        inputType: 'touch',
        point: { x: 0.7, y: 0.75 },
      })
      expect(isCompletedDrawing(updated)).toBe(true)
      const values = updated.points.flatMap((point) => [point.x, point.y])
      expect(values.every((value) => value >= 0 && value <= 1)).toBe(true)
    },
  )

  it('PointerEvent入力でも同じ描画経路を使う', () => {
    const drawing = startDrawingGesture(
      { inputType: 'pointer', point: { x: 0.1, y: 0.1 } },
      'line',
      '#ef4444',
      2,
    )
    expect(drawing?.type).toBe('line')
  })
})
