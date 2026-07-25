import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorStep } from './editor-steps'
import {
  advancePlayback,
  createPlaybackRuntimeState,
  getRuntimePlaybackIcons,
  seekPlaybackStep,
  type PlaybackRuntimeState,
  type PlaybackSpeed,
} from './step-playback'

const idlePlaybackState: PlaybackRuntimeState = {
  ...createPlaybackRuntimeState(),
  active: false,
}

export function useStepPlayback(steps: EditorStep[], onFinish: () => void) {
  const [runtime, setRuntime] = useState(idlePlaybackState)
  const frameId = useRef<number | undefined>(undefined)
  const finishRef = useRef(onFinish)
  const wasActive = useRef(false)
  finishRef.current = onFinish

  useEffect(() => {
    if (wasActive.current && !runtime.active) finishRef.current()
    wasActive.current = runtime.active
  }, [runtime.active])

  useEffect(() => {
    if (!runtime.active || runtime.paused) return
    let previousTime = performance.now()

    const tick = (timestamp: number) => {
      const deltaMs = timestamp - previousTime
      previousTime = timestamp
      setRuntime((current) => advancePlayback(current, deltaMs, steps.length))
      frameId.current = requestAnimationFrame(tick)
    }

    frameId.current = requestAnimationFrame(tick)
    return () => {
      if (frameId.current !== undefined) cancelAnimationFrame(frameId.current)
      frameId.current = undefined
    }
  }, [runtime.active, runtime.paused, steps.length])

  const start = useCallback(() => {
    if (steps.length < 2) return
    setRuntime((current) => createPlaybackRuntimeState(current.speed, current.loop))
  }, [steps.length])

  const stop = useCallback(() => {
    setRuntime((current) => current.active ? { ...current, active: false, paused: false } : current)
  }, [])

  const togglePause = useCallback(() => {
    setRuntime((current) => current.active ? { ...current, paused: !current.paused } : current)
  }, [])

  const seek = useCallback((direction: -1 | 1) => {
    setRuntime((current) => seekPlaybackStep(current, direction, steps.length))
  }, [steps.length])

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setRuntime((current) => ({ ...current, speed }))
  }, [])

  const toggleLoop = useCallback(() => {
    setRuntime((current) => ({
      ...current,
      loop: !current.loop,
      loopDelayRemainingMs: current.loop ? 0 : current.loopDelayRemainingMs,
    }))
  }, [])

  return {
    isPlaying: runtime.active,
    isPaused: runtime.paused,
    icons: getRuntimePlaybackIcons(steps, runtime),
    speed: runtime.speed,
    loop: runtime.loop,
    segmentIndex: runtime.segmentIndex,
    progress: runtime.progress,
    waitingForLoop: runtime.loopDelayRemainingMs > 0,
    start,
    stop,
    togglePause,
    seekBack: () => seek(-1),
    seekForward: () => seek(1),
    setSpeed,
    toggleLoop,
  }
}
