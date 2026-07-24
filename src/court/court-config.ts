export type Point = { x: number; y: number }
export type CourtLine =
  | { type: 'line'; id: string; from: Point; to: Point }
  | { type: 'circle'; id: string; center: Point; radius: number }
  | { type: 'arc'; id: string; center: Point; radius: number; startAngle: number; endAngle: number }
  | { type: 'rect'; id: string; x: number; y: number; width: number; height: number }

export type CourtConfig = {
  id: string
  name: string
  dimensionsMeters: { length: number; width: number }
  aspectRatio: number
  lineWidthMeters: number
  freeThrowDistanceFromBackboardMeters: number
  circleRadiusMeters: number
  restrictedArea: { shape: 'rectangle'; widthMeters: number }
  threePoint: { enabled: boolean; radiusMeters: number | null; sidelineDistanceMeters: number | null }
  noChargeSemicircle: { enabled: boolean; radiusMeters: number | null }
  colors: { floor: string; line: string; border: string }
  lines: CourtLine[]
}

const length = 28
const width = 15
const freeThrowY = (1.2 + 4) / length
const radius = 1.8 / width
const keyWidth = 4.9 / width

export const miniBasketballCourt: CourtConfig = {
  id: 'jba-u12-28x15',
  name: 'JBA U12 ミニバスコート',
  dimensionsMeters: { length, width },
  aspectRatio: length / width,
  lineWidthMeters: 0.05,
  freeThrowDistanceFromBackboardMeters: 4,
  circleRadiusMeters: 1.8,
  restrictedArea: { shape: 'rectangle', widthMeters: 4.9 },
  threePoint: { enabled: false, radiusMeters: null, sidelineDistanceMeters: null },
  noChargeSemicircle: { enabled: false, radiusMeters: null },
  colors: { floor: '#d6a565', line: '#fffaf0', border: '#fffaf0' },
  lines: [
    { type: 'line', id: 'center-line', from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.5 } },
    { type: 'circle', id: 'center-circle', center: { x: 0.5, y: 0.5 }, radius },
    { type: 'rect', id: 'top-key', x: 0.5 - keyWidth / 2, y: 0, width: keyWidth, height: freeThrowY },
    { type: 'arc', id: 'top-free-throw-arc', center: { x: 0.5, y: freeThrowY }, radius, startAngle: 0, endAngle: 180 },
    { type: 'rect', id: 'bottom-key', x: 0.5 - keyWidth / 2, y: 1 - freeThrowY, width: keyWidth, height: freeThrowY },
    { type: 'arc', id: 'bottom-free-throw-arc', center: { x: 0.5, y: 1 - freeThrowY }, radius, startAngle: 180, endAngle: 360 },
  ],
}
