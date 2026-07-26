import type { Player } from '../db/database'
import type { EditorIcon } from './editor-geometry'

export type PlayerPhotoUrls = ReadonlyMap<string, string>

export function decoratePlayerIcons(
  icons: EditorIcon[],
  players: Player[],
  photoUrls: PlayerPhotoUrls = new Map(),
): EditorIcon[] {
  const playersById = new Map(players.map((player) => [player.id, player]))
  const counters = { offense: 0, defense: 0 }

  return icons.map((icon) => {
    if (icon.kind !== 'offense' && icon.kind !== 'defense') return icon
    counters[icon.kind] += 1
    const player = icon.playerId ? playersById.get(icon.playerId) : undefined
    return {
      ...icon,
      defaultNumber: counters[icon.kind],
      displayName: player?.displayName,
      jerseyNumber: player?.jerseyNumber,
      photoUrl: player ? photoUrls.get(player.id) : undefined,
    }
  })
}

export function getPlayerIconText(icon: EditorIcon): string {
  if (icon.displayName) return icon.displayName
  if (icon.jerseyNumber) return icon.jerseyNumber
  if (icon.defaultNumber) return String(icon.defaultNumber)
  return icon.label ?? ''
}
