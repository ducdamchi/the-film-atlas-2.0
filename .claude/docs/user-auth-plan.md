# User Authentication & Settings Panel — Implementation Plan

**Status**: Draft · Not started
**Last updated**: 2026-03-17
**Stack**: Express 5 · PostgreSQL · Kysely · TanStack Router · JWT (localStorage)

---

## Overview

This plan upgrades the app from its current minimal auth (username + password only) to a production-standard authentication and user profile system, delivered in phases from most urgent to most optional.

| Phase | Focus | Priority |
|-------|-------|----------|
| **1** | Fix live gaps — email, password reset, location, settings menu, JWT | **Do now** |
| **2** | Email verification on new signups + auth hardening | Soon |
| **3** | OAuth — Google, GitHub, Facebook | When needed |
| **4** | Full profile, change email, delete account | When needed |
| **5** | MFA (optional TOTP) | Optional |

The implementation uses Kysely migrations in `server/db/migrations/`. `server/db/types.ts` must be updated alongside each migration.

---

## Phase 1 — Fix Current Gaps

**Goal**: Close the holes that hurt real users right now. After this phase: users can recover their accounts, change their credentials, the app has city-level location for upcoming regional features, and the app is secure enough for production.

### What's in Phase 1

- Add `email`, `password_hash`, and functional location columns to `Users` (all profile columns deferred to Phase 4)
- Fix JWT: real secret, expiry, token invalidation
- Update login to accept email or username
- Silent IP-based city+country detection on every login (ipapi.co — zero friction, city and coordinates come free in the same response)
- Password reset flow (forgot password / reset password)
- Backend settings routes: change username, change password, manual location override
- Basic frontend Settings page with account + region sections
- `LocationPicker` component (country dropdown + city text field)
- `LocationBanner` in root layout — confirms auto-detected region, dismissible per session
- `CompleteProfileModal` — blocking modal for existing users missing email or location

### 1.1 — Migration 002 (Phase 1 subset)

Adds only the columns needed now. Profile/preference/demographics columns are deferred to Phase 4.

```js
// server/db/migrations/002_auth_essentials.js

exports.up = async (db) => {
  await db.schema.alterTable('Users')
    // Core identity
    .addColumn('email', 'varchar(255)', col => col.unique())  // nullable initially — existing users filled via CompleteProfileModal
    .addColumn('email_verified', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('password_hash', 'varchar(255)')               // replaces 'password' column
    // Password reset
    .addColumn('reset_token', 'varchar(255)')
    .addColumn('reset_token_expires', 'timestamptz')
    // Account state
    .addColumn('account_status', 'varchar(20)', col => col.notNull().defaultTo('active'))
    // Security / token invalidation
    .addColumn('password_changed_at', 'timestamptz')
    .addColumn('last_login_at', 'timestamptz')
    .addColumn('login_count', 'integer', col => col.notNull().defaultTo(0))
    // Functional location — drives content recommendations and upcoming local features.
    // Distinct from the cosmetic 'location' free-text field added in Phase 4.
    // ipapi.co returns all four fields (country, city, lat, lng) in a single call,
    // so collecting city-level data costs nothing extra over country-only.
    .addColumn('location_country', 'varchar(2)')       // ISO 3166-1 alpha-2, e.g. 'VN', 'FR'
    .addColumn('location_city', 'varchar(100)')        // e.g. 'Ho Chi Minh City'
    .addColumn('location_lat', 'numeric(9,6)')         // from IP lookup — city-level precision
    .addColumn('location_lng', 'numeric(9,6)')
    .addColumn('location_source', 'varchar(10)')       // 'ip' | 'manual'
    .addColumn('location_updated_at', 'timestamptz')
    .execute()

  // Copy existing hashed passwords into the new column
  await sql`UPDATE "Users" SET password_hash = password`.execute(db)
  // Mark existing users as email_verified — they're trusted accounts
  await sql`UPDATE "Users" SET email_verified = true`.execute(db)
}

exports.down = async (db) => {
  await sql`UPDATE "Users" SET password = password_hash`.execute(db)
  const cols = [
    'email', 'email_verified', 'password_hash', 'reset_token', 'reset_token_expires',
    'account_status', 'password_changed_at', 'last_login_at', 'login_count',
    'location_country', 'location_city', 'location_lat', 'location_lng',
    'location_source', 'location_updated_at',
  ]
  for (const col of cols) {
    await db.schema.alterTable('Users').dropColumn(col).execute()
  }
}
```

> The old `password` column is kept during Phase 1 as a safety net. It is dropped in Phase 2 (Migration 005) once stable.

Update `server/db/types.ts` after running this migration.

### 1.2 — Fix JWT

Three issues to resolve immediately in `server/routes/Auth.js` and `server/middlewares/AuthMiddleware.js`:

**1. Hardcoded secret** — replace `"secretstring"` with `process.env.JWT_SECRET`.

**2. No expiry** — add `{ expiresIn: '7d' }` to all `sign()` calls.

**3. Token invalidation** — check `iat` against `password_changed_at` on every authenticated request:

