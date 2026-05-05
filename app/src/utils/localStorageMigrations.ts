const VERSION_KEY = "app-ls-version";

/**
 * Add new migrations to the END of this array. Each entry runs exactly once
 * per user browser — never edit or remove existing entries.
 */
const migrations: Array<() => void> = [
  // v1 — rename "map-showBelowMapContent" → "map-showPanel"
  () => localStorage.removeItem("map-showBelowMapContent"),
];

export function runMigrations(): void {
  const stored = localStorage.getItem(VERSION_KEY);
  const currentVersion = stored !== null ? parseInt(stored, 10) : 0;
  const targetVersion = migrations.length;

  if (currentVersion >= targetVersion) return;

  for (let i = currentVersion; i < targetVersion; i++) {
    migrations[i]();
  }

  localStorage.setItem(VERSION_KEY, String(targetVersion));
}
