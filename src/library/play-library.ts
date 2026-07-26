import type { Play, PlayType } from '../db/database'

export type PlayFilter = {
  type: 'all' | PlayType
  tag: string
}

export function filterPlays(plays: Play[], filter: PlayFilter): Play[] {
  return plays.filter((play) =>
    (filter.type === 'all' || play.type === filter.type)
    && (!filter.tag || play.tags.includes(filter.tag)))
}

export function collectPlayTags(plays: Play[]): string[] {
  return [...new Set(plays.flatMap((play) => play.tags))].sort((a, b) => a.localeCompare(b, 'ja'))
}
