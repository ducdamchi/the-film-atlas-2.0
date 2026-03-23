/**
 * Vitest setupFiles — runs in the test worker before each test file.
 * Reads the token file written by globalSetup and sets globals.
 */

const fs = require("fs")
const path = require("path")

const TOKENS_FILE = path.join(__dirname, ".tokens.json")

if (!fs.existsSync(TOKENS_FILE)) {
  throw new Error("Token file not found — did globalSetup run?")
}

const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"))

global.__TOKEN_A__ = tokens.tokenA
global.__USER_ID_A__ = tokens.userIdA
global.__USERNAME_A__ = tokens.usernameA
global.__TOKEN_B__ = tokens.tokenB
global.__USER_ID_B__ = tokens.userIdB
global.__USERNAME_B__ = tokens.usernameB
