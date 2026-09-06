// 星屿音击：Web Audio 合成引擎。
//
// 采用 "A Tale of Two Clocks"（web.dev/audio-scheduling）的预调度模式：
// 所有音符事件换算成 AudioContext 硬件时钟上的绝对时间，由 25ms 间隔的
// lookahead 调度器提前 120ms 精确排程；rAF 渲染循环只负责绘制，绝不参与计时。
// 歌曲当前时间 = ctx.currentTime - startTime，暂停用 ctx.suspend()（时钟冻结，
// 已排程的音符原地挂起，恢复后无缝续播）。

import type { RhythmTrack, SongEvent } from '@/lib/rhythm/tracks';

type ScheduledEvent = { time: number; event: SongEvent };

const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;

export class SongSynth {
  private ctx: AudioContext;
  private master: GainNode;
  private leadBus: GainNode;
  private bassBus: GainNode;
  private padBus: GainNode;
  private drumBus: GainNode;
  private echoSend: GainNode;
  private noiseBuffer: AudioBuffer;

  private track: RhythmTrack | null = null;
  private events: ScheduledEvent[] = [];
  private cursor = 0;
  private startTime = 0;
  private spb = 0.5;
  private timer: number | null = null;

  static async create(): Promise<SongSynth> {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    return new SongSynth(ctx);
  }

  private constructor(ctx: AudioContext) {
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 6;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(compressor);

    // 简易回声（反馈延迟）作为混响替代，斜率温和、开销极低
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.26;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = 1;
    this.echoSend.connect(delay);

    this.leadBus = ctx.createGain();
    this.bassBus = ctx.createGain();
    this.padBus = ctx.createGain();
    this.drumBus = ctx.createGain();
    this.leadBus.connect(this.master);
    this.bassBus.connect(this.master);
    this.padBus.connect(this.master);
    this.drumBus.connect(this.master);
    // 旋律和军鼓送一点回声
    this.leadBus.connect(this.echoSend);
    const snareEcho = ctx.createGain();
    snareEcho.gain.value = 0.5;
    this.drumBus.connect(snareEcho);
    snareEcho.connect(this.echoSend);

    const length = Math.floor(ctx.sampleRate * 1);
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** 输出延迟：判定时要从按下时间里减掉（声音晚于时钟）。 */
  get latencySec(): number {
    const output = (this.ctx as AudioContext & { outputLatency?: number }).outputLatency;
    return (this.ctx.baseLatency ?? 0) + (output ?? 0);
  }

  get sampleRate() {
    return this.ctx.sampleRate;
  }

  start(track: RhythmTrack, tempoMul = 1) {
    this.resetBuses();
    this.track = track;
    this.spb = 60 / (track.bpm * tempoMul);
    const events: ScheduledEvent[] = [];
    for (const event of track.events) {
      events.push({ time: (event as { beat: number }).beat * this.spb, event });
    }
    events.sort((a, b) => a.time - b.time);
    this.events = events;
    this.cursor = 0;
    this.startTime = this.ctx.currentTime + 0.2;
    this.scheduleAhead();
    this.timer = window.setInterval(() => this.scheduleAhead(), TICK_MS);
  }

  /** 歌曲时间（秒），可能为负（尚未开始）。 */
  songTime(): number {
    if (!this.track) return 0;
    return this.ctx.currentTime - this.startTime;
  }

  /** 总时长（秒）= 最后一个事件 + 2 拍余韵。 */
  durationSec(): number {
    if (!this.track) return 0;
    const lastBeat = this.track.events.reduce(
      (max, event) => Math.max(max, (event as { beat: number }).beat),
      0,
    );
    return (lastBeat + 2) * this.spb;
  }

  beatsToSec(beats: number): number {
    return beats * this.spb;
  }

  async suspend() {
    if (this.ctx.state === 'running') await this.ctx.suspend();
  }

  async resume() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  /** 击打反馈音（即时播放，不进调度器）。 */
  playHit(judgment: 'perfect' | 'great' | 'good' | 'miss') {
    const t = this.ctx.currentTime;
    if (judgment === 'miss') {
      this.blip(120, t, 0.12, 0.06, 'sine', 70);
      return;
    }
    const freq = judgment === 'perfect' ? 1318 : judgment === 'great' ? 988 : 784;
    const gain = judgment === 'perfect' ? 0.11 : judgment === 'great' ? 0.09 : 0.07;
    this.blip(freq, t, 0.06, gain, 'sine');
  }

  dispose() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    void this.ctx.close().catch(() => undefined);
  }

