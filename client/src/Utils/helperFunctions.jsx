/* Converts ISO_A2 country codes into full country name */
export function getCountryName(code) {
  // Check if the Intl.DisplayNames API is supported
  if (Intl && Intl.DisplayNames) {
    // Create a new instance for 'en' (English) with 'region' type
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" })
    // Use the `of()` method to get the country name
    return regionNames.of(code.toUpperCase())
  }
  return undefined
}

/* Converts full date of format yyyy-mm-dd to yyyy only */
export function getReleaseYear(release_date) {
  const date = new Date(release_date)
  const year = date.getFullYear()

  if (isNaN(year) || year < 1800 || year > 3000) {
    return "N/A"
  } else {
    return year
  }
}

/* Converts date of format yyyy-mm (e.g. 2025-10) to Month Year string (e.g. October 2025)*/
export function getNiceMonthYear(dateString) {
  const [year, month] = dateString.split("-")
  const inputDate = new Date(year, month - 1)
  const currentDate = new Date()

  if (
    inputDate.getFullYear() === currentDate.getFullYear() &&
    inputDate.getMonth() === currentDate.getMonth()
  ) {
    return "This Month"
  } else if (
    inputDate.getFullYear() === currentDate.getFullYear() &&
    inputDate.getMonth() === currentDate.getMonth() - 1
  ) {
    return "Last Month"
  } else {
    return inputDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }
}

/* Converts date of format yyyy-mm-dd (e.g. 2025-10-25) to Month Date Year string (e.g. October 25, 2025)*/
export function getNiceMonthDateYear(dateString) {
  const [year, month, date] = dateString.split("-")
  const inputDate = new Date(year, month - 1, date)
  // const [year, month, date] = dateString.split("-")
  // const currentDate = new Date()
  const options = { year: "numeric", month: "long", day: "numeric" }
  return new Intl.DateTimeFormat("en-US", options).format(inputDate)
}

/* Calculate age from birthday and deathday in the string format yyyy-mm-dd. If deathday left empty, person is not deceased -> use current year. */
export function getAge(birthday, deathday) {
  if (birthday) {
    const birth = new Date(birthday)
    if (deathday) {
      const death = new Date(deathday)
      return death.getFullYear() - birth.getFullYear()
    } else {
      const currentDate = new Date()
      return currentDate.getFullYear() - birth.getFullYear()
    }
  } else {
    return "N/A"
  }
}

export function getNameParts(fullName) {
  if (!fullName || typeof fullName !== "string") return ""

  const nameParts = fullName.trim().split(/\s+/) // Handles multiple spaces

  const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : ""

  const firstNameInitial =
    nameParts.length > 0 && nameParts[0].length > 0
      ? nameParts[0][0].toUpperCase()
      : ""

  return { firstNameInitial, lastName }
}

export function shuffleArray(array) {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ]
  }

  return array
}

// Darken an [r, g, b] color by clamping its OKLCH lightness to maxL (0–1).
// Preserves hue and chroma — only the perceptual lightness is reduced.
// maxL=0.3 is a good default for ensuring white text readability.
export function darkenColorToOklch([r, g, b], maxL = 0.3) {
  // sRGB (0–255) → linear light
  const toLinear = (c) => {
    c = c / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)

  // Linear RGB → XYZ (D65)
  const X = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl
  const Y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
  const Z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl

  // XYZ → OKLab
  const lc = Math.cbrt(0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z)
  const mc = Math.cbrt(0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z)
  const sc = Math.cbrt(0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z)

  const L = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc
  const a = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc
  const b_ok = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc

  // Clamp lightness
  const Lc = Math.min(L, maxL)

  // OKLab → XYZ (inverse)
  const ln = Lc + 0.3963377774 * a + 0.2158037573 * b_ok
  const mn = Lc - 0.1055613458 * a - 0.0638541728 * b_ok
  const sn = Lc - 0.0894841775 * a - 1.2914855480 * b_ok

  const Xn =  1.2270138511 * ln**3 - 0.5577999807 * mn**3 + 0.2812561490 * sn**3
  const Yn = -0.0405801784 * ln**3 + 1.1122568696 * mn**3 - 0.0716766787 * sn**3
  const Zn = -0.0763812845 * ln**3 - 0.4214819784 * mn**3 + 1.5861632204 * sn**3

  // XYZ → linear RGB
  const rLin =  3.2404542 * Xn - 1.5371385 * Yn - 0.4985314 * Zn
  const gLin = -0.9692660 * Xn + 1.8760108 * Yn + 0.0415560 * Zn
  const bLin =  0.0556434 * Xn - 0.2040259 * Yn + 1.0572252 * Zn

  // Linear → sRGB (0–255)
  const toSRGB = (c) => {
    c = Math.max(0, Math.min(1, c))
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255)
  }
  return [toSRGB(rLin), toSRGB(gLin), toSRGB(bLin)]
}

// Convert RGB to relative luminance
export const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Calculate contrast ratio
export const getContrastRatio = (l1, l2) => {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Adjust color to ensure sufficient contrast
export const ensureContrast = (bgColor, textColor) => {
  const bgLuminance = getLuminance(...bgColor)
  let textLuminance = getLuminance(...textColor)
  let contrastRatio = getContrastRatio(bgLuminance, textLuminance)

  // WCAG AA requires at least 4.5:1 for normal text
  const minContrast = 4.5

  if (contrastRatio < minContrast) {
    // If contrast is insufficient, adjust the text color
    // by making it significantly lighter or darker
    const isBgDark = bgLuminance < 0.5

    if (isBgDark) {
      // For dark backgrounds, use light text (high luminance)
      return [231, 229, 228] // white
    } else {
      // For light backgrounds, use dark text (low luminance)
      return [28, 25, 23] // black
    }
  }

  return textColor
}
