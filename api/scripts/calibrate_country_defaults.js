/**
 * calibrate_country_defaults.js
 *
 * Probes TMDB for every UN member state to determine the appropriate
 * vote_count and rating filter thresholds based on each country's total
 * catalogued film library size.
 *
 * Output: app/src/data/countryDefaults.ts
 *   - COUNTRY_DEFAULTS: Record<string, CountryDefaults> — per-country lookup
 *   - GLOBAL_DEFAULTS: CountryDefaults — mode tier across all countries
 *     (used as fallback for territories/countries not in the table)
 *
 * Usage:
 *   node api/scripts/calibrate_country_defaults.js
 *
 * Requires TMDB_API_KEY in api/.env.local (or as an env var).
 *
 * Rate-limiting: 300 ms between requests to stay within TMDB's 40 req/10 s limit.
 * Total runtime: ~60 s for 195 countries.
 *
 * Schedule: run monthly — TMDB catalog grows slowly; tiers rarely flip.
 * Example cron (first of every month at 02:00 UTC):
 *   0 2 1 * * cd /path/to/repo && node api/scripts/calibrate_country_defaults.js \
 *     && git add app/src/data/countryDefaults.ts \
 *     && git commit -m "chore: recalibrate country defaults"
 */

import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { writeFileSync, mkdirSync } from "fs"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, "../.env.local") })

const TMDB_API_KEY = process.env.TMDB_API_KEY
if (!TMDB_API_KEY) {
  console.error("TMDB_API_KEY not set. Add it to api/.env.local or export it.")
  process.exit(1)
}

const TMDB_BASE = "https://api.themoviedb.org/3"
const DELAY_MS = 300

// Same list as app/src/utils/countries.ts — duplicated here so the script is
// self-contained and runnable without a bundler.
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (DRC)" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
]

// Tiering function — mirrors probeCountryDefaults in apiCalls.ts.
// Maps total_results → { voteCount, rating }.
function toTier(T) {
  if (T < 40)   return { voteCount: 0,   rating: 0   }
  if (T < 100)  return { voteCount: 0,   rating: 5.0 }
  if (T < 300)  return { voteCount: 5,   rating: 5.5 }
  if (T < 800)  return { voteCount: 20,  rating: 6.0 }
  if (T < 2000) return { voteCount: 80,  rating: 6.5 }
  return          { voteCount: 200,  rating: 7.0 }
}

