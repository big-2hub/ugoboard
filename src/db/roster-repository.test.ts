import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { UgoBoardDatabase } from './database'
import {
  addPlayer,
  createRoster,
  deletePlayer,
  deleteRoster,
  listRosterPlayers,
  listRosters,
  renameRoster,
  reorderPlayers,
  updatePlayer,
} from './roster-repository'

const databases: UgoBoardDatabase[] = []
afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()))
  databases.length = 0
})

function createDatabase() {
  const database = new UgoBoardDatabase(`roster-repository-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

describe('ロスターと選手のCRUD', () => {
  it('チームを作成・名前変更・削除できる', async () => {
    const database = createDatabase()
    const roster = await createRoster('川原ミニバス', database)
    await renameRoster(roster.id, '川原U12', database)
    expect(await database.rosters.get(roster.id)).toMatchObject({ teamName: '川原U12', playerIds: [] })

    await deleteRoster(roster.id, database)
    expect(await database.rosters.get(roster.id)).toBeUndefined()
  })

  it('選手を追加・編集・並び替え・削除し、写真Blobを端末DBへ保持する', async () => {
    const database = createDatabase()
    const roster = await createRoster('川原U12', database)
    const photo = new Blob(['photo'], { type: 'image/jpeg' })
    const first = await addPlayer(roster.id, { displayName: 'ユウ', jerseyNumber: '7', photo }, database)
    const second = await addPlayer(roster.id, { displayName: 'ソラ', jerseyNumber: '4' }, database)

    await updatePlayer(first.id, { displayName: 'ユウタ', jerseyNumber: '17', photo }, database)
    await reorderPlayers(roster.id, [second.id, first.id], database)
    const ordered = await listRosterPlayers(roster.id, database)
    expect(ordered.map((player) => player.id)).toEqual([second.id, first.id])
    expect(ordered[1]).toMatchObject({ displayName: 'ユウタ', jerseyNumber: '17' })
    expect(ordered[1].photo).toBeInstanceOf(Blob)

    await deletePlayer(second.id, database)
    expect((await listRosterPlayers(roster.id, database)).map((player) => player.id)).toEqual([first.id])
  })

  it('2チームを作成しても両方を一覧取得でき、各チームの選手を切り替えて読める', async () => {
    const database = createDatabase()
    const teamA = await createRoster('チームA', database, '2026-07-26T01:00:00.000Z')
    const playerA = await addPlayer(teamA.id, { displayName: 'A選手', jerseyNumber: '1' }, database)
    const teamB = await createRoster('チームB', database, '2026-07-26T02:00:00.000Z')
    const playerB = await addPlayer(teamB.id, { displayName: 'B選手', jerseyNumber: '2' }, database)

    expect((await listRosters(database)).map((roster) => roster.id)).toEqual([teamB.id, teamA.id])
    expect((await listRosterPlayers(teamA.id, database)).map((player) => player.id)).toEqual([playerA.id])
    expect((await listRosterPlayers(teamB.id, database)).map((player) => player.id)).toEqual([playerB.id])
  })
})
