import { describe, expect, it } from 'vitest'
import type { EditorIcon } from './editor-geometry'
import { canPlaceIcon, ICON_PLACEMENT_LIMITS, reachesPlacementLimitAfterAdd } from './icon-placement-limits'

const offenseIcons = (count: number): EditorIcon[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `offense-${index}`,
    kind: 'offense',
    position: { x: 0.5, y: 0.5 },
  }))

describe('種類別の配置上限', () => {
  it('上限値を1か所で管理する', () => {
    expect(ICON_PLACEMENT_LIMITS).toEqual({
      offense: 5,
      defense: 5,
      ball: 3,
      cone: 10,
      chair: 10,
    })
  })

  it('攻撃の5個目は置けて、配置後に上限へ達する', () => {
    const icons = offenseIcons(4)
    expect(canPlaceIcon(icons, 'offense')).toBe(true)
    expect(reachesPlacementLimitAfterAdd(icons, 'offense')).toBe(true)
  })

  it('攻撃の6個目は置けない', () => {
    expect(canPlaceIcon(offenseIcons(5), 'offense')).toBe(false)
  })
})
