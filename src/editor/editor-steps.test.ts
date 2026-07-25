import { describe, expect, it } from 'vitest'
import {
  addIconToEveryStep,
  createInitialStep,
  deleteIconFromEveryStep,
  duplicateStep,
  updateStepIcons,
} from './editor-steps'

const player = {
  id: 'player-1',
  kind: 'offense' as const,
  position: { x: 0.2, y: 0.3 },
}
const ball = {
  id: 'ball-1',
  kind: 'ball' as const,
  position: { x: 0.2, y: 0.3 },
  holderId: player.id,
}

describe('editor steps', () => {
  it('現在の座標とボール保持者を複製し、切替後も各座標を復元できる', () => {
    const first = { ...createInitialStep('step-1'), icons: [player, ball], holderId: player.id }
    const copied = duplicateStep([first], first.id, 'step-2')

    expect(copied[1].icons).toEqual(first.icons)
    expect(copied[1].holderId).toBe(player.id)

    const moved = updateStepIcons(copied, 'step-2', (icons) =>
      icons.map((icon) => icon.id === player.id
        ? { ...icon, position: { x: 0.8, y: 0.7 } }
        : icon),
    )
    expect(moved[0].icons.find((icon) => icon.id === player.id)?.position).toEqual({ x: 0.2, y: 0.3 })
    expect(moved[1].icons.find((icon) => icon.id === player.id)?.position).toEqual({ x: 0.8, y: 0.7 })
  })

  it('アイコンの追加と削除を全ステップへ反映する', () => {
    const twoSteps = duplicateStep([createInitialStep('step-1')], 'step-1', 'step-2')
    const added = addIconToEveryStep(twoSteps, player)
    expect(added.every((step) => step.icons.some((icon) => icon.id === player.id))).toBe(true)

    const removed = deleteIconFromEveryStep(added, player.id)
    expect(removed.every((step) => step.icons.length === 0)).toBe(true)
  })

  it('新しい保持ボールは全ステップへ追加し、holderIdは現在ステップだけに設定する', () => {
    const twoSteps = duplicateStep([createInitialStep('step-1')], 'step-1', 'step-2')
    const added = addIconToEveryStep(twoSteps, ball, 'step-2')

    expect(added[0].icons.find((icon) => icon.id === ball.id)?.holderId).toBeUndefined()
    expect(added[1].icons.find((icon) => icon.id === ball.id)?.holderId).toBe(player.id)
  })
})
