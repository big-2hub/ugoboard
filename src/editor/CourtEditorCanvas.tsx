import { useEffect, useMemo, useRef, useState } from 'react'
import { Arrow, Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CourtConfig, CourtLine, Point } from '../court/court-config'
import type { IconKind } from '../db/database'
import {
  clampNormalizedPosition,
  createCourtFrame,
  createZigzagPoints,
  normalizedToScreen,
  screenToNormalized,
  type CourtFrame,
  type CourtOrientation,
  type CourtView,
  type EditorIcon,
} from './editor-geometry'
import type { EditorDrawing, EditorMode } from './editor-types'
import {
  isCompletedDrawing,
  startDrawingGesture,
  updateDrawingGesture,
  type UnifiedPointerInput,
} from './drawing-gesture'

type Props = {
  config: CourtConfig
  view: CourtView
  orientation: CourtOrientation
  icons: EditorIcon[]
  drawings: EditorDrawing[]
  selectedIconId?: string
  mode: EditorMode
  color: string
  lineWidth: number
  onSelectIcon: (id?: string) => void
  onMoveIcon: (id: string, position: Point, frame: CourtFrame) => void
  onAddDrawing: (drawing: Omit<EditorDrawing, 'id'>) => void
}

const padding = 6
const isVisible = (line: CourtLine, view: CourtView) =>
  view === 'full' || (line.id !== 'center-circle' && !line.id.startsWith('bottom-'))

function DrawingShape({ drawing, frame, opacity = 1 }: { drawing: Omit<EditorDrawing, 'id'>; frame: CourtFrame; opacity?: number }) {
  const screenPoints = drawing.points.map((point) => normalizedToScreen(point, frame))
  const points = screenPoints.flatMap((point) => [point.x, point.y])
  if (drawing.type === 'freehand') {
    return <Line points={points} stroke={drawing.color} strokeWidth={drawing.width} opacity={opacity} lineCap="round" lineJoin="round" tension={0.25} />
  }
  if (drawing.type === 'line') {
    return <Line points={points} stroke={drawing.color} strokeWidth={drawing.width} opacity={opacity} lineCap="round" />
  }
  if (drawing.type === 'dribble' && screenPoints.length >= 2) {
    const zigzag = createZigzagPoints(screenPoints[0], screenPoints.at(-1)!, 12, Math.max(5, drawing.width * 1.5))
    return <Arrow points={zigzag} stroke={drawing.color} fill={drawing.color} strokeWidth={drawing.width} opacity={opacity} pointerLength={9} pointerWidth={8} lineCap="round" lineJoin="round" />
  }
  return (
    <Arrow
      points={points}
      stroke={drawing.color}
      fill={drawing.color}
      strokeWidth={drawing.width}
      opacity={opacity}
      dash={drawing.type === 'pass' ? [12, 8] : undefined}
      pointerLength={11}
      pointerWidth={10}
      lineCap="round"
      lineJoin="round"
    />
  )
}

function IconShape({ kind, label }: { kind: IconKind; label?: string }) {
  if (kind === 'ball') {
    return <Group><Circle radius={13} fill="#f5822b" stroke="#3b2415" strokeWidth={2} /><Line points={[-12, 0, 12, 0]} stroke="#3b2415" strokeWidth={1.5} /><Line points={[0, -12, 0, 12]} stroke="#3b2415" strokeWidth={1.5} /></Group>
  }
  if (kind === 'cone') {
    return <RegularPolygon sides={3} radius={18} rotation={0} fill="#ff8b2c" stroke="#fff3dd" strokeWidth={2} />
  }
  if (kind === 'chair') {
    return <Group><Rect x={-14} y={-13} width={28} height={22} cornerRadius={3} fill="#8b5e3c" stroke="#fff3dd" strokeWidth={2} /><Line points={[-10, 9, -12, 17, 10, 9, 12, 17]} stroke="#fff3dd" strokeWidth={2} /></Group>
  }
  const offense = kind === 'offense'
  return (
    <Group>
      <Circle radius={20} fill={offense ? '#f8f5ed' : '#173d2b'} stroke={offense ? '#173d2b' : '#f8f5ed'} strokeWidth={3} />
      <Text text={label || (offense ? 'O' : 'D')} x={-14} y={-10} width={28} align="center" fontSize={18} fontStyle="bold" fill={offense ? '#173d2b' : '#f8f5ed'} />
    </Group>
  )
}

