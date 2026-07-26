export const PLAYER_PHOTO_MAX_EDGE = 256

export function fitImageSize(width: number, height: number, maxEdge = PLAYER_PHOTO_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function resizePlayerPhoto(
  source: Blob,
  maxEdge = PLAYER_PHOTO_MAX_EDGE,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    const size = fitImageSize(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('写真を処理できませんでした')
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const resized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.84)
    })
    if (!resized) throw new Error('写真を保存用に変換できませんでした')
    return resized
  } finally {
    bitmap.close()
  }
}
