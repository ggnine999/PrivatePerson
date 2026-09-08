import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const username = (process.argv[2] ?? '').trim().toLowerCase();
const permission = Number(process.argv[3]);

if (!/^[a-z0-9]{3,20}$/.test(username) || ![0, 1].includes(permission)) {
  console.error('Usage: npm run account:permission -- <username> <0|1>');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const sql = `UPDATE community_users SET permission = ${permission} WHERE username = '${username}' RETURNING username, permission`;
const result = spawnSync(
  process.execPath,
  [
    wrangler,
    'd1',
    'execute',
    'site-creator-d1',
    '--local',
    '--persist-to',
    path.join(root, '.wrangler', 'state'),
    '--config',
    path.join(root, 'wrangler.jsonc'),
    '--command',
    sql,
    '--json',
  ],
  { cwd: root, encoding: 'utf8' },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || 'Failed to update account permission.\n');
  process.exit(result.status ?? 1);
}

let rows = [];
try {
  const payload = JSON.parse(result.stdout);
  rows = payload.flatMap((entry) => entry?.results ?? []);
} catch {
  console.error('Could not verify the permission update result.');
  process.exit(1);
}

if (rows.length !== 1) {
  console.error(`Account not found: ${username}`);
  process.exit(1);
}

console.log(`Updated ${username}: permission=${permission}`);
