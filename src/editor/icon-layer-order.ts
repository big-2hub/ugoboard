import type { EditorIcon } from './editor-geometry'

export type IconRenderGroups = {
  equipment: EditorIcon[]
  players: EditorIcon[]
  balls: EditorIcon[]
}

export function groupIconsByRenderOrder(icons: EditorIcon[]): IconRenderGroups {
  return {
    equipment: icons.filter((icon) => icon.kind === 'cone' || icon.kind === 'chair'),
    players: icons.filter((icon) => icon.kind === 'offense' || icon.kind === 'defense'),
    balls: icons.filter((icon) => icon.kind === 'ball'),
  }
}
