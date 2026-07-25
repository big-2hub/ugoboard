import type { EditorSnapshot } from './editor-types'

export function deleteIconFromSnapshot(snapshot: EditorSnapshot, iconId: string): EditorSnapshot {
  return {
    ...snapshot,
    icons: snapshot.icons
      .filter((icon) => icon.id !== iconId)
      .map((icon) => icon.holderId === iconId ? { ...icon, holderId: undefined } : icon),
  }
}

export function deleteDrawingFromSnapshot(snapshot: EditorSnapshot, drawingId: string): EditorSnapshot {
  return {
    ...snapshot,
    drawings: snapshot.drawings.filter((drawing) => drawing.id !== drawingId),
  }
}
