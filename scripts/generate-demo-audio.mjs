import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sampleRate = 22050;
const durationSeconds = 48;
const samples = sampleRate * durationSeconds;
const output = resolve('public/audio/starlight-demo.wav');
const dataSize = samples * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 440, 493.88];
for (let index = 0; index < samples; index += 1) {
  const time = index / sampleRate;
  const globalFade = Math.min(1, time / 1.8, (durationSeconds - time) / 1.8);
  const pulse = 0.72 + 0.28 * Math.sin((2 * Math.PI * time) / 12);
  const noteIndex = Math.floor(time / 6) % melody.length;
  const noteAge = time % 6;
  const bellEnvelope = Math.exp(-noteAge * 0.72);
  const pad =
    Math.sin(2 * Math.PI * 130.81 * time) * 0.2 +
    Math.sin(2 * Math.PI * 196 * time + 0.6) * 0.16 +
    Math.sin(2 * Math.PI * 261.63 * time + 1.1) * 0.11;
  const bell =
    Math.sin(2 * Math.PI * melody[noteIndex] * time) * bellEnvelope * 0.18 +
    Math.sin(2 * Math.PI * melody[noteIndex] * 2 * time) * bellEnvelope * 0.05;
  const shimmer =
    Math.sin(2 * Math.PI * 1046.5 * time + Math.sin(time * 0.3)) * 0.018;
  const value = Math.max(
    -1,
    Math.min(1, (pad * pulse + bell + shimmer) * globalFade),
  );
  buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
}

await mkdir(dirname(output), { recursive: true });
// 先写临时文件再替换，避免 dev server 运行中重跑时，进行中的媒体请求读到截断文件。
const tempOutput = `${output}.tmp`;
await writeFile(tempOutput, buffer);
await rename(tempOutput, output);
console.log(`Generated ${output}`);
