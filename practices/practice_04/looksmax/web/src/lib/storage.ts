import { createProfile, parseProfile, type Profile } from "./profile"

export const PROFILE_KEY = "looksmax-profile"

export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

// В приватном режиме и при блокировке данных localStorage бросает исключения: игра должна работать и без него.
export function loadProfile(storage: StorageLike): Profile {
  try {
    const raw = storage.getItem(PROFILE_KEY)
    return raw === null ? createProfile() : parseProfile(JSON.parse(raw))
  } catch {
    return createProfile()
  }
}

export function saveProfile(storage: StorageLike, profile: Profile): boolean {
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}
