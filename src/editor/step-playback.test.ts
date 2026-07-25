import { describe, expect, it } from 'vitest'
import type { EditorIcon } from './editor-geometry'
import { canEditDuringPlayback, interpolatePoint, interpolateStepIcons } from './step-playback'

describe('ステップ間の直線補間', () => {
  it('t=0、0.5、1で開始・中間・終了座標を返す', () => {
    const from = { x: 0.1, y: 0.2 }
    const to = { x: 0.9, y: 0.6 }

    expect(interpolatePoint(from, to, 0)).toEqual(from)
    expect(interpolatePoint(from, to, 0.5)).toEqual({ x: 0.5, y: 0.4 })
    expect(interpolatePoint(from, to, 1)).toEqual(to)
  })

  it('保持者が変わるパスではボール自身が前位置から新保持者へ直線移動する', () => {
    const from: EditorIcon[] = [
      { id: 'p1', kind: 'offense', position: { x: 0.2, y: 0.5 } },
      { id: 'p2', kind: 'offense', position: { x: 0.8, y: 0.5 } },
      { id: 'ball', kind: 'ball', holderId: 'p1', position: { x: 0.2, y: 0.5 } },
    ]
    const to: EditorIcon[] = [
      { id: 'p1', kind: 'offense', position: { x: 0.25, y: 0.4 } },
      { id: 'p2', kind: 'offense', position: { x: 0.7, y: 0.6 } },
      { id: 'ball', kind: 'ball', holderId: 'p2', position: { x: 0.7, y: 0.6 } },
    ]

    const halfway = interpolateStepIcons(from, to, 0.5).find((icon) => icon.id === 'ball')
    expect(halfway?.position.x).toBeCloseTo(0.45)
    expect(halfway?.position.y).toBeCloseTo(0.55)
    expect(halfway?.holderId).toBeUndefined()

    const finished = interpolateStepIcons(from, to, 1).find((icon) => icon.id === 'ball')
    expect(finished?.holderId).toBe('p2')
  })

  it('保持者が同じ場合は補間中の保持者座標へ追従する', () => {
    const from: EditorIcon[] = [
      { id: 'p1', kind: 'offense', position: { x: 0.2, y: 0.3 } },
      { id: 'ball', kind: 'ball', holderId: 'p1', position: { x: 0.2, y: 0.3 } },
    ]
    const to: EditorIcon[] = [
      { id: 'p1', kind: 'offense', position: { x: 0.6, y: 0.7 } },
      { id: 'ball', kind: 'ball', holderId: 'p1', position: { x: 0.6, y: 0.7 } },
    ]

    const halfway = interpolateStepIcons(from, to, 0.5)
    expect(halfway.find((icon) => icon.id === 'ball')?.position)
      .toEqual(halfway.find((icon) => icon.id === 'p1')?.position)
  })

  it('再生中は編集できず、終了後は編集できる', () => {
    expect(canEditDuringPlayback(true)).toBe(false)
    expect(canEditDuringPlayback(false)).toBe(true)
  })
})
