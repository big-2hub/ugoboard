import type { IconKind } from '../db/database'
import type { EditorIcon } from './editor-geometry'

export const ICON_PLACEMENT_LIMITS: Record<IconKind, number> = {
  offense: 5,
  defense: 5,
  ball: 3,
  cone: 10,
  chair: 10,
}

export function countIconsOfKind(icons: EditorIcon[], kind: IconKind) {
  return icons.filter((icon) => icon.kind === kind).length
}

export function canPlaceIcon(icons: EditorIcon[], kind: IconKind) {
  return countIconsOfKind(icons, kind) < ICON_PLACEMENT_LIMITS[kind]
}

export function reachesPlacementLimitAfterAdd(icons: EditorIcon[], kind: IconKind) {
  return countIconsOfKind(icons, kind) + 1 >= ICON_PLACEMENT_LIMITS[kind]
}

export function shouldShowPlacementLimitMessage(icons: EditorIcon[], kind: IconKind) {
  return !canPlaceIcon(icons, kind)
}
