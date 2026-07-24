import { describe, expect, it } from 'vitest'
import { createId } from './create-id'

describe('createId', () => {
  it('randomUUIDが使える場合は利用する', () => {
    expect(createId('icon', { randomUUID: () => 'mobile-safe-uuid' }))
      .toBe('icon-mobile-safe-uuid')
  })

  it('randomUUIDがないスマホ環境でも重複しないIDを生成する', () => {
    const options = { randomUUID: null, now: () => 1234, random: () => 0.5 } as const
    const first = createId('icon', options)
    const second = createId('icon', options)
    expect(first).toMatch(/^icon-/)
    expect(second).not.toBe(first)
  })

  it('randomUUIDが実行時エラーになってもフォールバックする', () => {
    expect(() => createId('drawing', {
      randomUUID: () => { throw new Error('not supported') },
      now: () => 1234,
      random: () => 0.25,
    })).not.toThrow()
  })
})
