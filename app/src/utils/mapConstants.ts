export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string
const MAPTILER_STYLE_ID = import.meta.env.VITE_MAPTILER_STYLE_ID as string

export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_API_KEY}`
export const MAPTILER_COUNTRIES_TILES_URL = `https://api.maptiler.com/tiles/countries/tiles.json?key=${MAPTILER_API_KEY}`
