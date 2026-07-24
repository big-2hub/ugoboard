import type { EditorSnapshot } from './editor-types'

export function takePreviousSnapshot(history: EditorSnapshot[]) {
  if (history.length === 0) return undefined
  return {
    snapshot: history.at(-1)!,
    remainingHistory: history.slice(0, -1),
  }
}
