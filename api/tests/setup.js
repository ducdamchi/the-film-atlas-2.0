/**
 * Vitest setupFiles — runs in the test worker before each test file.
 * Reads the token file written by globalSetup and sets globals.
 */

import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TOKENS_FILE = join(__dirname, ".tokens.json")

if (!existsSync(TOKENS_FILE)) {
  throw new Error("Token file not found — did globalSetup run?")
}

const tokens = JSON.parse(readFileSync(TOKENS_FILE, "utf8"))

global.__TOKEN_A__ = tokens.tokenA
global.__USER_ID_A__ = tokens.userIdA
global.__USERNAME_A__ = tokens.usernameA
global.__TOKEN_B__ = tokens.tokenB
global.__USER_ID_B__ = tokens.userIdB
global.__USERNAME_B__ = tokens.usernameB
