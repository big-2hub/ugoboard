import { describe, expect, it } from 'vitest'
import type { EditorIcon } from './editor-geometry'
import {
  canPlaceIcon,
  ICON_PLACEMENT_LIMITS,
  reachesPlacementLimitAfterAdd,
  shouldShowPlacementLimitMessage,
} from './icon-placement-limits'

const offenseIcons = (count: number): EditorIcon[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `offense-${index}`,
    kind: 'offense',
    position: { x: 0.5, y: 0.5 },
  }))

const iconsOfKind = (kind: EditorIcon['kind'], count: number): EditorIcon[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index}`,
    kind,
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

  it('上限へ到達した配置時は通知せず、次の超過操作で初めて通知する', () => {
    expect(shouldShowPlacementLimitMessage(offenseIcons(4), 'offense')).toBe(false)
    expect(shouldShowPlacementLimitMessage(offenseIcons(5), 'offense')).toBe(true)
  })

  it.each(Object.entries(ICON_PLACEMENT_LIMITS) as Array<[EditorIcon['kind'], number]>)(
    '%sは上限到達時ではなく、上限を超えて選ぼうとしたときだけ通知する',
    (kind, limit) => {
      expect(shouldShowPlacementLimitMessage(iconsOfKind(kind, limit - 1), kind)).toBe(false)
      expect(shouldShowPlacementLimitMessage(iconsOfKind(kind, limit), kind)).toBe(true)
    },
  )
})
