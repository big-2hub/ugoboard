import { describe, expect, it } from 'vitest'
import {
  createCourtFrame,
  moveIconWithFollowers,
  normalizedToScreen,
  screenToNormalized,
  snapBallToNearestPlayer,
  type EditorIcon,
} from './editor-geometry'

describe('コート正規化座標', () => {
  it.each([
    ['portrait', 390, 700],
    ['landscape', 760, 300],
  ] as const)('%s表示で画面座標との往復後も0〜1座標を維持する', (orientation, width, height) => {
    const frame = createCourtFrame(width, height, 28 / 15, 'full', orientation)
    const original = { x: 0.23, y: 0.78 }
    const restored = screenToNormalized(normalizedToScreen(original, frame), frame)
    expect(restored?.x).toBeCloseTo(original.x, 6)
    expect(restored?.y).toBeCloseTo(original.y, 6)
  })

  it('横持ちではコートの長辺が画面の横方向になる', () => {
    const frame = createCourtFrame(844, 300, 28 / 15, 'full', 'landscape')
    expect(frame.screenWidth).toBeGreaterThan(frame.screenHeight)
    expect(frame.screenWidth / frame.screenHeight).toBeCloseTo(28 / 15, 2)
  })

  it('ハーフコートの座標をy=0〜0.5に制限する', () => {
    const frame = createCourtFrame(390, 700, 28 / 15, 'half', 'portrait')
    const point = screenToNormalized({ x: frame.x + frame.screenWidth, y: frame.y + frame.screenHeight }, frame)
    expect(point?.x).toBeCloseTo(1, 6)
    expect(point?.y).toBeCloseTo(0.5, 6)
  })
})

describe('ボールスナップ', () => {
  it('近くの選手を保持者として設定する', () => {
    const frame = createCourtFrame(390, 700, 28 / 15, 'full', 'portrait')
    const player: EditorIcon = { id: 'offense-1', kind: 'offense', position: { x: 0.5, y: 0.5 } }
    const ball: EditorIcon = { id: 'ball-1', kind: 'ball', position: { x: 0.53, y: 0.51 } }
    const snapped = snapBallToNearestPlayer(ball, [player, ball], frame)
    expect(snapped.position).toEqual(player.position)
    expect(snapped.holderId).toBe(player.id)
  })

  it('遠い選手にはスナップしない', () => {
    const frame = createCourtFrame(390, 700, 28 / 15, 'full', 'portrait')
    const player: EditorIcon = { id: 'offense-1', kind: 'offense', position: { x: 0.1, y: 0.1 } }
    const ball: EditorIcon = { id: 'ball-1', kind: 'ball', position: { x: 0.9, y: 0.9 } }
    expect(snapBallToNearestPlayer(ball, [player, ball], frame).holderId).toBeUndefined()
  })
})

describe('ボール保持者への追従', () => {
  const frame = createCourtFrame(390, 700, 28 / 15, 'full', 'portrait')
  const offense: EditorIcon = { id: 'offense-1', kind: 'offense', position: { x: 0.3, y: 0.3 } }
  const defense: EditorIcon = { id: 'defense-1', kind: 'defense', position: { x: 0.7, y: 0.7 } }
  const heldBall: EditorIcon = { id: 'ball-1', kind: 'ball', position: { x: 0.3, y: 0.3 }, holderId: offense.id }

  it('オフェンス選手の移動量だけ保持ボールも追従する', () => {
    const moved = moveIconWithFollowers([offense, defense, heldBall], offense.id, { x: 0.45, y: 0.5 }, frame)
    expect(moved.find((icon) => icon.id === heldBall.id)).toMatchObject({
      holderId: offense.id,
      position: { x: 0.45, y: 0.5 },
    })
  })

  it('ディフェンス選手にも同じように追従する', () => {
    const defenseBall = { ...heldBall, position: defense.position, holderId: defense.id }
    const moved = moveIconWithFollowers([offense, defense, defenseBall], defense.id, { x: 0.6, y: 0.55 }, frame)
    expect(moved.find((icon) => icon.id === heldBall.id)).toMatchObject({
      holderId: defense.id,
      position: { x: 0.6, y: 0.55 },
    })
  })

  it('ボールを保持者から離すとholderIdを解除する', () => {
    const moved = moveIconWithFollowers([offense, defense, heldBall], heldBall.id, { x: 0.9, y: 0.1 }, frame)
    expect(moved.find((icon) => icon.id === heldBall.id)?.holderId).toBeUndefined()
  })

  it('別の選手へ近づけると保持者を切り替える', () => {
    const moved = moveIconWithFollowers([offense, defense, heldBall], heldBall.id, { x: 0.69, y: 0.7 }, frame)
    expect(moved.find((icon) => icon.id === heldBall.id)).toMatchObject({
      holderId: defense.id,
      position: defense.position,
    })
  })
})
