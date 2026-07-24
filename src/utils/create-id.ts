type IdOptions = {
  randomUUID?: (() => string) | null
  now?: () => number
  random?: () => number
}

let sequence = 0

export function createId(prefix = 'id', options: IdOptions = {}): string {
  const browserRandomUUID = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : undefined
  const randomUUID = options.randomUUID === null
    ? undefined
    : options.randomUUID ?? browserRandomUUID

  if (randomUUID) {
    try {
      return `${prefix}-${randomUUID()}`
    } catch {
      // 一部の古い／制限付きブラウザでは存在しても呼び出しに失敗する。
    }
  }

  sequence = (sequence + 1) % Number.MAX_SAFE_INTEGER
  const now = (options.now ?? Date.now)().toString(36)
  const random = Math.floor((options.random ?? Math.random)() * 0x100000000)
    .toString(36)
    .padStart(7, '0')
  return `${prefix}-${now}-${sequence.toString(36)}-${random}`
}