  private scheduleAhead() {
    const horizon = this.ctx.currentTime + LOOKAHEAD_SEC;
    while (this.cursor < this.events.length && this.events[this.cursor].time < horizon) {
      const next = this.events[this.cursor];
      this.trigger(next.event, this.startTime + next.time);
      this.cursor += 1;
    }
  }

  private trigger(event: SongEvent, time: number) {
    const track = this.track;
    if (!track) return;
    switch (event.t) {
      case 'lead':
        this.leadNote(event.midi, time, event.dur * this.spb, track, event.gain ?? 1);
        break;
      case 'bass':
        this.bassNote(event.midi, time, event.dur * this.spb, track, event.gain ?? 1);
        break;
      case 'pad':
        this.padChord(event.midis, time, event.dur * this.spb, track, event.gain ?? 1);
        break;
      case 'kick':
        this.kick(time, (event.gain ?? 1) * track.drumGain);
        break;
      case 'snare':
        this.snare(time, (event.gain ?? 1) * track.drumGain);
        break;
      case 'hat':
        this.hat(time, (event.gain ?? 1) * track.drumGain);
        break;
    }
  }

  private leadNote(midi: number, time: number, dur: number, track: RhythmTrack, mul: number) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track.lead.cutoff;
    filter.Q.value = 0.8;
    const env = this.ctx.createGain();
    const peak = track.lead.gain * mul;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.01);
    env.gain.exponentialRampToValueAtTime(Math.max(peak * 0.55, 0.001), time + Math.max(dur * 0.7, 0.05));
    env.gain.exponentialRampToValueAtTime(0.001, time + dur + 0.14);
    filter.connect(env);
    env.connect(this.leadBus);
    for (const detune of [-5, 5]) {
      const osc = this.ctx.createOscillator();
      osc.type = track.lead.wave;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + dur + 0.2);
    }
  }

  private bassNote(midi: number, time: number, dur: number, track: RhythmTrack, mul: number) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = track.bass.cutoff;
    const env = this.ctx.createGain();
    const peak = track.bass.gain * mul;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, time + Math.max(dur + 0.05, 0.1));
    filter.connect(env);
    env.connect(this.bassBus);
    const osc = this.ctx.createOscillator();
    osc.type = track.bass.wave;
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  private padChord(midis: number[], time: number, dur: number, track: RhythmTrack, mul: number) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 950;
    const env = this.ctx.createGain();
    const peak = track.padGain * mul;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + Math.min(0.3, dur * 0.3));
    env.gain.setValueAtTime(peak, time + Math.max(dur - 0.35, 0.3));
    env.gain.linearRampToValueAtTime(0.0001, time + dur + 0.25);
    filter.connect(env);
    env.connect(this.padBus);
    for (const midi of midis) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      for (const detune of [-7, 7]) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + dur + 0.3);
      }
    }
  }

  private kick(time: number, gain: number) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.85 * gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.connect(env);
    env.connect(this.drumBus);
    osc.start(time);
    osc.stop(time + 0.32);
  }

  private snare(time: number, gain: number) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1900;
    filter.Q.value = 0.9;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.5 * gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.19);
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.drumBus);
    noise.start(time);
    noise.stop(time + 0.2);
    this.blip(190, time, 0.05, 0.28 * gain, 'sine');
  }

  private hat(time: number, gain: number) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.32 * gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.drumBus);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  private blip(
    freq: number,
    time: number,
    dur: number,
    gain: number,
    wave: OscillatorType,
    dropTo?: number,
  ) {
    const osc = this.ctx.createOscillator();
    osc.type = wave;
    if (dropTo) {
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(dropTo, time + dur);
    } else {
      osc.frequency.value = freq;
    }
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // 重开一曲时换掉总线：已排程但未发声的旧节点悬空，不会混进新一局
  private resetBuses() {
    for (const bus of [this.leadBus, this.bassBus, this.padBus, this.drumBus]) {
      bus.disconnect();
    }
    const ctx = this.ctx;
    this.leadBus = ctx.createGain();
    this.bassBus = ctx.createGain();
    this.padBus = ctx.createGain();
    this.drumBus = ctx.createGain();
    this.leadBus.connect(this.master);
    this.bassBus.connect(this.master);
    this.padBus.connect(this.master);
    this.drumBus.connect(this.master);
    this.leadBus.connect(this.echoSend);
    const snareEcho = ctx.createGain();
    snareEcho.gain.value = 0.5;
    this.drumBus.connect(snareEcho);
    snareEcho.connect(this.echoSend);
  }
}
