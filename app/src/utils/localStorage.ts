export function setItem<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value)) //local storage only takes data in json form
  } catch (err) {
    console.log(err)
  }
}

export function getItem<T>(key: string): T | null {
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : null
  } catch (err) {
    console.log(err)
    return null
  }
}

export const PERSISTED_STATE_KEYS = [
  // /films route (pending URL migration — localStorage-migrate.md Phase 5)
  "films-sortBy",
  "films-sortDirection",
  "films-numStars",
  "films-queryString",
  // /map panel layout (pending DB migration — localStorage-migrate.md Phase 6)
  "map-showPanel",
  "map-sidebarWidth",
  // /directors route (pending URL migration — localStorage-migrate.md Phase 5)
  "directors-sortBy",
  "directors-sortDirection",
  "directors-queryString",
] as const;

export function clearAllPersistedState(): void {
  PERSISTED_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
}
