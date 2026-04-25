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
  "accessToken",
  "films-searchInput",
  "films-isSearching",
  "films-sortBy",
  "films-sortDirection",
  "films-numStars",
  "films-queryString",
  "films-scrollPosition",
  "map-showPanel",
  "map-sidebarWidth",
  "map-popupInfo",
  "map-suggestedFilmList",
  "map-page",
  "map-sortBy",
  "map-sortDirection",
  "map-queryString",
  "map-lastMyFilmsQueryString",
  "map-numStars",
  "map-discoverBy",
  "map-scrollPosition",
  "map-ratingRange",
  "map-tempRating",
  "map-voteCountRange",
  "map-tempVoteCount",
  "directors-searchInput",
  "directors-isSearching",
  "directors-numStars",
  "directors-sortBy",
  "directors-sortDirection",
  "directors-queryString",
  "directors-scrollPosition",
  "directorLanding-scrollPosition",
  "navbar-menuOpened",
  "navbar-settingsOpened",
] as const;

export function clearAllPersistedState(): void {
  PERSISTED_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
}