export function CourtEditorCanvas(props: Props) {
  const {
    config, view, orientation, icons, drawings, selectedIconId, mode, color, lineWidth,
    onSelectIcon, onMoveIcon, onAddDrawing,
  } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 320, height: 480 })
  const [draft, setDraft] = useState<Omit<EditorDrawing, 'id'>>()
  const draftRef = useRef<Omit<EditorDrawing, 'id'> | undefined>(undefined)
  const drawingRef = useRef(false)
  const useTouchFallback = typeof window !== 'undefined' && !('PointerEvent' in window)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const frame = useMemo(
    () => createCourtFrame(size.width, size.height, config.aspectRatio, view, orientation, padding),
    [config.aspectRatio, orientation, size.height, size.width, view],
  )
  const strokeWidth = Math.max(1.5, config.lineWidthMeters / config.dimensionsMeters.width * frame.naturalWidth)
  const yScale = frame.naturalHeight / frame.visibleYMax
  const lineY = (value: number) => value / frame.visibleYMax * frame.naturalHeight
  const groupProps = orientation === 'landscape'
    ? { x: frame.x, y: frame.y + frame.naturalWidth, rotation: -90 }
    : { x: frame.x, y: frame.y, rotation: 0 }

  const readPointer = (event: KonvaEventObject<PointerEvent | TouchEvent>): UnifiedPointerInput | null => {
    const screen = event.target.getStage()?.getPointerPosition()
    const point = screen ? screenToNormalized(screen, frame) : null
    if (!point) return null
    const inputType = ('touches' in event.evt || ('pointerType' in event.evt && event.evt.pointerType === 'touch'))
      ? 'touch'
      : 'pointer'
    return { inputType, point }
  }

  const handlePointerDown = (event: KonvaEventObject<PointerEvent | TouchEvent>) => {
    if (mode === 'select') {
      if (event.target === event.target.getStage()) onSelectIcon(undefined)
      return
    }
    const input = readPointer(event)
    if (!input) return
    const nextDraft = startDrawingGesture(input, mode, color, lineWidth)
    if (!nextDraft) return
    drawingRef.current = true
    draftRef.current = nextDraft
    setDraft(nextDraft)
  }

  const handlePointerMove = (event: KonvaEventObject<PointerEvent | TouchEvent>) => {
    if (!drawingRef.current) return
    const input = readPointer(event)
    const current = draftRef.current
    if (!input || !current) return
    const nextDraft = updateDrawingGesture(current, input)
    draftRef.current = nextDraft
    setDraft(nextDraft)
  }

  const finishDrawing = () => {
    drawingRef.current = false
    const completedDraft = draftRef.current
    if (completedDraft && isCompletedDrawing(completedDraft)) onAddDrawing(completedDraft)
    draftRef.current = undefined
    setDraft(undefined)
  }

  return (
    <div
      className="court-host interactive-court"
      ref={hostRef}
      data-orientation={orientation}
      data-court-screen-width={Math.round(frame.screenWidth)}
      data-court-screen-height={Math.round(frame.screenHeight)}
      data-ball-holder-count={icons.filter((icon) => icon.kind === 'ball' && icon.holderId).length}
    >
      <Stage
        width={size.width}
        height={size.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
        onPointerCancel={finishDrawing}
        onTouchStart={useTouchFallback ? handlePointerDown : undefined}
        onTouchMove={useTouchFallback ? handlePointerMove : undefined}
        onTouchEnd={useTouchFallback ? finishDrawing : undefined}
      >
        <Layer listening={false}>
          <Group {...groupProps}>
            <Rect width={frame.naturalWidth} height={frame.naturalHeight} fill={config.colors.floor} stroke={config.colors.border} strokeWidth={strokeWidth} />
            {config.lines.filter((line) => isVisible(line, view)).map((line) => {
              if (line.type === 'line') return <Line key={line.id} points={[line.from.x * frame.naturalWidth, lineY(line.from.y), line.to.x * frame.naturalWidth, lineY(line.to.y)]} stroke={config.colors.line} strokeWidth={strokeWidth} />
              if (line.type === 'circle') return <Circle key={line.id} x={line.center.x * frame.naturalWidth} y={lineY(line.center.y)} radius={line.radius * frame.naturalWidth} stroke={config.colors.line} strokeWidth={strokeWidth} />
              if (line.type === 'rect') return <Rect key={line.id} x={line.x * frame.naturalWidth} y={lineY(line.y)} width={line.width * frame.naturalWidth} height={line.height * yScale} stroke={config.colors.line} strokeWidth={strokeWidth} />
              const arcPoints = Array.from({ length: 33 }, (_, index) => {
                const degrees = line.startAngle + (line.endAngle - line.startAngle) * index / 32
                const radians = degrees * Math.PI / 180
                return [
                  line.center.x * frame.naturalWidth + Math.cos(radians) * line.radius * frame.naturalWidth,
                  lineY(line.center.y) + Math.sin(radians) * line.radius * frame.naturalWidth,
                ]
              }).flat()
              return <Line key={line.id} points={arcPoints} stroke={config.colors.line} strokeWidth={strokeWidth} />
            })}
          </Group>
        </Layer>

        <Layer listening={false}>
          {drawings.map((drawing) => <DrawingShape key={drawing.id} drawing={drawing} frame={frame} />)}
          {draft && <DrawingShape drawing={draft} frame={frame} opacity={0.75} />}
        </Layer>

        <Layer>
          {icons.map((icon) => {
            const basePosition = normalizedToScreen(icon.position, frame)
            const heldOffset = icon.kind === 'ball' && icon.holderId ? { x: 14, y: -14 } : { x: 0, y: 0 }
            const selected = selectedIconId === icon.id
            return (
              <Group
                key={icon.id}
                x={basePosition.x + heldOffset.x}
                y={basePosition.y + heldOffset.y}
                draggable={mode === 'select'}
                onClick={() => onSelectIcon(icon.id)}
                onTap={() => onSelectIcon(icon.id)}
                onDragStart={() => onSelectIcon(icon.id)}
                onDragEnd={(event) => {
                  const normalized = screenToNormalized({ x: event.target.x(), y: event.target.y() }, frame)
                  if (normalized) onMoveIcon(icon.id, clampNormalizedPosition(normalized, frame), frame)
                }}
              >
                {selected && <Circle radius={27} stroke="#ffde59" strokeWidth={3} dash={[5, 4]} />}
                <IconShape kind={icon.kind} label={icon.label} />
              </Group>
            )
          })}
        </Layer>
      </Stage>
      <span className="orientation-indicator" aria-hidden="true">{orientation === 'landscape' ? '↻ 横持ち' : '↕ 縦持ち'}</span>
    </div>
  )
}
