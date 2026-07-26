import { describe, expect, it } from 'vitest'
import type { Play } from '../db/database'
import { collectPlayTags, filterPlays } from './play-library'

const base = { schemaVersion: 2, createdAt: '', updatedAt: '', courtConfigId: 'mini-basketball', courtView: 'half' as const, loopPlayback: false }
const plays: Play[] = [
  { ...base, id: '1', name: '作戦A', type: 'play', tags: ['オフェンス'] },
  { ...base, id: '2', name: 'ドリルB', type: 'drill', tags: ['オフェンス', '低学年'] },
]

describe('作戦一覧', () => {
  it('種別とタグを組み合わせて絞り込む', () => {
    expect(filterPlays(plays, { type: 'drill', tag: 'オフェンス' }).map((play) => play.id)).toEqual(['2'])
    expect(filterPlays(plays, { type: 'all', tag: '低学年' }).map((play) => play.id)).toEqual(['2'])
  })

  it('重複しないタグ一覧を返す', () => {
    expect(collectPlayTags(plays)).toEqual(['オフェンス', '低学年'])
  })
})
