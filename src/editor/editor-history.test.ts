import { describe, expect, it } from 'vitest'
import type { EditorSnapshot } from './editor-types'
import { takePreviousSnapshot } from './editor-history'

describe('エディタのUndo', () => {
  it('ボール位置と保持者IDを同じスナップショットから復元する', () => {
    const beforeMove: EditorSnapshot = {
      icons: [
        { id: 'player-1', kind: 'offense', position: { x: 0.2, y: 0.3 } },
        {
          id: 'ball-1',
          kind: 'ball',
          position: { x: 0.2, y: 0.3 },
          holderId: 'player-1',
        },
      ],
      drawings: [],
    }

    const result = takePreviousSnapshot([beforeMove])

    expect(result?.snapshot.icons[1]).toMatchObject({
      position: { x: 0.2, y: 0.3 },
      holderId: 'player-1',
    })
    expect(result?.remainingHistory).toEqual([])
  })
})
