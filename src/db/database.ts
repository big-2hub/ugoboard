import Dexie, { type EntityTable } from 'dexie'
import type { CourtConfig, Point } from '../court/court-config'

export const DATA_SCHEMA_VERSION = 1

export type StoredRecord = {
  id: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export type AppSetting = StoredRecord & {
  value: string
}

export type StoredCourtConfig = CourtConfig & StoredRecord

export type Roster = StoredRecord & {
  teamName: string
  playerIds: string[]
}

export type Player = StoredRecord & {
  rosterId: string
  displayName: string
  jerseyNumber: string
  photo?: Blob
  includePhotoInShare: boolean
}

export type PlayType = 'play' | 'drill'

export type Play = StoredRecord & {
  name: string
  type: PlayType
  tags: string[]
  courtConfigId: string
  rosterId?: string
  loopPlayback: boolean
}

export type IconKind = 'offense' | 'defense' | 'ball' | 'cone' | 'chair'

export type IconSnapshot = {
  iconId: string
  kind: IconKind
  position: Point
  playerId?: string
  label?: string
}

export type Step = StoredRecord & {
  playId: string
  order: number
  icons: IconSnapshot[]
  ballHolderIconId?: string
  note?: string
}

export type DrawingType = 'freehand' | 'line' | 'arrow' | 'pass' | 'dribble'

export type DrawingStyle = {
  color: string
  width: number
  opacity: number
}

export type Drawing = StoredRecord & {
  playId: string
  stepId?: string
  type: DrawingType
  points: Point[]
  style: DrawingStyle
}

export type BackupEnvelope = {
  schemaVersion: number
  exportedAt: string
  courtConfigs: StoredCourtConfig[]
  rosters: Roster[]
  players: Player[]
  plays: Play[]
  steps: Step[]
  drawings: Drawing[]
}

export class UgoBoardDatabase extends Dexie {
  settings!: EntityTable<AppSetting, 'id'>
  courtConfigs!: EntityTable<StoredCourtConfig, 'id'>
  rosters!: EntityTable<Roster, 'id'>
  players!: EntityTable<Player, 'id'>
  plays!: EntityTable<Play, 'id'>
  steps!: EntityTable<Step, 'id'>
  drawings!: EntityTable<Drawing, 'id'>

  constructor(name = 'ugoboard') {
    super(name)

    // 公開済みのversion 1は変更せず、既存端末のデータを安全に引き継ぐ。
    this.version(1).stores({ settings: 'id, updatedAt' })

    this.version(2).stores({
      settings: 'id, updatedAt',
      courtConfigs: 'id, name, updatedAt',
      rosters: 'id, teamName, updatedAt',
      players: 'id, rosterId, jerseyNumber, updatedAt',
      plays: 'id, type, courtConfigId, rosterId, updatedAt, *tags',
      steps: 'id, playId, [playId+order], updatedAt',
      drawings: 'id, playId, stepId, type, updatedAt',
    })
  }
}

export const db = new UgoBoardDatabase()
