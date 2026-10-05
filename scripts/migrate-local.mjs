import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Keep build output untouched; this companion config is local-only.
const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
for (const db of config.d1_databases ?? []) db.migrations_dir = '../../drizzle';
writeFileSync('dist/server/wrangler.local.json', JSON.stringify(config));
const result = spawnSync(process.execPath, [
  '--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
  'd1', 'migrations', 'apply', 'DB', '--local',
  '--config', 'dist/server/wrangler.local.json',
  '--persist-to', process.env.PRACTICE_TEST_STATE || '.wrangler/state',
], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
