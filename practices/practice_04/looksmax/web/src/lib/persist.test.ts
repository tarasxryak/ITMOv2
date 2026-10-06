import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createPersistor } from "./persist"
import { createProfile, earn } from "./profile"
import { PROFILE_KEY, type StorageLike } from "./storage"

function fakeStorage() {
  const writes: string[] = []
  const storage: StorageLike = {
    getItem: () => null,
    setItem: (_key, value) => {
      writes.push(value)
    },
  }
  return { storage, writes }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("createPersistor", () => {
  test("пока ничего не менялось, flush ничего не пишет: чужой прогресс из другой вкладки не затирается", () => {
    const { storage, writes } = fakeStorage()
    createPersistor(storage).flush()
    expect(writes).toEqual([])
  })

  test("после изменения flush пишет последний профиль под своим ключом", () => {
    const { storage, writes } = fakeStorage()
    const persistor = createPersistor(storage)
    persistor.markDirty(earn(createProfile(), 5))
    persistor.markDirty(earn(createProfile(), 9))
    persistor.flush()
    expect(writes).toHaveLength(1)
    expect(JSON.parse(writes[0]).balance).toBe(9)
    expect(PROFILE_KEY).toBe("looksmax-profile")
  })

  test("много изменений подряд пишутся не чаще раза в секунду", () => {
    const { storage, writes } = fakeStorage()
    const persistor = createPersistor(storage)
    for (let i = 0; i < 20; i++) persistor.markDirty(earn(createProfile(), i))
    expect(writes).toHaveLength(0)
    vi.advanceTimersByTime(999)
    expect(writes).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(writes).toHaveLength(1)
    expect(JSON.parse(writes[0]).balance).toBe(19)
  })

  test("после записи повторный flush ничего не пишет", () => {
    const { storage, writes } = fakeStorage()
    const persistor = createPersistor(storage)
    persistor.markDirty(createProfile())
    persistor.flush()
    persistor.flush()
    vi.advanceTimersByTime(5000)
    expect(writes).toHaveLength(1)
  })

  test("следующее изменение после записи снова запускает отложенную запись", () => {
    const { storage, writes } = fakeStorage()
    const persistor = createPersistor(storage)
    persistor.markDirty(earn(createProfile(), 1))
    vi.advanceTimersByTime(1000)
    persistor.markDirty(earn(createProfile(), 2))
    vi.advanceTimersByTime(1000)
    expect(writes.map((w) => JSON.parse(w).balance)).toEqual([1, 2])
  })

  test("без хранилища работает молча", () => {
    const persistor = createPersistor(null)
    persistor.markDirty(createProfile())
    expect(() => {
      persistor.flush()
      vi.advanceTimersByTime(2000)
    }).not.toThrow()
  })
})
