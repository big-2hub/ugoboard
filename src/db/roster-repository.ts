import { createId } from '../utils/create-id'
import {
  DATA_SCHEMA_VERSION,
  db,
  type Player,
  type Roster,
  type UgoBoardDatabase,
} from './database'

const recordFields = (now: string) => ({
  schemaVersion: DATA_SCHEMA_VERSION,
  createdAt: now,
  updatedAt: now,
})

export async function listRosters(database: UgoBoardDatabase = db): Promise<Roster[]> {
  return database.rosters.orderBy('updatedAt').reverse().toArray()
}

export async function createRoster(
  teamName: string,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<Roster> {
  const roster: Roster = {
    ...recordFields(now),
    id: createId('roster'),
    teamName: teamName.trim(),
    playerIds: [],
  }
  await database.rosters.add(roster)
  return roster
}

export async function renameRoster(
  rosterId: string,
  teamName: string,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<void> {
  await database.rosters.update(rosterId, { teamName: teamName.trim(), updatedAt: now })
}

export async function deleteRoster(
  rosterId: string,
  database: UgoBoardDatabase = db,
): Promise<void> {
  await database.transaction('rw', database.rosters, database.players, database.plays, async () => {
    await database.players.where('rosterId').equals(rosterId).delete()
    await database.plays.where('rosterId').equals(rosterId).modify({ rosterId: undefined })
    await database.rosters.delete(rosterId)
  })
}

export async function listRosterPlayers(
  rosterId: string,
  database: UgoBoardDatabase = db,
): Promise<Player[]> {
  const [roster, players] = await Promise.all([
    database.rosters.get(rosterId),
    database.players.where('rosterId').equals(rosterId).toArray(),
  ])
  if (!roster) return []
  const byId = new Map(players.map((player) => [player.id, player]))
  const ordered = roster.playerIds.flatMap((id) => {
    const player = byId.get(id)
    return player ? [player] : []
  })
  const orderedIds = new Set(ordered.map((player) => player.id))
  return [...ordered, ...players.filter((player) => !orderedIds.has(player.id))]
}

export type PlayerInput = {
  displayName: string
  jerseyNumber: string
  photo?: Blob
}

export async function addPlayer(
  rosterId: string,
  input: PlayerInput,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<Player> {
  const player: Player = {
    ...recordFields(now),
    id: createId('player'),
    rosterId,
    displayName: input.displayName.trim(),
    jerseyNumber: input.jerseyNumber.trim(),
    photo: input.photo,
  }
  await database.transaction('rw', database.rosters, database.players, async () => {
    const roster = await database.rosters.get(rosterId)
    if (!roster) throw new Error('ロスターが見つかりません')
    await database.players.add(player)
    await database.rosters.update(rosterId, {
      playerIds: [...roster.playerIds, player.id],
      updatedAt: now,
    })
  })
  return player
}

export async function updatePlayer(
  playerId: string,
  input: PlayerInput,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<void> {
  await database.players.update(playerId, {
    displayName: input.displayName.trim(),
    jerseyNumber: input.jerseyNumber.trim(),
    photo: input.photo,
    updatedAt: now,
  })
}

export async function deletePlayer(
  playerId: string,
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<void> {
  await database.transaction('rw', database.rosters, database.players, async () => {
    const player = await database.players.get(playerId)
    if (!player) return
    const roster = await database.rosters.get(player.rosterId)
    if (roster) {
      await database.rosters.update(roster.id, {
        playerIds: roster.playerIds.filter((id) => id !== playerId),
        updatedAt: now,
      })
    }
    await database.players.delete(playerId)
  })
}

export async function reorderPlayers(
  rosterId: string,
  playerIds: string[],
  database: UgoBoardDatabase = db,
  now = new Date().toISOString(),
): Promise<void> {
  const existing = await database.players.where('rosterId').equals(rosterId).primaryKeys()
  const existingSet = new Set(existing)
  const unique = [...new Set(playerIds)]
  if (unique.length !== existing.length || unique.some((id) => !existingSet.has(id))) {
    throw new Error('並び替え対象の選手が一致しません')
  }
  await database.rosters.update(rosterId, { playerIds: unique, updatedAt: now })
}
