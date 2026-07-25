import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorIcon } from './editor-geometry'
import type { EditorStep } from './editor-steps'
import { getPlaybackFrame } from './step-playback'

export function useStepPlayback(steps: EditorStep[], onFinish: () => void) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [icons, setIcons] = useState<EditorIcon[]>()
  const frameId = useRef<number | undefined>(undefined)
  const startedAt = useRef<number | undefined>(undefined)
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  const cancelFrame = useCallback(() => {
    if (frameId.current !== undefined) cancelAnimationFrame(frameId.current)
    frameId.current = undefined
    startedAt.current = undefined
  }, [])

  const finish = useCallback(() => {
    cancelFrame()
    setIsPlaying(false)
    setIcons(undefined)
    finishRef.current()
  }, [cancelFrame])

  const tick = useCallback((timestamp: number) => {
    if (startedAt.current === undefined) startedAt.current = timestamp
    const frame = getPlaybackFrame(steps, timestamp - startedAt.current)
    if (!frame) {
      finish()
      return
    }
    setIcons(frame.icons)
    if (frame.finished) {
      finish()
      return
    }
    frameId.current = requestAnimationFrame(tick)
  }, [finish, steps])

  const start = useCallback(() => {
    if (steps.length < 2) return
    cancelFrame()
    setIcons(steps[0].icons)
    setIsPlaying(true)
    frameId.current = requestAnimationFrame(tick)
  }, [cancelFrame, steps, tick])

  const stop = useCallback(() => {
    if (!isPlaying) return
    finish()
  }, [finish, isPlaying])

  useEffect(() => cancelFrame, [cancelFrame])

  return { isPlaying, icons, start, stop }
}
