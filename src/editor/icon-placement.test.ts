import { describe, expect, it } from 'vitest'
import {
  createPlacedIcon,
  decideBallPlacement,
  placementOnIcon,
  shouldEndPlacementAfterAdd,
} from './icon-placement'

const player = {
  id: 'offense-1',
  kind: 'offense' as const,
  position: { x: 0.35, y: 0.2 },
}

describe('アイコン上への配置', () => {
  it('ボール配置で選手をタップするとholderId付きで同じ基準座標へ置く', () => {
    const placement = placementOnIcon('ball', player)
    const ball = createPlacedIcon('ball-1', 'ball', placement.position, '', placement.holderId)

    expect(ball).toMatchObject({
      position: player.position,
      holderId: player.id,
    })
  })

  it('空き場所へのボール配置はholderIdを持たない', () => {
    const ball = createPlacedIcon('ball-1', 'ball', { x: 0.7, y: 0.4 }, '')
    expect(ball.holderId).toBeUndefined()
  })

  it('ボールは1個配置したら配置モードを終了する', () => {
    expect(shouldEndPlacementAfterAdd('ball')).toBe(true)
    expect(shouldEndPlacementAfterAdd('offense')).toBe(false)
  })

  it('すでに保持中の選手への2個目のボール配置を拒否する', () => {
    const heldBall = createPlacedIcon('ball-1', 'ball', player.position, '', player.id)
    expect(decideBallPlacement([player, heldBall], player.id)).toEqual({
      allowed: false,
      endPlacement: true,
      message: 'この選手はすでにボールを持っています',
    })
  })
})
