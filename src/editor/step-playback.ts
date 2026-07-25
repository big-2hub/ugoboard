import type { Point } from '../court/court-config'
import type { EditorIcon } from './editor-geometry'
import type { EditorStep } from './editor-steps'

export const STEP_PLAYBACK_DURATION_MS = 1000

export function interpolatePoint(from: Point, to: Point, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress))
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  }
}

function interpolateBall(
  from: EditorIcon,
  to: EditorIcon,
  progress: number,
  interpolatedIcons: EditorIcon[],
) {
  if (from.holderId && from.holderId === to.holderId) {
    const holder = interpolatedIcons.find((icon) => icon.id === from.holderId)
    return {
      ...to,
      position: holder ? { ...holder.position } : interpolatePoint(from.position, to.position, progress),
      holderId: from.holderId,
    }
  }

  return {
    ...to,
    position: interpolatePoint(from.position, to.position, progress),
    holderId: progress >= 1 ? to.holderId : undefined,
  }
}

export function interpolateStepIcons(
  fromIcons: EditorIcon[],
  toIcons: EditorIcon[],
  progress: number,
): EditorIcon[] {
  if (progress <= 0) return fromIcons.map((icon) => ({ ...icon, position: { ...icon.position } }))
  if (progress >= 1) return toIcons.map((icon) => ({ ...icon, position: { ...icon.position } }))

  const fromById = new Map(fromIcons.map((icon) => [icon.id, icon]))
  const nonBalls = toIcons
    .filter((icon) => icon.kind !== 'ball')
    .map((to) => {
      const from = fromById.get(to.id)
      return {
        ...to,
        position: from ? interpolatePoint(from.position, to.position, progress) : { ...to.position },
      }
    })
  const balls = toIcons
    .filter((icon) => icon.kind === 'ball')
    .map((to) => {
      const from = fromById.get(to.id)
      return from ? interpolateBall(from, to, progress, nonBalls) : { ...to, position: { ...to.position } }
    })

  const byId = new Map([...nonBalls, ...balls].map((icon) => [icon.id, icon]))
  return toIcons.map((icon) => byId.get(icon.id)!)
}

export type PlaybackFrame = {
  icons: EditorIcon[]
  segmentIndex: number
  progress: number
  finished: boolean
}

export function getPlaybackFrame(
  steps: EditorStep[],
  elapsedMs: number,
  segmentDurationMs = STEP_PLAYBACK_DURATION_MS,
): PlaybackFrame | undefined {
  if (steps.length === 0) return undefined
  if (steps.length === 1) {
    return { icons: steps[0].icons, segmentIndex: 0, progress: 1, finished: true }
  }

  const totalDuration = (steps.length - 1) * segmentDurationMs
  const elapsed = Math.max(0, Math.min(totalDuration, elapsedMs))
  const finished = elapsed >= totalDuration
  const segmentIndex = finished
    ? steps.length - 2
    : Math.min(Math.floor(elapsed / segmentDurationMs), steps.length - 2)
  const progress = finished ? 1 : (elapsed - segmentIndex * segmentDurationMs) / segmentDurationMs

  return {
    icons: interpolateStepIcons(steps[segmentIndex].icons, steps[segmentIndex + 1].icons, progress),
    segmentIndex,
    progress,
    finished,
  }
}

export function canEditDuringPlayback(isPlaying: boolean) {
  return !isPlaying
}
