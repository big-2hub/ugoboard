import { describe, expect, it } from 'vitest'
import type { Player } from '../db/database'
import { decoratePlayerIcons, getPlayerIconText } from './player-icon-display'

const player: Player = {
  id: 'member-7',
  rosterId: 'roster-1',
  displayName: 'ユウ',
  jerseyNumber: '7',
  schemaVersion: 3,
  createdAt: '',
  updatedAt: '',
}

describe('選手アイコン表示', () => {
  it('未割り当ての攻守アイコンへ種類ごとの配置順1〜5を付ける', () => {
    const icons = decoratePlayerIcons([
      { id: 'o1', kind: 'offense', position: { x: 0.1, y: 0.1 } },
      { id: 'd1', kind: 'defense', position: { x: 0.2, y: 0.1 } },
      { id: 'o2', kind: 'offense', position: { x: 0.3, y: 0.1 } },
    ], [])
    expect(icons.map((icon) => icon.defaultNumber)).toEqual([1, 1, 2])
    expect(icons.map(getPlayerIconText)).toEqual(['1', '1', '2'])
  })

  it('割り当て済みなら表示名・背番号・写真を優先する', () => {
    const [icon] = decoratePlayerIcons(
      [{ id: 'o1', kind: 'offense', position: { x: 0.1, y: 0.1 }, playerId: player.id }],
      [player],
      new Map([[player.id, 'blob:photo']]),
    )
    expect(icon).toMatchObject({ displayName: 'ユウ', jerseyNumber: '7', photoUrl: 'blob:photo' })
    expect(getPlayerIconText(icon)).toBe('ユウ')
  })
})
