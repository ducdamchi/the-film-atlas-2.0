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