```js
// server/middlewares/AuthMiddleware.js
const validateToken = async (req, res, next) => {
  const token = req.headers.accesstoken
  if (!token) return res.status(401).json({ error: 'No token' })

  try {
    const decoded = verify(token, process.env.JWT_SECRET)

    const { rows } = await pool.query(
      `SELECT password_changed_at, account_status FROM "Users" WHERE id = $1`,
      [decoded.id]
    )
    const user = rows[0]
    if (!user || user.account_status !== 'active') {
      return res.status(401).json({ error: 'Account inactive.' })
    }
    if (user.password_changed_at) {
      const changedAt = new Date(user.password_changed_at).getTime() / 1000
      if (decoded.iat < changedAt) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' })
      }
    }

    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token.' })
  }
}
```

Add to `server/.env.local`:
```bash
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
APP_URL=http://localhost:3000   # https://thefilmatlas.org in prod
```

### 1.3 — Update Register and Login Routes

**Register** — collect email:
```js
// POST /auth/register
const { email, username, password } = req.body

// Validate: email format, username /^[a-z0-9_]{3,30}$/i, password min 8 chars
// Check uniqueness of email and username

const hash = await bcrypt.hash(password, 10)  // 12 in prod
await pool.query(
  `INSERT INTO "Users" (id, email, username, password_hash, email_verified, account_status)
   VALUES (gen_random_uuid(), $1, $2, $3, true, 'active')`,
  [email, username, hash]
)
// email_verified = true for Phase 1 (small user base, low risk).
// Phase 2 changes this to false and requires email confirmation.
return res.status(201).json({ message: 'Account created.' })
```

**Login** — accept email or username, store location from IP:
```js
// POST /auth/login
const { login, password } = req.body

const { rows } = await pool.query(
  `SELECT id, username, email, password_hash, email_verified, account_status,
          location_country, location_source
   FROM "Users" WHERE email = $1 OR username = $1 LIMIT 1`,
  [login]
)
if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' })

const user = rows[0]
if (user.account_status !== 'active') return res.status(403).json({ error: 'Account inactive.' })

const match = await bcrypt.compare(password, user.password_hash)
if (!match) return res.status(401).json({ error: 'Invalid credentials.' })

await pool.query(
  `UPDATE "Users" SET last_login_at = now(), login_count = login_count + 1 WHERE id = $1`,
  [user.id]
)

// Fire-and-forget IP location detection — never blocks the response
detectLocationFromIP(req, user)

const token = sign(
  { id: user.id, username: user.username, email: user.email,
    location_country: user.location_country, location_source: user.location_source },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)
return res.json({ token, username: user.username, id: user.id })
```

### 1.4 — Location Detection (Silent, City-Level)

**Why ipapi.co?** One API call returns `country_code`, `city`, `latitude`, and `longitude` together. Collecting city and coordinates costs zero extra requests over country-only — not storing them would waste already-fetched data. No browser permission prompt required.

**`location_source` state machine:**

| Value | Meaning | Auto-detect on login? |
|-------|---------|----------------------|
| `null` | No location yet (new account) | Yes |
| `'ip'` | Currently auto-detected | Yes — refreshed each login |
| `'manual'` | User explicitly set it | No — skipped until user clicks "Auto-detect" |

**Detection rules:**
- Runs on every login where `location_source` is `null` or `'ip'`
- Skipped when `location_source = 'manual'` — user's explicit choice is respected until they opt back into auto-detection
- Fire-and-forget after the JWT is issued — never delays the login response
- `location_country` and `location_source` are embedded in the JWT so the frontend has them immediately

```js
// server/utils/location.js
const pool = require('../db/pool')

async function detectLocationFromIP(req, user) {
  // Skip if user has manually set their location
  if (user.location_source === 'manual') return

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            ?? req.socket.remoteAddress

  // Skip loopback addresses in development
  if (!ip || ip === '127.0.0.1' || ip === '::1') return

  await runIPDetection(ip, user.id)
}

// Shared detection logic — used by both login auto-detect and the explicit endpoint
async function runIPDetection(ip, userId) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await res.json()

    if (data.country_code) {
      await pool.query(
        `UPDATE "Users"
         SET location_country = $1, location_city = $2,
             location_lat = $3, location_lng = $4,
             location_source = 'ip', location_updated_at = now()
         WHERE id = $5`,
        [data.country_code, data.city ?? null,
         data.latitude ?? null, data.longitude ?? null, userId]
      )
    }
    return data
  } catch {
    // Silent failure — location is a nice-to-have, not a login requirement
    return null
  }
}

module.exports = { detectLocationFromIP, runIPDetection }
```

### 1.5 — Email Infrastructure (Resend)

```bash
cd server && npm install resend
```

```js
// server/email/client.js
const { Resend } = require('resend')
module.exports = new Resend(process.env.RESEND_API_KEY)

// server/email/templates.js
const resend = require('./client')

async function sendPasswordResetEmail(toEmail, token) {
  const url = `${process.env.APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: 'Film Atlas <noreply@thefilmatlas.org>',
    to: toEmail,
    subject: 'Reset your Film Atlas password',
    html: `
      <p>You requested a password reset for your Film Atlas account.</p>
      <p><a href="${url}">Click here to set a new password.</a> Expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `
  })
}

module.exports = { sendPasswordResetEmail }
```

Add to `.env.local`:
```bash
RESEND_API_KEY=re_xxxxx
```

### 1.6 — Password Reset Routes

```js
// POST /auth/forgot-password
const { email } = req.body
// Always return 200 first — never confirm whether the email exists (prevents enumeration)
res.json({ message: 'If that email is registered, a reset link is on its way.' })

const { rows } = await pool.query(`SELECT id FROM "Users" WHERE email = $1`, [email])
if (!rows.length) return

