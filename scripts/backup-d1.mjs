// D1 备份包装：自动创建 backups/ 目录并按日期命名导出文件。
// 用法：node scripts/backup-d1.mjs [local|remote]
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const mode = process.argv[2] === 'remote' ? 'remote' : 'local';
mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const output = `backups/d1-${mode}-${stamp}.sql`;
const flags = mode === 'remote' ? '--remote' : '--local';

// 导出文件包含密码哈希等敏感数据，backups/ 已加入 .gitignore，切勿入库。
execSync(`wrangler d1 export site-creator-d1 ${flags} --output ${output}`, {
  stdio: 'inherit',
});
console.log(`备份完成：${output}`);
