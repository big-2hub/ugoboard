import type { Point } from '../court/court-config'
import type { IconKind } from '../db/database'

export type CourtOrientation = 'portrait' | 'landscape'
export type CourtView = 'half' | 'full'

export type CourtFrame = {
  orientation: CourtOrientation
  x: number
  y: number
  naturalWidth: number
  naturalHeight: number
  screenWidth: number
  screenHeight: number
  visibleYMax: number
}

export type EditorIcon = {
  id: string
  kind: IconKind
  position: Point
  label?: string
  holderId?: string
}

export function getIconVisualFeedback(icon: EditorIcon, active: boolean) {
  return {
    position: { ...icon.position },
    scale: active ? 1.2 : 1,
  }
}

export function getBallDisplayRadius(ball: EditorIcon) {
  return ball.kind === 'ball' && ball.holderId ? 9 : 13
}

export function getCourtRenderScale(frame: CourtFrame, referenceCourtWidth = 360) {
  return clamp(frame.naturalWidth / referenceCourtWidth, 0.62, 1.15)
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function createCourtFrame(
  hostWidth: number,
  hostHeight: number,
  aspectRatio: number,
  view: CourtView,
  orientation: CourtOrientation,
  padding = 8,
): CourtFrame {
  const visibleYMax = view === 'half' ? 0.5 : 1
  const naturalRatio = aspectRatio * visibleYMax
  const availableWidth = Math.max(1, hostWidth - padding * 2)
  const availableHeight = Math.max(1, hostHeight - padding * 2)

  if (orientation === 'landscape') {
    const naturalWidth = Math.min(availableHeight, availableWidth / naturalRatio)
    const naturalHeight = naturalWidth * naturalRatio
    return {
      orientation,
      x: (hostWidth - naturalHeight) / 2,
      y: (hostHeight - naturalWidth) / 2,
      naturalWidth,
      naturalHeight,
      screenWidth: naturalHeight,
      screenHeight: naturalWidth,
      visibleYMax,
    }
  }

  const naturalWidth = Math.min(availableWidth, availableHeight / naturalRatio)
  const naturalHeight = naturalWidth * naturalRatio
  return {
    orientation,
    x: (hostWidth - naturalWidth) / 2,
    y: (hostHeight - naturalHeight) / 2,
    naturalWidth,
    naturalHeight,
    screenWidth: naturalWidth,
    screenHeight: naturalHeight,
    visibleYMax,
  }
}

export function normalizedToScreen(point: Point, frame: CourtFrame): Point {
  const localY = point.y / frame.visibleYMax * frame.naturalHeight
  if (frame.orientation === 'landscape') {
    return {
      x: frame.x + localY,
      y: frame.y + (1 - point.x) * frame.naturalWidth,
    }
  }
  return {
    x: frame.x + point.x * frame.naturalWidth,
    y: frame.y + localY,
  }
}

export function screenToNormalized(point: Point, frame: CourtFrame): Point | null {
  const inside = point.x >= frame.x
    && point.x <= frame.x + frame.screenWidth
    && point.y >= frame.y
    && point.y <= frame.y + frame.screenHeight
  if (!inside) return null

  if (frame.orientation === 'landscape') {
    return {
      x: clamp(1 - (point.y - frame.y) / frame.naturalWidth, 0, 1),
      y: clamp((point.x - frame.x) / frame.naturalHeight * frame.visibleYMax, 0, frame.visibleYMax),
    }
  }
  return {
    x: clamp((point.x - frame.x) / frame.naturalWidth, 0, 1),
    y: clamp((point.y - frame.y) / frame.naturalHeight * frame.visibleYMax, 0, frame.visibleYMax),
  }
}

export function clampNormalizedPosition(point: Point, frame: CourtFrame, margin = 0.025): Point {
  return {
    x: clamp(point.x, margin, 1 - margin),
    y: clamp(point.y, margin, frame.visibleYMax - margin),
  }
}

export function snapBallToNearestPlayer(
  ball: EditorIcon,
  icons: EditorIcon[],
  frame: CourtFrame,
  snapDistancePixels = 46,
): EditorIcon {
  if (ball.kind !== 'ball') return ball
  const ballScreen = normalizedToScreen(ball.position, frame)
  const players = icons.filter((icon) => icon.kind === 'offense' || icon.kind === 'defense')
  let nearest: EditorIcon | undefined
  let nearestDistance = snapDistancePixels

  for (const player of players) {
    const playerScreen = normalizedToScreen(player.position, frame)
    const distance = Math.hypot(ballScreen.x - playerScreen.x, ballScreen.y - playerScreen.y)
    if (distance <= nearestDistance) {
      nearest = player
      nearestDistance = distance
    }
  }

  return nearest
    ? { ...ball, position: { ...nearest.position }, holderId: nearest.id }
    : { ...ball, holderId: undefined }
}

export function moveIconWithFollowers(
  icons: EditorIcon[],
  id: string,
  position: Point,
  frame: CourtFrame,
): EditorIcon[] {
  const target = icons.find((icon) => icon.id === id)
  if (!target) return icons

  if (target.kind === 'ball') {
    const movedBall = { ...target, position, holderId: undefined }
    const candidates = icons.map((icon) => icon.id === id ? movedBall : icon)
    const snappedBall = snapBallToNearestPlayer(movedBall, candidates, frame)
    return candidates.map((icon) => icon.id === id ? snappedBall : icon)
  }

  if (target.kind !== 'offense' && target.kind !== 'defense') {
    return icons.map((icon) => icon.id === id ? { ...icon, position } : icon)
  }

  const delta = {
    x: position.x - target.position.x,
    y: position.y - target.position.y,
  }
  return icons.map((icon) => {
    if (icon.id === id) return { ...icon, position }
    if (icon.kind !== 'ball' || icon.holderId !== id) return icon
    return {
      ...icon,
      position: clampNormalizedPosition({
        x: icon.position.x + delta.x,
        y: icon.position.y + delta.y,
      }, frame),
    }
  })
}

export function createZigzagPoints(start: Point, end: Point, segments = 12, amplitude = 6): number[] {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return [start.x, start.y, end.x, end.y]
  const perpendicularX = -dy / length
  const perpendicularY = dx / length
  const result: number[] = []

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const offset = index === 0 || index === segments ? 0 : (index % 2 === 0 ? -amplitude : amplitude)
    result.push(
      start.x + dx * progress + perpendicularX * offset,
      start.y + dy * progress + perpendicularY * offset,
    )
  }
  return result
}

export function createDribbleArrowPoints(
  start: Point,
  end: Point,
  segments = 12,
  amplitude = 6,
  straightLength = 12,
): number[] {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length <= straightLength || length === 0) return [start.x, start.y, end.x, end.y]
  const bodyEnd = {
    x: end.x - dx / length * straightLength,
    y: end.y - dy / length * straightLength,
  }
  return [...createZigzagPoints(start, bodyEnd, segments, amplitude), end.x, end.y]
}
