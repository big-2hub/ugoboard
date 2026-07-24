import { useEffect, useRef, useState } from 'react'
import { Circle, Layer, Line, Rect, Stage } from 'react-konva'
import type { CourtConfig, CourtLine } from './court-config'

type Props = { config: CourtConfig; view: 'full' | 'half' }
const padding = 12
const isVisible = (line: CourtLine, view: Props['view']) =>
  view === 'full' || (line.id !== 'center-circle' && !line.id.startsWith('bottom-'))

export function CourtCanvas({ config, view }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 320, height: 480 })
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const lengthPart = view === 'full' ? 1 : 0.5
  const ratio = config.aspectRatio * lengthPart
  const availableWidth = Math.max(1, size.width - padding * 2)
  const availableHeight = Math.max(1, size.height - padding * 2)
  const width = Math.min(availableWidth, availableHeight / ratio)
  const height = width * ratio
  const xOffset = (size.width - width) / 2
  const yOffset = (size.height - height) / 2
  const strokeWidth = Math.max(1.5, config.lineWidthMeters / config.dimensionsMeters.width * width)
  const yScale = height / lengthPart
  const y = (value: number) => view === 'full' ? value * height : value * yScale

  return <div className="court-host" ref={hostRef}>
    <Stage width={size.width} height={size.height}><Layer x={xOffset} y={yOffset}>
      <Rect width={width} height={height} fill={config.colors.floor} stroke={config.colors.border} strokeWidth={strokeWidth}/>
      {config.lines.filter((line) => isVisible(line, view)).map((line) => {
        if (line.type === 'line') return <Line key={line.id} points={[line.from.x * width, y(line.from.y), line.to.x * width, y(line.to.y)]} stroke={config.colors.line} strokeWidth={strokeWidth}/>
        if (line.type === 'circle') return <Circle key={line.id} x={line.center.x * width} y={y(line.center.y)} radius={line.radius * width} stroke={config.colors.line} strokeWidth={strokeWidth}/>
        if (line.type === 'rect') return <Rect key={line.id} x={line.x * width} y={y(line.y)} width={line.width * width} height={line.height * yScale} stroke={config.colors.line} strokeWidth={strokeWidth}/>
        const points = Array.from({ length: 33 }, (_, index) => {
          const degrees = line.startAngle + (line.endAngle - line.startAngle) * index / 32
          const radians = degrees * Math.PI / 180
          return [
            line.center.x * width + Math.cos(radians) * line.radius * width,
            y(line.center.y) + Math.sin(radians) * line.radius * width,
          ]
        }).flat()
        return <Line key={line.id} points={points} stroke={config.colors.line} strokeWidth={strokeWidth}/>
      })}
    </Layer></Stage>
  </div>
}