const token = require('crypto').randomBytes(32).toString('hex')
const expires = new Date(Date.now() + 60 * 60 * 1000)  // 1 hour
await pool.query(
  `UPDATE "Users" SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
  [token, expires, rows[0].id]
)
await sendPasswordResetEmail(email, token)
```

```js
// POST /auth/reset-password
const { token, newPassword } = req.body

const { rows } = await pool.query(
  `SELECT id FROM "Users" WHERE reset_token = $1 AND reset_token_expires > now()`,
  [token]
)
if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link.' })

const hash = await bcrypt.hash(newPassword, 10)
await pool.query(
  `UPDATE "Users"
   SET password_hash = $1, reset_token = null, reset_token_expires = null,
       password_changed_at = now()
   WHERE id = $2`,
  [hash, rows[0].id]
)
return res.json({ message: 'Password updated. Please log in.' })
```

### 1.7 — Backend: Settings Routes

All routes require `validateToken` middleware.

```js
// PATCH /profile/me/username
const { username } = req.body
// Validate /^[a-z0-9_]{3,30}$/i, check uniqueness
await pool.query(
  `UPDATE "Users" SET username = $1, "updatedAt" = now() WHERE id = $2`,
  [username, req.user.id]
)
// Re-issue JWT — username is embedded in the token payload
const newToken = sign(
  { id: req.user.id, username, email: req.user.email,
    location_country: req.user.location_country, location_source: req.user.location_source },
  process.env.JWT_SECRET, { expiresIn: '7d' }
)
return res.json({ token: newToken })
```

```js
// PATCH /profile/me/password
const { currentPassword, newPassword } = req.body
const { rows } = await pool.query(
  `SELECT password_hash FROM "Users" WHERE id = $1`, [req.user.id]
)
const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
if (!match) return res.status(400).json({ error: 'Current password is incorrect.' })
// Validate newPassword strength
const hash = await bcrypt.hash(newPassword, 10)
await pool.query(
  `UPDATE "Users" SET password_hash = $1, password_changed_at = now() WHERE id = $2`,
  [hash, req.user.id]
)
return res.json({ message: 'Password updated.' })
```

```js
// PATCH /profile/me/location
const { country, city } = req.body
// Validate: country must be a valid ISO 3166-1 alpha-2 code (check against static whitelist)
await pool.query(
  `UPDATE "Users"
   SET location_country = $1, location_city = $2,
       location_source = 'manual', location_updated_at = now(), "updatedAt" = now()
   WHERE id = $3`,
  [country, city ?? null, req.user.id]
)
// Re-issue JWT so updated location is reflected immediately
const newToken = sign(
  { id: req.user.id, username: req.user.username, email: req.user.email,
    location_country: country, location_source: 'manual' },
  process.env.JWT_SECRET, { expiresIn: '7d' }
)
return res.json({ token: newToken })
```

```js
// POST /profile/me/location/detect  — explicit auto-detect triggered by user
// Sets location_source back to 'ip', re-enabling auto-detection on future logins.
const { runIPDetection } = require('../utils/location')

const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          ?? req.socket.remoteAddress

const data = await runIPDetection(ip, req.user.id)
if (!data?.country_code) {
  return res.status(503).json({ error: 'Could not detect location. Try again or set it manually.' })
}

const newToken = sign(
  { id: req.user.id, username: req.user.username, email: req.user.email,
    location_country: data.country_code, location_source: 'ip' },
  process.env.JWT_SECRET, { expiresIn: '7d' }
)
return res.json({
  token: newToken,
  location_country: data.country_code,
  location_city: data.city ?? null,
})
```

```js
// PATCH /profile/me/complete  — one-time route for existing users missing email/location
// Only works when Users.email IS NULL. Cannot be used to change an existing email.
const { email, country, city } = req.body

const { rows } = await pool.query(
  `SELECT email FROM "Users" WHERE id = $1`, [req.user.id]
)
if (rows[0].email !== null) {
  return res.status(403).json({ error: 'Email already set. Use account settings to change it.' })
}
// Validate email format + uniqueness; validate country code
await pool.query(
  `UPDATE "Users"
   SET email = $1, email_verified = true,
       location_country = $2, location_city = $3,
       location_source = 'manual', location_updated_at = now(), "updatedAt" = now()
   WHERE id = $4`,
  [email, country, city ?? null, req.user.id]
)
const newToken = sign(
  { id: req.user.id, username: req.user.username, email,
    location_country: country, location_source: 'manual' },
  process.env.JWT_SECRET, { expiresIn: '7d' }
)
return res.json({ token: newToken })
```

### 1.8 — Frontend: Settings Menu + Location UI

#### New routes

| Route | Component | Contents |
|-------|-----------|----------|
| `/settings` | `settings/index.tsx` | Redirects to `/settings/account` |
| `/settings/account` | `settings/account.tsx` | Change username, change password, change region |
| `/forgot-password` | `forgot-password.tsx` | Email input, submit to forgot-password route |
| `/reset-password` | `reset-password.tsx` | New password form (reads `?token=` from URL) |

**`/settings` layout**: Simple left-nav or tab bar. Phase 1 shows only the "Account" tab. Other tabs (Profile, Connections, Security, Danger Zone) are greyed out or hidden until their phases are built.

```tsx
// client/src/routes/settings/account.tsx — rough shape
export default function AccountSettings() {
  return (
    <div>
      <section>
        <h2>Change Username</h2>
        {/* Input: new username + submit. On success: store new JWT, update authState */}
      </section>

      <section>
        <h2>Change Password</h2>
        {/* Inputs: current password, new password, confirm new password */}
      </section>

      <section>
        <h2>Your Region</h2>
        {/*
          Shows current location with source label:
            "📍 Vietnam · Ho Chi Minh City  (auto-detected)"
            "📍 France · Paris  (set manually)"

          Two actions always available:
            [Save manually]   — LocationPicker (country dropdown + city field)
                                → POST saves with location_source='manual'
                                → future logins skip auto-detection

            [Auto-detect]     — visible when location_source === 'manual' or as a refresh option
                                → POST /profile/me/location/detect
                                → updates DB + JWT with IP-detected values
                                → future logins will auto-detect again
        */}
      </section>
    </div>
  )
}
```

**NavBar entry point**: Add an avatar/username dropdown when logged in:
- "Settings" → `/settings/account`
- "Log out"

#### `LocationPicker` component

Reusable — used in the settings page, the `LocationBanner`, and the `CompleteProfileModal`.

```tsx
// client/src/components/LocationPicker.tsx
import { COUNTRIES } from '@/utils/countries'

interface LocationPickerProps {
  country: string
  city: string
  onCountryChange: (code: string) => void
  onCityChange: (city: string) => void
}

export function LocationPicker({ country, city, onCountryChange, onCityChange }: LocationPickerProps) {
  return (
    <div>
      <label>Country <span className="text-red-500">*</span></label>
      <select value={country} onChange={e => onCountryChange(e.target.value)}>
        <option value="">Select your country</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      <label>City <span className="text-gray-400">(optional)</span></label>
      <input
        type="text"
        placeholder="e.g. Ho Chi Minh City"
        value={city}
        onChange={e => onCityChange(e.target.value)}
      />
    </div>
  )
}
```

```ts
// client/src/utils/countries.ts — static ISO 3166-1 list, ~250 entries, no API needed
export const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  // ... full list
  { code: 'VN', name: 'Vietnam' },
  { code: 'ZW', name: 'Zimbabwe' },
]
```

#### `LocationBanner` component

Shown once per session after a login where `location_source === 'ip'`. Lives in `__root.tsx`, below the NavBar. Dismissed to `sessionStorage`.

```tsx
// client/src/components/LocationBanner.tsx
export function LocationBanner() {
  const { authState, setAuthState } = useAuth()
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('locationBannerDismissed')
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!authState.isLoggedIn || authState.locationSource !== 'ip' || dismissed) return null

  const countryName = COUNTRIES.find(c => c.code === authState.locationCountry)?.name
                      ?? authState.locationCountry

  const dismiss = () => {
    sessionStorage.setItem('locationBannerDismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="bg-neutral-900 border-b border-neutral-700 px-4 py-2 flex items-center gap-3 text-sm">
      <span>📍 Showing you content from <strong>{countryName}</strong>. Not right?</span>
      <button onClick={() => setPickerOpen(true)} className="underline">Change region</button>
      <button onClick={dismiss} className="ml-auto text-neutral-400">✕</button>
      {pickerOpen && (
        <LocationChangeModal onClose={() => { setPickerOpen(false); dismiss() }} />
      )}
    </div>
  )
}
```

#### `CompleteProfileModal` (existing users — see §1.9)

Rendered in `__root.tsx` before the page content:

```tsx
// client/src/routes/__root.tsx
const { authState } = useAuth()

// Block the app for users missing email or location (existing users post-migration)
if (authState.isLoggedIn && (!authState.email || !authState.locationCountry)) {
  return <CompleteProfileModal />
}
```

### 1.9 — Existing Users: `CompleteProfileModal`

Existing users have no `email` or `location_country` in the DB. On their first login after Phase 1 deploys, they hit a blocking modal they cannot dismiss. It collects both fields in one step. The backend route is one-time-only — it only works when `email IS NULL`, so it cannot be used to silently overwrite an existing email.

```tsx
// client/src/components/CompleteProfileModal.tsx
export function CompleteProfileModal() {
  const { setAuthState } = useAuth()
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !country) return
    setLoading(true)
    const res = await fetch('/profile/me/complete', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        accesstoken: localStorage.getItem('accessToken') ?? '',
      },
      body: JSON.stringify({ email, country, city }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) return setError(data.error)

    localStorage.setItem('accessToken', data.token)
    // Decode new token and update authState — modal condition no longer true
    setAuthState(decodeToken(data.token))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-2">One quick update</h2>
        <p className="text-neutral-500 mb-6">
          We've upgraded Film Atlas. Please add your email and region
          to keep your account secure and see local content.
        </p>

        <label className="block mb-1 text-sm font-medium">Email</label>
        <input
          type="email"
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <LocationPicker
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
        />

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <button
          className="mt-6 w-full bg-black text-white rounded-lg py-2.5 font-medium disabled:opacity-40"
          onClick={handleSubmit}
          disabled={!email || !country || loading}
        >
          {loading ? 'Saving...' : 'Save and continue'}
        </button>
      </div>
    </div>
  )
}
```

### Phase 1 Checklist

**Schema & backend**
- [ ] Migration 002 run on dev and verified
- [ ] `server/db/types.ts` updated with all new columns
- [ ] `JWT_SECRET` env var set; token expiry + `password_changed_at` invalidation in `validateToken`
- [ ] Register route: email field, `password_hash`, `account_status`
- [ ] Login route: accepts email or username, uses `password_hash`, embeds `location_country` + `location_source` in JWT
- [ ] `detectLocationFromIP` fires on login (fire-and-forget, stores country + city + lat/lng from ipapi.co)
- [ ] `POST /auth/forgot-password` + `POST /auth/reset-password` routes live
- [ ] Resend configured; password reset email sends and links work end-to-end
- [ ] `PATCH /profile/me/username` route live
- [ ] `PATCH /profile/me/password` route live
- [ ] `PATCH /profile/me/location` route live (manual override → sets source to `'manual'`)
- [ ] `POST /profile/me/location/detect` route live (explicit auto-detect → sets source to `'ip'`)
- [ ] `PATCH /profile/me/complete` route live (one-time, guards `email IS NULL`)

**Frontend**
- [ ] `countries.ts` static ISO list added to `client/src/utils/`
- [ ] `LocationPicker` component built
- [ ] `LocationBanner` shown in root layout after IP-detected login; dismissible to `sessionStorage`
- [ ] `CompleteProfileModal` shown in root layout when `email` or `location_country` is missing (blocking)
- [ ] NavBar: avatar/username dropdown with Settings + Logout links
- [ ] `/settings/account` page: change username, change password, change region (LocationPicker + Auto-detect button)
- [ ] `/forgot-password` and `/reset-password` pages built

**Deployment**
- [ ] Migration 002 run on production
- [ ] Server redeployed with all new routes
- [ ] Smoke test: login → IP location stored → banner shown → confirm; change username; change password; forgot-password flow; `CompleteProfileModal` blocks existing user until email + country saved

---

## Phase 2 — Email Verification + Auth Hardening

**Goal**: New signups require a verified email before they can log in. Rate limiting added to auth endpoints.

### What's in Phase 2

- Update register to set `email_verified = false` and block login until verified
- Send verification email on register (Resend already set up from Phase 1)
- Add `email_verification_token` + `email_verification_expires` columns (Migration 003)
- Create `UserIdentities` table for OAuth prep (Migration 004)
- Drop legacy `password` column (Migration 005)
- Rate limiting on auth endpoints

### 2.1 — Migration 003 — Email Verification Columns

```js
// server/db/migrations/003_email_verification.js
exports.up = async (db) => {
  await db.schema.alterTable('Users')
    .addColumn('email_verification_token', 'varchar(255)')
    .addColumn('email_verification_expires', 'timestamptz')
    .execute()
}
exports.down = async (db) => {
  await db.schema.alterTable('Users')
    .dropColumn('email_verification_token')
    .dropColumn('email_verification_expires')
    .execute()
}
```

### 2.2 — Migration 004 — UserIdentities Table

Required before OAuth in Phase 3. Creating it now lets existing local users be backfilled cleanly.

```js
// server/db/migrations/004_create_user_identities.js
exports.up = async (db) => {
  await db.schema
    .createTable('UserIdentities')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('user_id', 'uuid', col =>
      col.notNull().references('Users.id').onDelete('cascade'))
    .addColumn('provider', 'varchar(20)', col => col.notNull())
    .addColumn('provider_user_id', 'varchar(255)', col => col.notNull())
    .addColumn('provider_email', 'varchar(255)')
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('token_expires_at', 'timestamptz')
    .addColumn('profile_data', 'jsonb')
    .addColumn('createdAt', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updatedAt', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('user_identities_provider_unique')
    .on('UserIdentities')
    .columns(['provider', 'provider_user_id'])
    .unique()
    .execute()

  // Backfill: create a 'local' identity for every user that has an email
  await sql`
    INSERT INTO "UserIdentities" (user_id, provider, provider_user_id, "createdAt", "updatedAt")
    SELECT id, 'local', email, now(), now()
    FROM "Users" WHERE email IS NOT NULL
  `.execute(db)
}
exports.down = async (db) => {
  await db.schema.dropTable('UserIdentities').execute()
}
```

### 2.3 — Migration 005 — Drop Legacy `password` Column

Run only after Phase 1 is verified stable in production and all routes use `password_hash`.

```js
// server/db/migrations/005_drop_legacy_password.js
exports.up = async (db) => {
  await db.schema.alterTable('Users').dropColumn('password').execute()
}
exports.down = async (db) => {
  await db.schema.alterTable('Users').addColumn('password', 'varchar(255)').execute()
  await sql`UPDATE "Users" SET password = password_hash`.execute(db)
}
```

### 2.4 — Email Verification Flow

```
POST /auth/register (updated)
→ email_verified = false
→ Generate email_verification_token: crypto.randomBytes(32).toString('hex')
→ Set email_verification_expires = now() + 24h
→ Send verification email via Resend
→ Return 201: "Check your email to verify your account."  (no JWT issued yet)

GET /auth/verify-email?token=<token>
→ Find user WHERE email_verification_token = token AND email_verification_expires > now()
→ If not found: 400 "Invalid or expired link"
→ UPDATE: email_verified=true, token=null, expires=null
→ Issue JWT, redirect to /
```

Login gate — add to login route:
```js
if (!user.email_verified) {
  return res.status(403).json({ error: 'Please verify your email before logging in.' })
}
```

Add `sendVerificationEmail` to `server/email/templates.js`:
```js
async function sendVerificationEmail(toEmail, token) {
  const url = `${process.env.APP_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: 'Film Atlas <noreply@thefilmatlas.org>',
    to: toEmail,
    subject: 'Verify your Film Atlas account',
    html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`
  })
}
```

Frontend: add `/verify-email` route — reads `?token=`, calls the backend, shows success or error message.

### 2.5 — Rate Limiting

```bash
npm install express-rate-limit
```

```js
// server/index.js
const rateLimit = require('express-rate-limit')
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
})
app.use('/auth/login', authLimiter)
app.use('/auth/register', authLimiter)
app.use('/auth/forgot-password', authLimiter)
```

### Phase 2 Checklist

- [ ] Migration 003 (email verification columns)
- [ ] Migration 004 (UserIdentities table + backfill)
- [ ] Register route: sends verification email, `email_verified = false`
- [ ] Login route: blocks unverified accounts with clear error
- [ ] `GET /auth/verify-email` route live
- [ ] Frontend: `/verify-email` page
- [ ] Rate limiting on auth endpoints
- [ ] Migration 005 (drop `password` column) — after prod is stable

---

## Phase 3 — OAuth (Google, GitHub, Facebook)

**Goal**: Users can sign up and log in with their existing Google, GitHub, or Facebook accounts.

### What's in Phase 3

- Passport.js setup with all three strategies
- Shared `oauthVerify` callback (all providers use identical logic)
- Frontend: OAuth buttons on login/register, `/auth/callback` route
- Settings: Connections tab showing linked providers

### 3.1 — Library Setup

```bash
npm install passport passport-google-oauth20 passport-facebook passport-github2
```

### 3.2 — Unified Verify Callback

All three providers share the same logic:
1. Look up `(provider, provider_user_id)` in `UserIdentities` → found = log in
2. Not found but email matches a `Users` row → link new identity to existing user
3. Not found, email not in `Users` → create new user + link identity

```js
// server/auth/oauthVerify.js
const db = require('../db/kysely')
const { sql } = require('kysely')

async function oauthVerify(provider, profile, accessToken, refreshToken, done) {
  const providerEmail = profile.emails?.[0]?.value ?? null
  const providerUserId = profile.id

  // 1. Identity already exists?
  const existing = await db.selectFrom('UserIdentities')
    .innerJoin('Users', 'Users.id', 'UserIdentities.user_id')
    .selectAll('Users')
    .where('UserIdentities.provider', '=', provider)
    .where('UserIdentities.provider_user_id', '=', providerUserId)
    .executeTakeFirst()

  if (existing) {
    await db.updateTable('UserIdentities')
      .set({ access_token: accessToken, refresh_token: refreshToken, updatedAt: new Date() })
      .where('provider', '=', provider)
      .where('provider_user_id', '=', providerUserId)
      .execute()
    return done(null, existing)
  }

  // 2. Email matches an existing user?
  let user = null
  if (providerEmail) {
    user = await db.selectFrom('Users').selectAll()
      .where('email', '=', providerEmail).executeTakeFirst()
  }

  // 3. No match — create a new user
  if (!user) {
    user = await db.insertInto('Users').values({
      id: sql`gen_random_uuid()`,
      email: providerEmail,
      username: await generateUniqueUsername(profile.displayName),
      email_verified: true,       // OAuth providers verify email
      account_status: 'active',
      avatar_url: profile.photos?.[0]?.value ?? null,
      createdAt: new Date(), updatedAt: new Date()
    }).returningAll().executeTakeFirstOrThrow()
  }

  // 4. Link the new identity
  await db.insertInto('UserIdentities').values({
    user_id: user.id, provider, provider_user_id: providerUserId,
    provider_email: providerEmail, access_token: accessToken,
    refresh_token: refreshToken, profile_data: JSON.stringify(profile._json),
    createdAt: new Date(), updatedAt: new Date()
  }).execute()

  return done(null, user)
}

async function generateUniqueUsername(displayName) {
  const base = (displayName ?? 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)
  let username = base, suffix = 0
  while (true) {
    const exists = await db.selectFrom('Users').select('id')
      .where('username', '=', username).executeTakeFirst()
    if (!exists) return username
    username = `${base}_${++suffix}`
  }
}

module.exports = { oauthVerify }
```

### 3.3 — Route Setup

```js
// server/routes/Auth.js (additions)
const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const { oauthVerify } = require('../auth/oauthVerify')
const { sign } = require('jsonwebtoken')

const issueJWT = (user) =>
  sign(
    { id: user.id, username: user.username, email: user.email,
      location_country: user.location_country, location_source: user.location_source },
    process.env.JWT_SECRET, { expiresIn: '7d' }
  )

const oauthCallback = (req, res) => {
  const token = issueJWT(req.user)
  res.redirect(`${process.env.APP_URL}/#/auth/callback?token=${token}`)
}

passport.use(new GoogleStrategy(
  { clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.API_URL}/auth/google/callback` },
  (at, rt, profile, done) => oauthVerify('google', profile, at, rt, done)
))
// GitHub and Facebook follow identical pattern

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.APP_URL}/#/login?error=oauth` }),
  oauthCallback
)
// /github, /github/callback, /facebook, /facebook/callback — same pattern
```

### 3.4 — Frontend

**OAuth buttons** (on `/login` and `/register`):
```tsx
const handleOAuth = (provider: string) => {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`
}
```

**`/auth/callback` route** — reads `?token=`, stores in localStorage, updates authState, redirects to `/`:
```tsx
// client/src/routes/auth/callback.tsx
export default function AuthCallback() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false })

  useEffect(() => {
    const { token } = search
    if (token) {
      localStorage.setItem('accessToken', token)
      // update authState via AuthContext
      navigate({ to: '/' })
    } else {
      navigate({ to: '/login', search: { error: 'oauth_failed' } })
    }
  }, [])

  return <LoadingPage />
}
```

**Settings → Connections tab**: Shows which providers are linked. "Connect" button for unlinked providers. "Disconnect" only allowed if another login method exists.

### 3.5 — OAuth App Setup

| Provider | Console | Redirect URI |
|----------|---------|-------------|
| Google | Cloud Console → APIs & Services → OAuth 2.0 Client ID | `https://thefilmatlas.org/auth/google/callback` |
| GitHub | Settings → Developer settings → OAuth Apps | `https://thefilmatlas.org/auth/github/callback` |
| Facebook | Meta Developers → Facebook Login | `https://thefilmatlas.org/auth/facebook/callback` |

```bash
# Add to .env.local
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
API_URL=http://localhost:3002   # used for OAuth callback URIs
```

### Phase 3 Checklist

- [ ] `passport`, `passport-google-oauth20`, `passport-github2`, `passport-facebook` installed
- [ ] `oauthVerify.js` implemented and tested
- [ ] Google, GitHub, Facebook OAuth routes live
- [ ] Frontend: OAuth buttons on login/register
- [ ] Frontend: `/auth/callback` route
- [ ] Settings: Connections tab with link/unlink
- [ ] OAuth apps registered in all three provider consoles
- [ ] Env vars set in dev and production

---

## Phase 4 — Full Profile & Account Management

**Goal**: Complete the user profile, allow email changes, and implement account deletion.

### What's in Phase 4

- Profile columns: bio, display_name, cosmetic location, dob, gender, preferences (Migration 006)
- Update profile endpoint + Profile settings tab
- Change email flow (pending email + re-verification)
- Delete account (soft delete)
- Settings: Profile tab + Danger Zone tab

### 4.1 — Migration 006 — Full Profile Columns

```js
// server/db/migrations/006_full_profile.js
exports.up = async (db) => {
  await db.schema.alterTable('Users')
    .addColumn('display_name', 'varchar(100)')
    .addColumn('bio', 'varchar(300)')
    .addColumn('avatar_url', 'text')             // URL to object storage — upload flow is separate
    .addColumn('website_url', 'varchar(255)')
    .addColumn('location', 'varchar(100)')        // cosmetic free-text ("Paris, France") — display only
    .addColumn('date_of_birth', 'date')
    .addColumn('gender', 'varchar(50)')           // free text, not enum
    .addColumn('preferred_language', 'varchar(10)')  // BCP 47
    .addColumn('preferred_currency', 'varchar(3)')   // ISO 4217
    .addColumn('email_pending', 'varchar(255)')   // staging for change-email flow
    .addColumn('deleted_at', 'timestamptz')
    .execute()
}
exports.down = async (db) => {
  const cols = ['display_name', 'bio', 'avatar_url', 'website_url', 'location',
    'date_of_birth', 'gender', 'preferred_language', 'preferred_currency',
    'email_pending', 'deleted_at']
  for (const col of cols) {
    await db.schema.alterTable('Users').dropColumn(col).execute()
  }
}
```

### 4.2 — Update Profile Route

```js
// PATCH /profile/me
const ALLOWED = ['display_name', 'bio', 'website_url', 'location', 'date_of_birth',
                 'gender', 'preferred_language']
const updates = Object.fromEntries(
  Object.entries(req.body).filter(([k]) => ALLOWED.includes(k))
)
updates.updatedAt = new Date()
await db.updateTable('Users').set(updates).where('id', '=', req.user.id).execute()
```

### 4.3 — Change Email Flow

```js
// PATCH /profile/me/email
// 1. Verify current password
// 2. Check newEmail not already taken
// 3. Set email_pending = newEmail, generate verification token
// 4. Send verification email to newEmail
// 5. GET /auth/verify-email-change?token= → swap email = email_pending, clear pending fields
```

### 4.4 — Delete Account

```js
// DELETE /profile/me
// Verify password if password_hash is set
// UPDATE Users SET account_status='deleted', deleted_at=now(), password_changed_at=now()
// password_changed_at=now() immediately invalidates all existing JWTs
```

Soft delete: FK integrity on `WatchedFilms`, `WatchlistedFilms`, etc. is preserved. Schedule a hard-delete job at `deleted_at + 30 days` for GDPR compliance.

### 4.5 — Frontend

- **Settings → Profile tab**: display_name, bio, cosmetic location, website, dob, gender, language
- **Settings → Account tab**: add Change Email section (alongside username/password from Phase 1)
- **Settings → Danger Zone tab**: delete account with confirmation (require typing username)

> Avatar uploads require object storage (S3/R2/Cloudflare Images) — separate infrastructure concern. The `avatar_url` column is ready; upload flow is a post-Phase-4 task.

### Phase 4 Checklist

- [ ] Migration 006 run
- [ ] `PATCH /profile/me` route (profile fields)
- [ ] Change email flow (pending + verify)
- [ ] `DELETE /profile/me` route (soft delete)
- [ ] Frontend: Profile settings tab
- [ ] Frontend: Change email UI in Account tab
- [ ] Frontend: Danger Zone tab with delete confirmation

---

## Phase 5 — MFA (Optional)

**Recommendation**: Opt-in only, not required. The Film Atlas stores low-sensitivity data. Mandatory MFA adds friction with negligible security gain at this scale.

**Reconsider when**: Admin/moderator accounts are added, or payment data is stored.

### 5.1 — TOTP Setup Flow

```bash
npm install speakeasy qrcode
```

```
POST /auth/mfa/setup  (JWT required)
→ Generate TOTP secret: speakeasy.generateSecret({ name: 'Film Atlas' })
→ Encrypt with AES-256-GCM using APP_SECRET — never store plaintext
→ Return QR code as data URI (client renders using qrcode library)
→ User scans with Google Authenticator / Authy, enters 6-digit code
→ POST /auth/mfa/confirm { code } → verify → UPDATE Users SET mfa_enabled=true, mfa_secret=<encrypted>
```

### 5.2 — Login Challenge Flow

```
POST /auth/login → credentials valid → check mfa_enabled
  → false: issue JWT immediately
  → true:  return { mfaRequired: true, tempToken: <short-lived JWT, 5 min> }
    → client shows 6-digit input
    → POST /auth/mfa/verify { tempToken, code } → verify TOTP → issue full JWT
```

### Phase 5 Checklist

- [ ] `speakeasy` + `qrcode` installed
- [ ] `POST /auth/mfa/setup` + `POST /auth/mfa/confirm` routes
- [ ] `POST /auth/mfa/verify` route (login challenge)
- [ ] Frontend: MFA setup wizard in Settings → Security tab
- [ ] Frontend: 6-digit challenge screen during login

---

## Reference: Full Target Schema

```ts
// server/db/types.ts — final state after all phases
Users: {
  id: string                          // UUID, PK

  // Identity
  username: string                    // unique, 3–30 chars, alphanumeric + underscores
  email: string                       // unique
  email_verified: boolean
  email_verification_token: string | null
  email_verification_expires: Date | null
  email_pending: string | null        // staging area for change-email flow (Phase 4)
  password_hash: string | null        // null for OAuth-only accounts

  // Password reset
  reset_token: string | null
  reset_token_expires: Date | null

  // Functional location — drives content recommendations and local features (Phase 1)
  // Populated silently from ipapi.co on login; never overwritten if source is 'manual'
  location_country: string | null     // ISO 3166-1 alpha-2, e.g. 'VN', 'FR'
  location_city: string | null        // e.g. 'Ho Chi Minh City'
  location_lat: number | null         // city-level precision from IP lookup
  location_lng: number | null
  location_source: string | null      // 'ip' | 'manual'
  location_updated_at: Date | null

  // Profile (Phase 4)
  display_name: string | null
  bio: string | null                  // max 300 chars
  avatar_url: string | null           // URL to object storage
  website_url: string | null
  location: string | null             // cosmetic free-text only ("Paris, France") — not queryable
  date_of_birth: Date | null
  gender: string | null               // free text, max 50 chars — not a fixed enum

  // Preferences (Phase 4)
  preferred_language: string | null   // BCP 47
  preferred_currency: string | null   // ISO 4217

  // Account state
  account_status: string              // 'active' | 'suspended' | 'deleted'
  deleted_at: Date | null

  // Security
  mfa_enabled: boolean
  mfa_secret: string | null           // AES-256-GCM encrypted TOTP secret
  last_login_at: Date | null
  login_count: number
  password_changed_at: Date | null    // used for JWT invalidation — updated on password change + account delete

  createdAt: Date
  updatedAt: Date
}

UserIdentities: {
  id: number                          // serial PK
  user_id: string                     // UUID FK → Users.id (cascade delete)
  provider: string                    // 'local' | 'google' | 'facebook' | 'github'
  provider_user_id: string            // unique per provider
  provider_email: string | null
  access_token: string | null         // AES-encrypted
  refresh_token: string | null        // AES-encrypted
  token_expires_at: Date | null
  profile_data: unknown               // JSONB — raw provider profile snapshot
  createdAt: Date
  updatedAt: Date
  // Unique index: (provider, provider_user_id)
}
```

---

## Security Notes

- **Generic errors**: Never reveal "email not found" on login or forgot-password. Always return `"Invalid credentials"`.
- **JWT secret**: Current value `"secretstring"` must be replaced before any production push. Use `process.env.JWT_SECRET`.
- **JWT expiry**: Add `{ expiresIn: '7d' }` — currently tokens never expire.
- **bcrypt cost factor**: 10 in dev, 12 in production.
- **Rate limiting**: `express-rate-limit` on `/auth/login`, `/auth/register`, `/auth/forgot-password`.
- **HTTPS**: OAuth callbacks and email links must use `https://` in production.
- **Encrypt OAuth tokens**: `access_token`/`refresh_token` in `UserIdentities` should be AES-256-GCM encrypted using `APP_SECRET`.
- **TOTP secrets**: Never store plaintext. Encrypt with AES-256-GCM.
- **ipapi.co rate limit**: Free tier allows 1,000 requests/day. More than sufficient for current scale; upgrade if needed.

---

## Environment Variables Reference

```bash
# Phase 1
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
APP_URL=http://localhost:3000     # https://thefilmatlas.org in prod
RESEND_API_KEY=re_xxxxx

# Phase 3 (OAuth)
API_URL=http://localhost:3002     # used for OAuth callback URIs
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Phase 5 (MFA)
APP_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```
