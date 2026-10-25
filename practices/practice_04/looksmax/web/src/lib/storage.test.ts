import { describe, expect, test } from "vitest"
import { createProfile, earn } from "./profile"
import { loadProfile, PROFILE_KEY, saveProfile, type StorageLike } from "./storage"

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  const storage: StorageLike = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
  return { storage, data }
}

const broken: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError")
  },
  setItem: () => {
    throw new Error("QuotaExceededError")
  },
}

describe("loadProfile", () => {
  test("пусто — новый профиль", () => {
    expect(loadProfile(fakeStorage().storage)).toEqual(createProfile())
  })

  test("читает то, что записал saveProfile", () => {
    const { storage } = fakeStorage()
    const profile = earn(createProfile(), 123)
    saveProfile(storage, profile)
    expect(loadProfile(storage)).toEqual(profile)
  })

  test("битый JSON — новый профиль, а не падение игры", () => {
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: "{не json" }).storage)).toEqual(createProfile())
  })

  test("хранилище недоступно (приватный режим) — новый профиль", () => {
    expect(loadProfile(broken)).toEqual(createProfile())
  })
})

describe("saveProfile", () => {
  test("пишет JSON под своим ключом", () => {
    const { storage, data } = fakeStorage()
    expect(saveProfile(storage, earn(createProfile(), 5))).toBe(true)
    expect(JSON.parse(data[PROFILE_KEY]).balance).toBe(5)
  })

  test("хранилище недоступно или переполнено — false, без исключения", () => {
    expect(saveProfile(broken, createProfile())).toBe(false)
  })
})
