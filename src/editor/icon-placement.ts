import type { Point } from '../court/court-config'
import type { IconKind } from '../db/database'
import type { EditorIcon } from './editor-geometry'

export type IconPlacement = {
  position: Point
  holderId?: string
}

export type BallPlacementDecision = {
  allowed: boolean
  endPlacement: boolean
  message?: string
}

export function placementOnIcon(kind: IconKind, target: EditorIcon): IconPlacement {
  const isPlayer = target.kind === 'offense' || target.kind === 'defense'
  return {
    position: { ...target.position },
    holderId: kind === 'ball' && isPlayer ? target.id : undefined,
  }
}

export function createPlacedIcon(
  id: string,
  kind: IconKind,
  position: Point,
  label: string,
  holderId?: string,
): EditorIcon {
  return {
    id,
    kind,
    label,
    position: { ...position },
    holderId: kind === 'ball' ? holderId : undefined,
  }
}

export function decideBallPlacement(
  icons: EditorIcon[],
  holderId?: string,
): BallPlacementDecision {
  if (holderId && icons.some((icon) => icon.kind === 'ball' && icon.holderId === holderId)) {
    return {
      allowed: false,
      endPlacement: true,
      message: 'この選手はすでにボールを持っています',
    }
  }
  return { allowed: true, endPlacement: true }
}

export function shouldEndPlacementAfterAdd(kind: IconKind) {
  return kind === 'ball'
}
