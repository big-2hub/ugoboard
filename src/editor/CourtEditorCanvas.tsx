import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Arrow, Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CourtConfig, CourtLine, Point } from '../court/court-config'
import type { IconKind } from '../db/database'
import {
  clampNormalizedPosition,
  createCourtFrame,
  createDribbleArrowPoints,
  getBallDisplayRadius,
  getCourtRenderScale,
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
import { groupIconsByRenderOrder } from './icon-layer-order'
import { canDragIcon, canInteractWithIcons, resetTransientIconState } from './editor-tool-mode'
import { placementOnIcon } from './icon-placement'
import { syncIconVisualFeedback } from './icon-visual-feedback'

type Props = {
  config: CourtConfig
  view: CourtView
  orientation: CourtOrientation
  icons: EditorIcon[]
  drawings: EditorDrawing[]
  selectedIconId?: string
  mode: EditorMode
  placementKind?: IconKind
  color: string
  lineWidth: number
  onSelectIcon: (id?: string) => void
  onPlaceIcon: (kind: IconKind, position: Point, holderId?: string) => void
  onMoveIcon: (id: string, position: Point, frame: CourtFrame) => void
  onAddDrawing: (drawing: Omit<EditorDrawing, 'id'>) => void
  onDeleteIcon: (id: string) => void
  onDeleteDrawing: (id: string) => void
}

const padding = 6
const isVisible = (line: CourtLine, view: CourtView) =>
  view === 'full' || (line.id !== 'center-circle' && !line.id.startsWith('bottom-'))

function DrawingShape({ drawing, frame, renderScale, opacity = 1, onDelete }: { drawing: Omit<EditorDrawing, 'id'>; frame: CourtFrame; renderScale: number; opacity?: number; onDelete?: () => void }) {
  const screenPoints = drawing.points.map((point) => normalizedToScreen(point, frame))
  const points = screenPoints.flatMap((point) => [point.x, point.y])
  const displayWidth = Math.max(1.5, drawing.width * renderScale)
  const interaction = onDelete
    ? { onClick: onDelete, onTap: onDelete, hitStrokeWidth: Math.max(28, displayWidth + 20) }
    : { listening: false }
  if (drawing.type === 'freehand') {
    return <Line {...interaction} points={points} stroke={drawing.color} strokeWidth={displayWidth} opacity={opacity} lineCap="round" lineJoin="round" tension={0.25} />
  }
  if (drawing.type === 'line') {
    return <Line {...interaction} points={points} stroke={drawing.color} strokeWidth={displayWidth} opacity={opacity} lineCap="round" />
  }
  if (drawing.type === 'dribble' && screenPoints.length >= 2) {
    const zigzag = createDribbleArrowPoints(screenPoints[0], screenPoints.at(-1)!, 12, Math.max(4, displayWidth * 1.5), Math.max(8, 12 * renderScale))
    return <Arrow {...interaction} points={zigzag} stroke={drawing.color} fill={drawing.color} strokeWidth={displayWidth} opacity={opacity} pointerLength={Math.max(7, 9 * renderScale)} pointerWidth={Math.max(6, 8 * renderScale)} lineCap="round" lineJoin="round" />
  }
  return (
    <Arrow
      {...interaction}
      points={points}
      stroke={drawing.color}
      fill={drawing.color}
      strokeWidth={displayWidth}
      opacity={opacity}
      dash={drawing.type === 'pass' ? [12, 8] : undefined}
      pointerLength={Math.max(8, 11 * renderScale)}
      pointerWidth={Math.max(7, 10 * renderScale)}
      lineCap="round"
      lineJoin="round"
    />
  )
}

function IconShape({ icon, renderScale }: { icon: EditorIcon; renderScale: number }) {
  if (icon.kind === 'ball') {
    const radius = getBallDisplayRadius(icon) * renderScale
    const seam = radius - 1
    return <Group><Circle radius={22} opacity={0} /><Circle radius={radius} fill="#f5822b" stroke="#3b2415" strokeWidth={Math.max(1.5, 2 * renderScale)} /><Line points={[-seam, 0, seam, 0]} stroke="#3b2415" strokeWidth={Math.max(1, 1.5 * renderScale)} /><Line points={[0, -seam, 0, seam]} stroke="#3b2415" strokeWidth={Math.max(1, 1.5 * renderScale)} /></Group>
  }
  if (icon.kind === 'cone') {
    return <Group><Circle radius={22} opacity={0} /><RegularPolygon sides={3} radius={18 * renderScale} rotation={0} fill="#ff8b2c" stroke="#fff3dd" strokeWidth={Math.max(1.5, 2 * renderScale)} /></Group>
  }
  if (icon.kind === 'chair') {
    return <Group><Circle radius={22} opacity={0} /><Rect x={-14 * renderScale} y={-13 * renderScale} width={28 * renderScale} height={22 * renderScale} cornerRadius={3 * renderScale} fill="#8b5e3c" stroke="#fff3dd" strokeWidth={Math.max(1.5, 2 * renderScale)} /><Line points={[-10, 9, -12, 17, 10, 9, 12, 17].map((value) => value * renderScale)} stroke="#fff3dd" strokeWidth={Math.max(1.5, 2 * renderScale)} /></Group>
  }
  const offense = icon.kind === 'offense'
  return (
    <Group>
      <Circle radius={22} opacity={0} />
      <Circle radius={20 * renderScale} fill={offense ? '#f8f5ed' : '#173d2b'} stroke={offense ? '#173d2b' : '#f8f5ed'} strokeWidth={Math.max(1.5, 3 * renderScale)} />
      <Text text={icon.label || (offense ? 'O' : 'D')} x={-14 * renderScale} y={-10 * renderScale} width={28 * renderScale} align="center" fontSize={18 * renderScale} fontStyle="bold" fill={offense ? '#173d2b' : '#f8f5ed'} />
    </Group>
  )
}

export function CourtEditorCanvas(props: Props) {
  const {
    config, view, orientation, icons, drawings, selectedIconId, mode, placementKind, color, lineWidth,
    onSelectIcon, onPlaceIcon, onMoveIcon, onAddDrawing, onDeleteIcon, onDeleteDrawing,
  } = props
  const hostRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 320, height: 480 })
  const [draft, setDraft] = useState<Omit<EditorDrawing, 'id'>>()
  const draftRef = useRef<Omit<EditorDrawing, 'id'> | undefined>(undefined)
  const drawingRef = useRef(false)
  const [activeIconId, setActiveIconId] = useState<string>()
  const iconNodeRefs = useRef(new Map<string, Konva.Group>())
  const previousActiveIconIds = useRef(new Set<string>())
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
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

  useEffect(() => () => {
    deleteTimers.current.forEach((timer) => clearTimeout(timer))
  }, [])

  const frame = useMemo(
    () => createCourtFrame(size.width, size.height, config.aspectRatio, view, orientation, padding),
    [config.aspectRatio, orientation, size.height, size.width, view],
  )
  const strokeWidth = Math.max(1.5, config.lineWidthMeters / config.dimensionsMeters.width * frame.naturalWidth)
  const renderScale = getCourtRenderScale(frame)
  const yScale = frame.naturalHeight / frame.visibleYMax
  const lineY = (value: number) => value / frame.visibleYMax * frame.naturalHeight
  const groupProps = orientation === 'landscape'
    ? { x: frame.x, y: frame.y + frame.naturalWidth, rotation: -90 }
    : { x: frame.x, y: frame.y, rotation: 0 }
  const iconGroups = useMemo(() => groupIconsByRenderOrder(icons), [icons])
  const selectedIcon = icons.find((icon) => icon.id === selectedIconId)

  useEffect(() => {
    setActiveIconId(resetTransientIconState())
  }, [mode, placementKind])

  useEffect(() => {
    previousActiveIconIds.current = syncIconVisualFeedback(
      icons,
      activeIconId,
      iconNodeRefs.current,
      previousActiveIconIds.current,
    )
  }, [activeIconId, icons])

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
    if (mode === 'delete') return
    if (mode === 'select') {
      if (event.target === event.target.getStage()) {
        const input = readPointer(event)
        if (placementKind && input) {
          onPlaceIcon(placementKind, clampNormalizedPosition(input.point, frame))
        } else {
          onSelectIcon(undefined)
        }
      }
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

  const renderIcon = (icon: EditorIcon) => {
    const basePosition = normalizedToScreen(icon.position, frame)
    const heldOffset = icon.kind === 'ball' && icon.holderId ? { x: 14 * renderScale, y: -14 * renderScale } : { x: 0, y: 0 }
    const activate = (event: KonvaEventObject<PointerEvent | TouchEvent>) => {
      event.cancelBubble = true
      setActiveIconId(icon.id)
      if (placementKind) {
        const placement = placementOnIcon(placementKind, icon)
        onPlaceIcon(placementKind, placement.position, placement.holderId)
      }
    }
    const release = () => {
      if (mode !== 'delete') setActiveIconId(undefined)
    }
    const performAction = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      event.cancelBubble = true
      if (placementKind) {
        return
      }
      if (mode === 'delete') {
        if (deleteTimers.current.has(icon.id)) return
        const timer = setTimeout(() => {
          deleteTimers.current.delete(icon.id)
          setActiveIconId(undefined)
          onDeleteIcon(icon.id)
        }, 120)
        deleteTimers.current.set(icon.id, timer)
        return
      }
      onSelectIcon(icon.id)
    }
    return (
      <Group
        key={icon.id}
        ref={(node) => {
          if (node) iconNodeRefs.current.set(icon.id, node)
          else iconNodeRefs.current.delete(icon.id)
        }}
        x={basePosition.x + heldOffset.x}
        y={basePosition.y + heldOffset.y}
        draggable={canDragIcon(mode, placementKind)}
        onPointerDown={activate}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={performAction}
        onTap={performAction}
        onDragStart={() => {
          setActiveIconId(icon.id)
          onSelectIcon(icon.id)
        }}
        onDragMove={(event) => {
          if (icon.kind !== 'offense' && icon.kind !== 'defense') return
          icons
            .filter((item) => item.kind === 'ball' && item.holderId === icon.id)
            .forEach((ball) => {
              iconNodeRefs.current.get(ball.id)?.position({
                x: event.target.x() + 14 * renderScale,
                y: event.target.y() - 14 * renderScale,
              })
            })
        }}
        onDragEnd={(event) => {
          const normalized = screenToNormalized({ x: event.target.x(), y: event.target.y() }, frame)
          if (normalized) onMoveIcon(icon.id, clampNormalizedPosition(normalized, frame), frame)
          setActiveIconId(undefined)
        }}
      >
        <IconShape icon={icon} renderScale={renderScale} />
      </Group>
    )
  }

  return (
    <div
      className="court-host interactive-court"
      ref={hostRef}
      data-orientation={orientation}
      data-court-screen-width={Math.round(frame.screenWidth)}
      data-court-screen-height={Math.round(frame.screenHeight)}
      data-render-scale={renderScale.toFixed(3)}
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

        <Layer listening={mode === 'delete'}>
          {drawings.map((drawing) => <DrawingShape key={drawing.id} drawing={drawing} frame={frame} renderScale={renderScale} onDelete={mode === 'delete' ? () => onDeleteDrawing(drawing.id) : undefined} />)}
          {draft && <DrawingShape drawing={draft} frame={frame} renderScale={renderScale} opacity={0.75} />}
        </Layer>

        <Layer listening={canInteractWithIcons(mode)}>{iconGroups.equipment.map(renderIcon)}</Layer>
        <Layer listening={canInteractWithIcons(mode)}>{iconGroups.players.map(renderIcon)}</Layer>
        <Layer listening={canInteractWithIcons(mode)}>{iconGroups.balls.map(renderIcon)}</Layer>
        <Layer listening={false}>
          {selectedIcon && (() => {
            const position = normalizedToScreen(selectedIcon.position, frame)
            const offset = selectedIcon.kind === 'ball' && selectedIcon.holderId ? { x: 14 * renderScale, y: -14 * renderScale } : { x: 0, y: 0 }
            const hasHeldBall = (selectedIcon.kind === 'offense' || selectedIcon.kind === 'defense')
              && icons.some((icon) => icon.kind === 'ball' && icon.holderId === selectedIcon.id)
            if (hasHeldBall) {
              return (
                <Rect
                  x={position.x - 27 * renderScale}
                  y={position.y - 30 * renderScale}
                  width={57 * renderScale}
                  height={57 * renderScale}
                  cornerRadius={27 * renderScale}
                  stroke="#ffde59"
                  strokeWidth={3}
                  dash={[5, 4]}
                />
              )
            }
            return <Circle x={position.x + offset.x} y={position.y + offset.y} radius={27 * renderScale} stroke="#ffde59" strokeWidth={Math.max(2, 3 * renderScale)} dash={[5, 4]} />
          })()}
        </Layer>
      </Stage>
      <span className="orientation-indicator" aria-hidden="true">{orientation === 'landscape' ? '↻ 横持ち' : '↕ 縦持ち'}</span>
    </div>
  )
}
