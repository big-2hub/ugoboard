import { describe, expect, it } from 'vitest'
import type { EditorIcon } from './editor-geometry'
import { groupIconsByRenderOrder } from './icon-layer-order'

describe('アイコンの固定重なり順', () => {
  it('追加順に関係なく器具、選手、ボールの順へ分ける', () => {
    const icons: EditorIcon[] = [
      { id: 'ball', kind: 'ball', position: { x: 0.5, y: 0.5 } },
      { id: 'player', kind: 'offense', position: { x: 0.5, y: 0.5 } },
      { id: 'chair', kind: 'chair', position: { x: 0.5, y: 0.5 } },
      { id: 'defense', kind: 'defense', position: { x: 0.5, y: 0.5 } },
      { id: 'cone', kind: 'cone', position: { x: 0.5, y: 0.5 } },
    ]

    const groups = groupIconsByRenderOrder(icons)

    expect(groups.equipment.map((icon) => icon.id)).toEqual(['chair', 'cone'])
    expect(groups.players.map((icon) => icon.id)).toEqual(['player', 'defense'])
    expect(groups.balls.map((icon) => icon.id)).toEqual(['ball'])
  })

  it('保持中のボールも常にボール層へ入る', () => {
    const groups = groupIconsByRenderOrder([
      { id: 'ball', kind: 'ball', position: { x: 0.2, y: 0.3 }, holderId: 'player' },
    ])

    expect(groups.balls[0].holderId).toBe('player')
  })
})
