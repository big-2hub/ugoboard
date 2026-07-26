import { describe, expect, it } from 'vitest'
import { fitImageSize } from './resize-player-photo'

describe('顔写真の保存サイズ', () => {
  it('縦横比を保ったまま最大辺を256px以下にする', () => {
    expect(fitImageSize(1200, 800)).toEqual({ width: 256, height: 171 })
    expect(fitImageSize(120, 80)).toEqual({ width: 120, height: 80 })
  })
})
