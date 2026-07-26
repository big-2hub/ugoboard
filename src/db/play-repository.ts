import type { EditorStep } from '../editor/editor-steps'
import type { EditorDrawing } from '../editor/editor-types'
import type { EditorIcon } from '../editor/editor-geometry'
import { createId } from '../utils/create-id'
import {
  DATA_SCHEMA_VERSION,
  db,
  type Drawing,
  type IconSnapshot,
  type Play,
  type PlayType,
  type Step,
  type UgoBoardDatabase,
} from './database'

export type PlayMetadata = {
  name: string
  type: PlayType
  tags: string[]
  courtView: 'half' | 'full'
  loopPlayback: boolean
  rosterId?: string
  includePhotosInShare?: boolean
}

export type PlayDocument = {
  play: Play
  steps: EditorStep[]
  drawings: EditorDrawing[]
}

export type SavePlayInput = PlayMetadata & {
  id?: string
  steps: EditorStep[]
  drawings: EditorDrawing[]
}

const clonePoint = (point: { x: number; y: number }) => ({ ...point })

function toStoredIcon(icon: EditorIcon): IconSnapshot {
  return {
    iconId: icon.id,
    kind: icon.kind,
    position: clonePoint(icon.position),
    label: icon.label,
    holderId: icon.holderId,
    playerId: icon.playerId,
  }
}

function toEditorIcon(icon: IconSnapshot): EditorIcon {
  return {
    id: icon.iconId,
    kind: icon.kind,
    position: clonePoint(icon.position),
    label: icon.label ?? '',
    holderId: icon.holderId,
    playerId: icon.playerId,
  }
}

export async function savePlayDocument(
  input: SavePlayInput,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<string> {
  const id = input.id ?? createId('play')
  const existing = await database.plays.get(id)
  const record = {
    schemaVersion: DATA_SCHEMA_VERSION,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const play: Play = {
    ...record,
    id,
    name: input.name.trim(),
    type: input.type,
    tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))],
    courtConfigId: 'jba-u12-28x15',
    courtView: input.courtView,
    loopPlayback: input.loopPlayback,
    rosterId: input.rosterId,
    includePhotosInShare: input.includePhotosInShare ?? false,
  }
  const steps: Step[] = input.steps.map((step) => ({
    ...record,
    id: step.id,
    playId: id,
    order: step.order,
    icons: step.icons.map(toStoredIcon),
    holderId: step.holderId,
    note: step.note,
    motionControlPoints: step.motionControlPoints?.map((item) => ({
      iconId: item.iconId,
      points: item.points.map(clonePoint),
    })),
  }))
  const drawings: Drawing[] = input.drawings.map((drawing) => ({
    ...record,
    id: drawing.id,
    playId: id,
    type: drawing.type,
    points: drawing.points.map(clonePoint),
    style: { color: drawing.color, width: drawing.width, opacity: 1 },
  }))

  await database.transaction('rw', database.plays, database.steps, database.drawings, async () => {
    await database.plays.put(play)
    await database.steps.where('playId').equals(id).delete()
    await database.drawings.where('playId').equals(id).delete()
    await database.steps.bulkPut(steps)
    await database.drawings.bulkPut(drawings)
  })
  return id
}

export async function loadPlayDocument(
  id: string,
  database: UgoBoardDatabase = db,
): Promise<PlayDocument | undefined> {
  const play = await database.plays.get(id)
  if (!play) return undefined
  play.includePhotosInShare ??= false
  const [steps, drawings] = await Promise.all([
    database.steps.where('playId').equals(id).sortBy('order'),
    database.drawings.where('playId').equals(id).toArray(),
  ])
  return {
    play,
    steps: steps.map((step) => ({
      id: step.id,
      order: step.order,
      icons: step.icons.map(toEditorIcon),
      holderId: step.holderId,
      note: step.note,
      motionControlPoints: step.motionControlPoints?.map((item) => ({
        iconId: item.iconId,
        points: item.points.map(clonePoint),
      })),
    })),
    drawings: drawings.map((drawing) => ({
      id: drawing.id,
      type: drawing.type,
      points: drawing.points.map(clonePoint),
      color: drawing.style.color,
      width: drawing.style.width,
    })),
  }
}

export async function listPlays(database: UgoBoardDatabase = db): Promise<Play[]> {
  return database.plays.orderBy('updatedAt').reverse().toArray()
}

export async function updatePlayMetadata(
  id: string,
  metadata: Pick<PlayMetadata, 'name' | 'type' | 'tags'>,
  database: UgoBoardDatabase = db,
): Promise<void> {
  await database.plays.update(id, {
    name: metadata.name.trim(),
    type: metadata.type,
    tags: [...new Set(metadata.tags.map((tag) => tag.trim()).filter(Boolean))],
    updatedAt: new Date().toISOString(),
  })
}

export async function duplicatePlay(id: string, database: UgoBoardDatabase = db): Promise<string> {
  const document = await loadPlayDocument(id, database)
  if (!document) throw new Error('複製元の作戦が見つかりません')
  const stepIds = new Map(document.steps.map((step) => [step.id, createId('step')]))
  return savePlayDocument({
    name: `${document.play.name} のコピー`,
    type: document.play.type,
    tags: document.play.tags,
    courtView: document.play.courtView,
    loopPlayback: document.play.loopPlayback,
    rosterId: document.play.rosterId,
    includePhotosInShare: document.play.includePhotosInShare ?? false,
    steps: document.steps.map((step) => ({ ...step, id: stepIds.get(step.id)!, icons: step.icons.map((icon) => ({ ...icon, position: clonePoint(icon.position) })) })),
    drawings: document.drawings.map((drawing) => ({ ...drawing, id: createId('drawing'), points: drawing.points.map(clonePoint) })),
  }, database)
}

export async function deletePlay(id: string, database: UgoBoardDatabase = db): Promise<void> {
  await database.transaction('rw', database.plays, database.steps, database.drawings, async () => {
    await database.steps.where('playId').equals(id).delete()
    await database.drawings.where('playId').equals(id).delete()
    await database.plays.delete(id)
  })
}
