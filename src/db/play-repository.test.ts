import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { UgoBoardDatabase } from './database'
import { deletePlay, duplicatePlay, loadPlayDocument, savePlayDocument } from './play-repository'

const databases: UgoBoardDatabase[] = []
afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()))
  databases.length = 0
})

function createDatabase() {
  const database = new UgoBoardDatabase(`play-repository-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

const sample = {
  name: 'ピック&ロール',
  type: 'drill' as const,
  tags: ['オフェンス', 'パス'],
  courtView: 'full' as const,
  loopPlayback: true,
  rosterId: 'roster-1',
  includePhotosInShare: false,
  steps: [
    {
      id: 'step-1',
      order: 1,
      icons: [
        { id: 'player-1', kind: 'offense' as const, label: 'O', position: { x: 0.2, y: 0.3 }, playerId: 'member-7' },
        { id: 'ball-1', kind: 'ball' as const, label: '', position: { x: 0.2, y: 0.3 }, holderId: 'player-1' },
      ],
      holderId: 'player-1',
    },
    {
      id: 'step-2',
      order: 2,
      icons: [
        { id: 'player-1', kind: 'offense' as const, label: 'O', position: { x: 0.7, y: 0.4 }, playerId: 'member-7' },
        { id: 'ball-1', kind: 'ball' as const, label: '', position: { x: 0.7, y: 0.4 }, holderId: 'player-1' },
      ],
      holderId: 'player-1',
    },
  ],
  drawings: [{ id: 'drawing-1', type: 'arrow' as const, points: [{ x: 0.2, y: 0.3 }, { x: 0.7, y: 0.4 }], color: '#ef4444', width: 4 }],
}

describe('作戦の保存と読込', () => {
  it('全ステップ・保持者・描画・コート表示・ループ設定を復元する', async () => {
    const database = createDatabase()
    const id = await savePlayDocument(sample, database, '2026-07-25T01:00:00.000Z')
    const loaded = await loadPlayDocument(id, database)

    expect(loaded?.play).toMatchObject({
      name: sample.name,
      type: 'drill',
      tags: sample.tags,
      courtView: 'full',
      loopPlayback: true,
      rosterId: 'roster-1',
      includePhotosInShare: false,
    })
    expect(loaded?.steps).toEqual(sample.steps)
    expect(loaded?.drawings).toEqual(sample.drawings)
  })

  it('複製と、関連ステップ・描画を含む削除ができる', async () => {
    const database = createDatabase()
    const originalId = await savePlayDocument(sample, database)
    const copiedId = await duplicatePlay(originalId, database)
    const copied = await loadPlayDocument(copiedId, database)

    expect(copiedId).not.toBe(originalId)
    expect(copied?.play.name).toBe(`${sample.name} のコピー`)
    expect(copied?.steps.map((step) => step.id)).not.toEqual(sample.steps.map((step) => step.id))
    expect(copied?.steps.map((step) => step.icons)).toEqual(sample.steps.map((step) => step.icons))

    await deletePlay(originalId, database)
    expect(await database.plays.get(originalId)).toBeUndefined()
    expect(await database.steps.where('playId').equals(originalId).count()).toBe(0)
    expect(await database.drawings.where('playId').equals(originalId).count()).toBe(0)
    expect(await database.plays.get(copiedId)).toBeDefined()
  })
})
