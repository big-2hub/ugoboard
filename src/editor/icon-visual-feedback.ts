import type { EditorIcon } from './editor-geometry'

type FeedbackNode = {
  to: (config: Record<string, string | number>) => void
}

export function getActiveFeedbackIconIds(icons: EditorIcon[], activeIconId?: string) {
  if (!activeIconId) return new Set<string>()

  return new Set(
    icons
      .filter((icon) => icon.id === activeIconId
        || (icon.kind === 'ball' && icon.holderId === activeIconId))
      .map((icon) => icon.id),
  )
}

export function syncIconVisualFeedback(
  icons: EditorIcon[],
  activeIconId: string | undefined,
  nodes: ReadonlyMap<string, FeedbackNode>,
  previousActiveIds: ReadonlySet<string>,
) {
  const nextActiveIds = getActiveFeedbackIconIds(icons, activeIconId)
  const changedIds = new Set([...previousActiveIds, ...nextActiveIds])

  changedIds.forEach((iconId) => {
    const node = nodes.get(iconId)
    if (!node) return

    const active = nextActiveIds.has(iconId)
    node.to({
      scaleX: active ? 1.2 : 1,
      scaleY: active ? 1.2 : 1,
      shadowColor: '#020b07',
      shadowBlur: active ? 18 : 0,
      shadowOpacity: active ? 0.85 : 0,
      shadowOffsetY: active ? 7 : 0,
      duration: 0.12,
    })
  })

  return nextActiveIds
}
