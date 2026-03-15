export function setItem(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value)) //local storage only takes data in json form
  } catch (err) {
    console.log(err)
  }
}

export function getItem(key) {
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : undefined
  } catch (err) {
    console.log(err)
  }
}
