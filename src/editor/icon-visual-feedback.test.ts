import { describe, expect, it, vi } from 'vitest'
import type { EditorIcon } from './editor-geometry'
import { syncIconVisualFeedback } from './icon-visual-feedback'

const player: EditorIcon = {
  id: 'player-1',
  kind: 'offense',
  position: { x: 0.25, y: 0.5 },
}
const looseBall: EditorIcon = {
  id: 'ball-loose',
  kind: 'ball',
  position: { x: 0.75, y: 0.5 },
}
const heldBall: EditorIcon = {
  id: 'ball-held',
  kind: 'ball',
  holderId: player.id,
  position: player.position,
}

function feedbackNode() {
  return { to: vi.fn() }
}

describe('アイコンの描画フィードバック経路', () => {
  it('他の選手を操作しても単独ボールの描画グループへ倍率変更を送らない', () => {
    const playerNode = feedbackNode()
    const looseBallNode = feedbackNode()
    const nodes = new Map([
      [player.id, playerNode],
      [looseBall.id, looseBallNode],
    ])

    const activeIds = syncIconVisualFeedback(
      [player, looseBall],
      player.id,
      nodes,
      new Set(),
    )

    expect(playerNode.to).toHaveBeenCalledWith(expect.objectContaining({
      scaleX: 1.2,
      scaleY: 1.2,
    }))
    expect(looseBallNode.to).not.toHaveBeenCalled()

    syncIconVisualFeedback([player, looseBall], undefined, nodes, activeIds)

    expect(playerNode.to).toHaveBeenLastCalledWith(expect.objectContaining({
      scaleX: 1,
      scaleY: 1,
    }))
    expect(looseBallNode.to).not.toHaveBeenCalled()
  })

  it('保持者を操作したときは保持ボールだけを同じ倍率で描画する', () => {
    const playerNode = feedbackNode()
    const heldBallNode = feedbackNode()
    const nodes = new Map([
      [player.id, playerNode],
      [heldBall.id, heldBallNode],
    ])

    syncIconVisualFeedback(
      [player, heldBall],
      player.id,
      nodes,
      new Set(),
    )

    expect(playerNode.to).toHaveBeenCalledWith(expect.objectContaining({ scaleX: 1.2 }))
    expect(heldBallNode.to).toHaveBeenCalledWith(expect.objectContaining({ scaleX: 1.2 }))
  })
})
