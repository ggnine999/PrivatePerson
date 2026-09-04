// 扫描 public/images/mascots/ 下的图片，生成播放器贴纸清单。
// 往目录里加图后运行 npm run mascots:sync（npm run dev / build 也会自动执行）。
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const mascotDir = resolve('public/images/mascots');
const outputFile = resolve('lib/mascots.generated.json');
const supportedExtensions = new Set(['.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif']);

const files = (await readdir(mascotDir))
  .filter((file) => supportedExtensions.has(extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, 'en'));

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  `${JSON.stringify({ mascots: files.map((file) => ({ file })) }, null, 2)}\n`,
);
console.log(`Mascot manifest: ${files.length} file(s) -> ${outputFile}`);
