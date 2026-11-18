const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "web", "audio", "hei-tou", "firecracker.wav");
const sampleRate = 44100;
const duration = 2.4;
const frameCount = Math.floor(sampleRate * duration);
const channels = 2;
const samples = Array.from({ length: channels }, () => new Float32Array(frameCount));

let randomState = 0x6d2b79f5;
function random() {
  randomState += 0x6d2b79f5;
  let value = randomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const burstTimes = [
  0.02, 0.075, 0.14, 0.225, 0.32, 0.39, 0.475, 0.56, 0.66, 0.73, 0.82,
  0.94, 1.08, 1.22, 1.39, 1.58, 1.8,
];

burstTimes.forEach((time, index) => {
  const strength = index < 6 ? 0.7 : 0.5 - index * 0.012;
  const start = Math.floor(time * sampleRate);
  const tailFrames = Math.floor(sampleRate * (index < 7 ? 0.3 : 0.2));
  const end = Math.min(frameCount, start + tailFrames);
  let previousNoise = 0;

  for (let frame = start; frame < end; frame += 1) {
    const age = (frame - start) / sampleRate;
    const envelope = Math.exp(-age * (index < 7 ? 24 : 42));
    const rawNoise = random() * 2 - 1;
    const crack = rawNoise - previousNoise * 0.82;
    previousNoise = rawNoise;
    const thump =
      Math.sin(2 * Math.PI * (92 - age * 210) * age) *
      Math.exp(-age * 15);
    const value =
      (crack * 0.54 + thump * 0.46) * envelope * strength;
    const pan = index % 2 === 0 ? 0.58 : 0.42;
    samples[0][frame] += value * (1 - pan);
    samples[1][frame] += value * pan;
  }
});

// Sparse burning-paper crackle under the initial report.
for (let index = 0; index < 110; index += 1) {
  const start = Math.floor((0.08 + random() * 1.7) * sampleRate);
  const frames = Math.floor(sampleRate * (0.008 + random() * 0.022));
  const gain = 0.04 + random() * 0.1;
  for (
    let frame = start, offset = 0;
    frame < Math.min(frameCount, start + frames);
    frame += 1, offset += 1
  ) {
    const envelope = Math.pow(1 - offset / frames, 3);
    const value = (random() * 2 - 1) * gain * envelope;
    samples[0][frame] += value;
    samples[1][frame] += value;
  }
}

const fadeFrames = Math.floor(sampleRate * 0.35);
for (let frame = 0; frame < frameCount; frame += 1) {
  const fade = frame > frameCount - fadeFrames
    ? (frameCount - frame) / fadeFrames
    : 1;
  samples.forEach((channel) => {
    channel[frame] = Math.tanh(channel[frame] * 1.25) * fade * 0.82;
  });
}

const bytesPerSample = 2;
const dataSize = frameCount * channels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
buffer.writeUInt16LE(channels * bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let frame = 0; frame < frameCount; frame += 1) {
  samples.forEach((channel) => {
    const value = Math.max(-1, Math.min(1, channel[frame]));
    buffer.writeInt16LE(Math.round(value * 32767), offset);
    offset += bytesPerSample;
  });
}

fs.writeFileSync(outputPath, buffer);
console.log(outputPath);
