import { describe, expect, it } from 'vitest'
import type { EditorSnapshot } from './editor-types'
import { deleteDrawingFromSnapshot, deleteIconFromSnapshot } from './editor-delete'
import { takePreviousSnapshot } from './editor-history'

const original: EditorSnapshot = {
  icons: [
    { id: 'player', kind: 'offense', position: { x: 0.2, y: 0.3 } },
    { id: 'ball', kind: 'ball', position: { x: 0.2, y: 0.3 }, holderId: 'player' },
  ],
  drawings: [
    { id: 'line', type: 'line', points: [{ x: 0.1, y: 0.1 }, { x: 0.8, y: 0.8 }], color: '#fff', width: 2 },
  ],
}

describe('削除モード', () => {
  it('アイコンを削除し、保持者参照も解除する', () => {
    const deleted = deleteIconFromSnapshot(original, 'player')
    expect(deleted.icons).toEqual([
      expect.objectContaining({ id: 'ball', holderId: undefined }),
    ])
  })

  it('描画をタップ削除できる', () => {
    expect(deleteDrawingFromSnapshot(original, 'line').drawings).toEqual([])
  })

  it('削除前スナップショットをUndoで復元できる', () => {
    const deleted = deleteDrawingFromSnapshot(original, 'line')
    const restored = takePreviousSnapshot([original])?.snapshot
    expect(deleted.drawings).toEqual([])
    expect(restored).toEqual(original)
  })
})