function tierLabel(t) {
  return `rating=${t.rating} votes=${t.voteCount}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function probeCountry(code) {
  const url = new URL(`${TMDB_BASE}/discover/movie`)
  url.searchParams.set("api_key", TMDB_API_KEY)
  url.searchParams.set("with_origin_country", code)
  url.searchParams.set("include_adult", "false")
  url.searchParams.set("include_video", "false")
  url.searchParams.set("with_runtime.gte", "80")
  url.searchParams.set("page", "1")

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.total_results ?? 0
}

// Mode: most commonly occurring tier key across all calibrated countries.
// Used as GLOBAL_DEFAULTS for territories not in the table.
function computeMode(tierMap) {
  const freq = {}
  for (const t of Object.values(tierMap)) {
    const key = tierLabel(t)
    freq[key] = (freq[key] ?? 0) + 1
  }
  let topKey = null
  let topCount = 0
  for (const [key, count] of Object.entries(freq)) {
    if (count > topCount) { topKey = key; topCount = count }
  }
  return { freq, topKey, topCount }
}

function renderDistributionTable(freq, total) {
  console.log("\nTier distribution across all countries:")
  console.log("─".repeat(48))
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  for (const [label, count] of sorted) {
    const pct = ((count / total) * 100).toFixed(1)
    const bar = "█".repeat(Math.round(count / 2))
    console.log(`  ${label.padEnd(26)} ${String(count).padStart(3)}  (${pct}%)  ${bar}`)
  }
  console.log("─".repeat(48))
}

async function main() {
  const total = COUNTRIES.length
  console.log(`Calibrating ${total} countries against TMDB...`)
  console.log(`Delay: ${DELAY_MS} ms between requests (~${Math.ceil((total * DELAY_MS) / 1000)} s total)\n`)

  const results = {}    // code → { totalResults, tier }
  const errors = []

  for (let i = 0; i < COUNTRIES.length; i++) {
    const { code, name } = COUNTRIES[i]
    const progress = `[${String(i + 1).padStart(3)}/${total}]`
    try {
      const totalResults = await probeCountry(code)
      const tier = toTier(totalResults)
      results[code] = { totalResults, tier }
      console.log(`${progress} ${code}  ${name.padEnd(36)} T=${String(totalResults).padStart(5)}  →  ${tierLabel(tier)}`)
    } catch (err) {
      console.error(`${progress} ${code}  ${name.padEnd(36)} ERROR: ${err.message}`)
      errors.push(code)
      // Fallback: show everything (safest for unknown/error case)
      results[code] = { totalResults: 0, tier: toTier(0) }
    }
    if (i < COUNTRIES.length - 1) await sleep(DELAY_MS)
  }

  // Build tier-only map for output
  const tierMap = Object.fromEntries(
    Object.entries(results).map(([code, { tier }]) => [code, tier])
  )

  const { freq, topKey } = computeMode(tierMap)
  renderDistributionTable(freq, total)

  // Reconstruct GLOBAL_DEFAULTS from the mode tier key
  const [modeEntry] = Object.entries(tierMap).find(
    ([, t]) => tierLabel(t) === topKey
  ) ?? []
  const globalDefaults = modeEntry ? tierMap[modeEntry] : { voteCount: 0, rating: 0 }

  console.log(`\nGLOBAL_DEFAULTS (mode tier): ${tierLabel(globalDefaults)}`)
  if (errors.length > 0) {
    console.warn(`\nWarnings: ${errors.length} countries errored and were set to tier T<40 (show all): ${errors.join(", ")}`)
  }

  // Generate TypeScript output
  const outDir = join(__dirname, "../../app/src/data")
  mkdirSync(outDir, { recursive: true })

  const lines = [
    "// AUTO-GENERATED by api/scripts/calibrate_country_defaults.js",
    `// Last run: ${new Date().toISOString()}`,
    "// Do not edit manually. Re-run the script to update.",
    "// Schedule: monthly (see script header for cron example).",
    "",
    "export interface CountryDefaults {",
    "  rating: number",
    "  voteCount: number",
    "}",
    "",
    "/**",
    " * Per-country TMDB discover filter thresholds, derived from each country's",
    " * total unfiltered catalog size on TMDB. Larger catalogs get stricter filters",
    " * to surface quality films; smaller catalogs get looser filters to avoid empty lists.",
    " *",
    " * Tier boundaries (total_results → thresholds):",
    " *   T < 40    → { voteCount: 0,   rating: 0   }",
    " *   T < 100   → { voteCount: 0,   rating: 5.0 }",
    " *   T < 300   → { voteCount: 5,   rating: 5.5 }",
    " *   T < 800   → { voteCount: 20,  rating: 6.0 }",
    " *   T < 2000  → { voteCount: 80,  rating: 6.5 }",
    " *   T >= 2000 → { voteCount: 200, rating: 7.0 }",
    " */",
    "export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {",
  ]

  // Sort by code for readability
  const sortedCodes = Object.keys(tierMap).sort()
  for (const code of sortedCodes) {
    const t = tierMap[code]
    const totalResults = results[code].totalResults
    const country = COUNTRIES.find((c) => c.code === code)
    lines.push(`  ${code}: { rating: ${t.rating.toFixed(1)}, voteCount: ${t.voteCount} }, // ${country?.name ?? ""} (T=${totalResults})`)
  }

  lines.push("}")
  lines.push("")
  lines.push("/**")
  lines.push(` * Fallback for countries not in COUNTRY_DEFAULTS (territories, future additions).`)
  lines.push(` * Set to the mode tier across all ${total} calibrated countries: ${tierLabel(globalDefaults)}`)
  lines.push(" */")
  lines.push(`export const GLOBAL_DEFAULTS: CountryDefaults = { rating: ${globalDefaults.rating.toFixed(1)}, voteCount: ${globalDefaults.voteCount} }`)
  lines.push("")

  const outPath = join(outDir, "countryDefaults.ts")
  writeFileSync(outPath, lines.join("\n"), "utf8")
  console.log(`\nWrote ${sortedCodes.length} entries to ${outPath}`)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
