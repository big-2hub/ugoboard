import { describe, expect, it } from 'vitest'
import {
  createEditorFingerprint,
  hasUnsavedEditorChanges,
  requiresLeaveConfirmation,
  type SaveableEditorState,
} from './editor-save-state'

const initial: SaveableEditorState = {
  steps: [{ id: 'step-1', order: 1, icons: [] }],
  drawings: [],
  courtView: 'half',
  loopPlayback: false,
}

describe('手動保存の未保存判定', () => {
  it('編集で未保存になり、現在値を保存基準にすると解消する', () => {
    const saved = createEditorFingerprint(initial)
    const edited = {
      ...initial,
      steps: [{ ...initial.steps[0], icons: [{ id: 'offense-1', kind: 'offense' as const, position: { x: 0.5, y: 0.25 } }] }],
    }

    expect(hasUnsavedEditorChanges(saved, edited)).toBe(true)
    expect(hasUnsavedEditorChanges(createEditorFingerprint(edited), edited)).toBe(false)
  })

  it('ループ設定とコート表示の変更も未保存として扱う', () => {
    const saved = createEditorFingerprint(initial)
    expect(hasUnsavedEditorChanges(saved, { ...initial, loopPlayback: true })).toBe(true)
    expect(hasUnsavedEditorChanges(saved, { ...initial, courtView: 'full' })).toBe(true)
  })
})

describe('画面遷移の確認判定', () => {
  it('未保存で別画面へ移動するときだけ確認する', () => {
    expect(requiresLeaveConfirmation(true, '/editor/play-1', '/')).toBe(true)
    expect(requiresLeaveConfirmation(true, '/editor/play-1', '/playback')).toBe(true)
    expect(requiresLeaveConfirmation(false, '/editor/play-1', '/')).toBe(false)
    expect(requiresLeaveConfirmation(true, '/editor/play-1', '/editor/play-1')).toBe(false)
  })
})
