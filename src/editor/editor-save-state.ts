import type { EditorStep } from './editor-steps'
import type { EditorDrawing } from './editor-types'

export type SaveableEditorState = {
  steps: EditorStep[]
  drawings: EditorDrawing[]
  courtView: 'half' | 'full'
  loopPlayback: boolean
  rosterId?: string
}

export function createEditorFingerprint(state: SaveableEditorState): string {
  return JSON.stringify(state)
}

export function hasUnsavedEditorChanges(savedFingerprint: string, state: SaveableEditorState): boolean {
  return savedFingerprint !== createEditorFingerprint(state)
}

export function requiresLeaveConfirmation(
  hasUnsavedChanges: boolean,
  currentPath: string,
  destination: string,
): boolean {
  return hasUnsavedChanges && destination !== currentPath
}
