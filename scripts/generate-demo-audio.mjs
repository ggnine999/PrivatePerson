import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 22050;
const FADE_SECONDS = 1.8;
// pad 三层正弦的相位偏移与增益
const PAD_OFFSETS = [0, 0.6, 1.1];
const PAD_GAINS = [0.2, 0.16, 0.11];

// 站内演示曲库：melody 每 6 秒前进一个音符，与 lib/music.ts 的歌词时间轴对齐
const tracks = [
  {
    output: 'public/audio/starlight-demo.wav',
    durationSeconds: 48,
    pulsePeriod: 12,
    pad: [130.81, 196, 261.63],
    shimmer: 1046.5,
    melody: [523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 440, 493.88],
  },
  {
    output: 'public/audio/starlit-night.wav',
    durationSeconds: 36,
    pulsePeriod: 16,
    pad: [110, 164.81, 220],
    shimmer: 880,
    melody: [440, 523.25, 659.25, 587.33, 493.88, 440],
  },
  {
    output: 'public/audio/glimmer-stroll.wav',
    durationSeconds: 36,
    pulsePeriod: 8,
    pad: [146.83, 220, 293.66],
    shimmer: 1318.5,
    melody: [659.25, 783.99, 880, 1046.5, 1174.66, 1046.5],
  },
  {
    output: 'public/audio/afternoon-radio.wav',
    durationSeconds: 36,
    pulsePeriod: 9,
    pad: [98, 146.83, 196],
    shimmer: 783.99,
    melody: [392, 440, 493.88, 587.33, 659.25, 587.33],
  },
];

function renderTrack(spec) {
  const samples = SAMPLE_RATE * spec.durationSeconds;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples; index += 1) {
    const time = index / SAMPLE_RATE;
    const globalFade = Math.min(
      1,
      time / FADE_SECONDS,
      (spec.durationSeconds - time) / FADE_SECONDS,
    );
    const pulse = 0.72 + 0.28 * Math.sin((2 * Math.PI * time) / spec.pulsePeriod);
    const noteIndex = Math.floor(time / 6) % spec.melody.length;
    const noteAge = time % 6;
    const bellEnvelope = Math.exp(-noteAge * 0.72);
    const pad = spec.pad.reduce(
      (sum, frequency, layer) =>
        sum +
        Math.sin(2 * Math.PI * frequency * time + PAD_OFFSETS[layer]) * PAD_GAINS[layer],
      0,
    );
    const bell =
      Math.sin(2 * Math.PI * spec.melody[noteIndex] * time) * bellEnvelope * 0.18 +
      Math.sin(2 * Math.PI * spec.melody[noteIndex] * 2 * time) * bellEnvelope * 0.05;
    const shimmer =
      Math.sin(2 * Math.PI * spec.shimmer * time + Math.sin(time * 0.3)) * 0.018;
    const value = Math.max(-1, Math.min(1, (pad * pulse + bell + shimmer) * globalFade));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  return buffer;
}

async function writeAtomically(output, buffer) {
  await mkdir(dirname(output), { recursive: true });
  // 先写临时文件再替换，避免 dev server 运行中重跑时，进行中的媒体请求读到截断文件。
  // Windows 下目标文件可能被播放中的媒体响应长期占用（rename 需要 DELETE 权限），重试几次。
  const tempOutput = `${output}.tmp`;
  await writeFile(tempOutput, buffer);
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rename(tempOutput, output);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 200));
    }
  }
  await unlink(tempOutput).catch(() => {});
  throw lastError;
}

const failures = [];
for (const spec of tracks) {
  const output = resolve(spec.output);
  try {
    await writeAtomically(output, renderTrack(spec));
    console.log(`Generated ${output}`);
  } catch (error) {
    // 单首被占用（通常正被播放）不阻塞其余曲目，最后汇总报错
    failures.push(spec.output);
    console.warn(`Failed to write ${output}: ${error.code ?? error.message}`);
  }
}
if (failures.length > 0) {
  console.warn(
    `\n${failures.length} track(s) skipped because the file is locked (stop playback and rerun):\n  ${failures.join('\n  ')}`,
  );
  process.exitCode = 1;
}
