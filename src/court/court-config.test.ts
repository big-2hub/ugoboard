import { describe, expect, it } from 'vitest'
import { miniBasketballCourt } from './court-config'
describe('miniBasketballCourt', () => {
  it('JBA U12の主要仕様を保持する', () => {
    expect(miniBasketballCourt.dimensionsMeters).toEqual({ length: 28, width: 15 })
    expect(miniBasketballCourt.lineWidthMeters).toBe(0.05)
    expect(miniBasketballCourt.freeThrowDistanceFromBackboardMeters).toBe(4)
    expect(miniBasketballCourt.circleRadiusMeters).toBe(1.8)
    expect(miniBasketballCourt.threePoint.enabled).toBe(false)
    expect(miniBasketballCourt.noChargeSemicircle.enabled).toBe(false)
  })
})
