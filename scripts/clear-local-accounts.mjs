import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.argv[2] !== '--yes') {
  console.error('This clears local website accounts. Re-run with: npm run account:clear-local -- --yes');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const commands = [
  'DELETE FROM owner_sessions',
  'DELETE FROM community_sessions',
  "UPDATE article_comments SET author_type = 'guest', author_user_id = NULL WHERE author_user_id IS NOT NULL",
  "UPDATE site_messages SET author_type = 'guest', author_user_id = NULL WHERE author_user_id IS NOT NULL",
  'DELETE FROM game_scores',
  'DELETE FROM community_users',
  'DELETE FROM login_attempts',
  "DELETE FROM request_rate_limits WHERE scope LIKE 'community-%'",
];

for (const sql of commands) {
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
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Local website accounts and sessions cleared; public content and vault data were preserved.');
