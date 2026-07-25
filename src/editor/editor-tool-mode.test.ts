import { describe, expect, it } from 'vitest'
import { chooseDrawing, choosePlacement } from './editor-tool-mode'

describe('配置・描画モード切替', () => {
  it('配置対象を選ぶと選択モードのまま連続配置対象を保持する', () => {
    expect(choosePlacement('offense')).toEqual({
      editorMode: 'select',
      placementKind: 'offense',
    })
  })

  it('描画モードを選ぶと配置対象を解除する', () => {
    expect(chooseDrawing('arrow')).toEqual({
      editorMode: 'arrow',
      placementKind: undefined,
    })
  })
})
