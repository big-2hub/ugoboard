import type { Player } from '../db/database'
import type { PlayDocument } from '../db/play-repository'

export type SharedPlayer = Pick<Player, 'id' | 'displayName' | 'jerseyNumber'>

export type SharePayload = {
  play: Omit<PlayDocument['play'], 'includePhotosInShare'> & {
    includePhotosInShare: false
  }
  steps: PlayDocument['steps']
  drawings: PlayDocument['drawings']
  players: SharedPlayer[]
}

/**
 * 共有機能へ渡す安全なデータを作る。
 * 現MVPではPlay側の設定値にかかわらず写真Blobを含めない。
 */
export function createSharePayload(
  document: PlayDocument,
  players: Player[],
): SharePayload {
  return {
    play: { ...document.play, includePhotosInShare: false },
    steps: document.steps.map((step) => ({
      ...step,
      icons: step.icons.map((icon) => ({ ...icon, position: { ...icon.position } })),
    })),
    drawings: document.drawings.map((drawing) => ({
      ...drawing,
      points: drawing.points.map((point) => ({ ...point })),
    })),
    players: players.map(({ id, displayName, jerseyNumber }) => ({
      id,
      displayName,
      jerseyNumber,
    })),
  }
}
