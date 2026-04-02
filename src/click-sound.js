import { Howler } from 'howler';
import { isAudioEnabled } from './components/Preloader.jsx';

// Subtle click/pop sound via Web Audio — no file needed
let clickBuffer = null;

function ensureBuffer() {
  if (clickBuffer || !Howler.ctx) return;
  const ctx = Howler.ctx;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.06); // 60ms
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    // Short sine burst with fast decay — soft pop
    const env = Math.exp(-t * 80);
    data[i] = Math.sin(t * 2400 * Math.PI) * env * 0.15;
  }
  clickBuffer = buf;
}

export function playClick() {
  if (!isAudioEnabled()) return;
  if (!Howler.ctx) return;
  ensureBuffer();
  if (!clickBuffer) return;
  const ctx = Howler.ctx;
  const src = ctx.createBufferSource();
  src.buffer = clickBuffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.4;
  src.connect(gain);
  gain.connect(Howler.masterGain || ctx.destination);
  src.start();
}
