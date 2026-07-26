import { describe, expect, it } from 'vitest'
import type { Player, Play } from '../db/database'
import { createSharePayload } from './create-share-payload'

const timestamp = '2026-07-26T00:00:00.000Z'
const basePlay = {
  id: 'play-1',
  schemaVersion: 3,
  createdAt: timestamp,
  updatedAt: timestamp,
  name: 'パス&ラン',
  type: 'play',
  tags: [],
  courtConfigId: 'jba-u12-28x15',
  courtView: 'half',
  loopPlayback: false,
} satisfies Omit<Play, 'includePhotosInShare'>

const player: Player = {
  id: 'player-1',
  schemaVersion: 3,
  createdAt: timestamp,
  updatedAt: timestamp,
  rosterId: 'roster-1',
  displayName: 'ユウ',
  jerseyNumber: '7',
  photo: new Blob(['private-photo'], { type: 'image/jpeg' }),
}

const documentBase = {
  steps: [{ id: 'step-1', order: 1, icons: [], holderId: undefined }],
  drawings: [],
}

describe('共有用データのプライバシー', () => {
  it.each([
    ['デフォルト状態', undefined],
    ['写真を含めるフラグOFF', false],
    ['現MVPではフラグONでも安全側', true],
  ])('%sでは顔写真を一切含めない', (_label, includePhotosInShare) => {
    const payload = createSharePayload({
      ...documentBase,
      play: { ...basePlay, includePhotosInShare } as Play,
    }, [player])

    expect(payload.play.includePhotosInShare).toBe(false)
    expect(payload.players).toEqual([{ id: 'player-1', displayName: 'ユウ', jerseyNumber: '7' }])
    expect(JSON.stringify(payload)).not.toContain('photo')
    expect('photo' in payload.players[0]).toBe(false)
  })
})
