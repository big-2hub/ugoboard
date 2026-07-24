import Dexie, { type EntityTable } from 'dexie'
export type AppSetting = { id: string; value: string; createdAt: string; updatedAt: string }
export class UgoBoardDatabase extends Dexie {
  settings!: EntityTable<AppSetting, 'id'>
  constructor() {
    super('ugoboard')
    this.version(1).stores({ settings: 'id, updatedAt' })
  }
}
export const db = new UgoBoardDatabase()
