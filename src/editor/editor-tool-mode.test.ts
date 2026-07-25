import { describe, expect, it } from 'vitest'
import { canDragIcon, chooseDrawing, choosePlacement, closeDrawingPalette } from './editor-tool-mode'

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

  it('線種選択では描画モードを継続する', () => {
    expect(chooseDrawing('pass').editorMode).toBe('pass')
  })

  it('描画パレットを閉じると選択モードへ戻り、すぐドラッグできる', () => {
    const closed = closeDrawingPalette()
    expect(closed).toEqual({
      editorMode: 'select',
      placementKind: undefined,
    })
    expect(canDragIcon(closed.editorMode, closed.placementKind)).toBe(true)
  })

  it('描画・削除・配置中はドラッグできない', () => {
    expect(canDragIcon('arrow')).toBe(false)
    expect(canDragIcon('delete')).toBe(false)
    expect(canDragIcon('select', 'offense')).toBe(false)
  })
})
