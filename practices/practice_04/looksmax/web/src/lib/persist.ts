import type { Profile } from "./profile"
import { saveProfile, type StorageLike } from "./storage"

const SAVE_DELAY_MS = 1000

// Пишет профиль в хранилище не чаще раза в секунду и только если он менялся. Без второго условия вкладка,
// в которой ничего не происходило, при закрытии затирала бы прогресс, сделанный в соседней вкладке.
export function createPersistor(storage: StorageLike | null) {
  let latest: Profile | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush() {
    clearTimeout(timer)
    timer = undefined
    if (storage && latest) saveProfile(storage, latest)
    latest = null
  }

  return {
    markDirty(profile: Profile) {
      latest = profile
      if (timer === undefined) timer = setTimeout(flush, SAVE_DELAY_MS)
    },
    flush,
  }
}
