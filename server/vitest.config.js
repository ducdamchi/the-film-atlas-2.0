const { defineConfig } = require("vitest/config")

module.exports = defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: "./tests/globalSetup.js",
    setupFiles: "./tests/setup.js",
    pool: "forks",
    forks: { singleFork: true },
    testTimeout: 15000,
  },
})
