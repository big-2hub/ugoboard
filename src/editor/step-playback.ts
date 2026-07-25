import type { Point } from '../court/court-config'
import type { EditorIcon } from './editor-geometry'
import type { EditorStep } from './editor-steps'

export const STEP_PLAYBACK_DURATION_MS = 1000
export const LOOP_PLAYBACK_DELAY_MS = 500
export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const
export type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number]

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

export type PlaybackRuntimeState = {
  active: boolean
  paused: boolean
  segmentIndex: number
  progress: number
  speed: PlaybackSpeed
  loop: boolean
  loopDelayRemainingMs: number
}

export function createPlaybackRuntimeState(
  speed: PlaybackSpeed = 1,
  loop = false,
): PlaybackRuntimeState {
  return {
    active: true,
    paused: false,
    segmentIndex: 0,
    progress: 0,
    speed,
    loop,
    loopDelayRemainingMs: 0,
  }
}

export function advancePlayback(
  state: PlaybackRuntimeState,
  deltaMs: number,
  stepCount: number,
): PlaybackRuntimeState {
  if (!state.active || state.paused || stepCount < 2 || deltaMs <= 0) return state

  let remainingMs = deltaMs
  let next = { ...state }

  if (next.loopDelayRemainingMs > 0) {
    if (remainingMs < next.loopDelayRemainingMs) {
      return { ...next, loopDelayRemainingMs: next.loopDelayRemainingMs - remainingMs }
    }
    remainingMs -= next.loopDelayRemainingMs
    next = { ...next, segmentIndex: 0, progress: 0, loopDelayRemainingMs: 0 }
  }

  const segmentDuration = STEP_PLAYBACK_DURATION_MS / next.speed
  let progress = next.progress + remainingMs / segmentDuration
  let segmentIndex = next.segmentIndex

  while (progress >= 1) {
    const overflow = progress - 1
    if (segmentIndex < stepCount - 2) {
      segmentIndex += 1
      progress = overflow
      continue
    }
    if (!next.loop) {
      return { ...next, active: false, segmentIndex, progress: 1, loopDelayRemainingMs: 0 }
    }
    return {
      ...next,
      segmentIndex,
      progress: 1,
      loopDelayRemainingMs: LOOP_PLAYBACK_DELAY_MS,
    }
  }

  return { ...next, segmentIndex, progress }
}

export function seekPlaybackStep(
  state: PlaybackRuntimeState,
  direction: -1 | 1,
  stepCount: number,
): PlaybackRuntimeState {
  if (!state.active || stepCount < 2) return state
  const currentStepIndex = state.loopDelayRemainingMs > 0 || state.progress >= 1
    ? state.segmentIndex + 1
    : state.segmentIndex
  const targetStepIndex = Math.max(0, Math.min(stepCount - 1, currentStepIndex + direction))

  if (targetStepIndex === stepCount - 1) {
    return {
      ...state,
      segmentIndex: stepCount - 2,
      progress: 1,
      loopDelayRemainingMs: state.loop ? LOOP_PLAYBACK_DELAY_MS : 0,
    }
  }
  return { ...state, segmentIndex: targetStepIndex, progress: 0, loopDelayRemainingMs: 0 }
}

export function getRuntimePlaybackIcons(
  steps: EditorStep[],
  state: PlaybackRuntimeState,
): EditorIcon[] | undefined {
  if (!state.active || steps.length < 2) return undefined
  return interpolateStepIcons(
    steps[state.segmentIndex].icons,
    steps[state.segmentIndex + 1].icons,
    state.progress,
  )
}
