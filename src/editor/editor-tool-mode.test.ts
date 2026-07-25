import { describe, expect, it } from 'vitest'
import {
  canDragIcon,
  canInteractWithIcons,
  chooseDrawing,
  choosePlacement,
  closeDrawingPalette,
  finishPlacementFlow,
  resetForStepOperation,
  resetTransientIconState,
} from './editor-tool-mode'

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

  it('描画モード中はアイコンがタッチに反応しない', () => {
    expect(canInteractWithIcons('freehand')).toBe(false)
    expect(canInteractWithIcons('dribble')).toBe(false)
    expect(canInteractWithIcons('select')).toBe(true)
    expect(canInteractWithIcons('delete')).toBe(true)
  })

  it('配置完了・自動終了後は配置パレットを開く', () => {
    expect(finishPlacementFlow()).toEqual({
      editorMode: 'select',
      placementKind: undefined,
      openPlacementPalette: true,
    })
  })

  it('モード切替時は一時的な拡大対象を解除する', () => {
    expect(resetTransientIconState()).toBeUndefined()
  })
  it.each(['add', 'delete', 'select'] as const)(
    'ステップ%s後は描画・配置・パレットを解除し、すぐドラッグできる',
    (operation) => {
      const reset = resetForStepOperation(operation)

      expect(reset).toEqual({
        editorMode: 'select',
        placementKind: undefined,
        openPalette: undefined,
      })
      expect(canDragIcon(reset.editorMode, reset.placementKind)).toBe(true)
    },
  )
})
