import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { DATA_SCHEMA_VERSION, UgoBoardDatabase, type Play, type Step } from './database'

const databases: UgoBoardDatabase[] = []
const timestamp = '2026-07-25T00:00:00.000Z'
const record = { schemaVersion: DATA_SCHEMA_VERSION, createdAt: timestamp, updatedAt: timestamp }

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()))
  databases.length = 0
})

describe('UgoBoardDatabase version 2', () => {
  it('version 1を保ったまま必要な全テーブルを作る', async () => {
    const database = new UgoBoardDatabase(`ugoboard-test-${crypto.randomUUID()}`)
    databases.push(database)
    await database.open()

    expect(database.verno).toBe(2)
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      'courtConfigs', 'drawings', 'players', 'plays', 'rosters', 'settings', 'steps',
    ])
  })

  it('PlayとStepを保存して関連IDから取得できる', async () => {
    const database = new UgoBoardDatabase(`ugoboard-test-${crypto.randomUUID()}`)
    databases.push(database)
    const play: Play = {
      ...record,
      id: 'play-1',
      name: 'パス&ラン',
      type: 'drill',
      tags: ['オフェンス'],
      courtConfigId: 'jba-u12-28x15',
      loopPlayback: true,
    }
    const step: Step = {
      ...record,
      id: 'step-1',
      playId: play.id,
      order: 0,
      icons: [{ iconId: 'offense-1', kind: 'offense', position: { x: 0.25, y: 0.75 } }],
      note: 'ゴールへカット',
    }

    await database.transaction('rw', database.plays, database.steps, async () => {
      await database.plays.add(play)
      await database.steps.add(step)
    })

    expect(await database.plays.get('play-1')).toMatchObject({ type: 'drill', loopPlayback: true })
    expect(await database.steps.where('playId').equals('play-1').first()).toMatchObject({
      order: 0,
      note: 'ゴールへカット',
    })
  })
})
