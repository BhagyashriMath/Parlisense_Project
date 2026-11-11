/**
 * chamberVoice.ts
 *
 * Real-voice audio broadcast for the parliamentary chamber.
 *
 * SENDER (active mic holder — Speaker):
 *   - Captures mic via getUserMedia
 *   - Encodes Float32 → Int16 PCM
 *   - Streams binary chunks to /ws/audio as "sender"
 *   - Does NOT play back to itself (speaker does not hear their own voice)
 *   - Backend already skips echoing back to the sender (client !== ws)
 *
 * LISTENER (everyone including Members):
 *   - Connects to /ws/audio as "listener"
 *   - Receives PCM chunks ONLY from other senders (never own echo)
 *   - Resumes AudioContext on every incoming chunk to defeat browser
 *     autoplay suspension — this is the key fix for member audio playback
 *   - Auto-reconnects if the WebSocket drops
 *
 * No TTS, no AI voice — purely original microphone audio.
 */

import { API_BASE } from "../../infrastructure/api/api";

function getAudioWsUrl(): string {
  if (API_BASE) {
    try {
      const u = new URL(API_BASE);
      u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
      u.pathname = u.pathname.replace(/\/$/, "") + "/ws/audio";
      return u.toString();
    } catch (_) {}
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/audio`;
}

/* ── SENDER ────────────────────────────────────────────────────────── */

let senderWs: WebSocket | null = null;
let senderStream: MediaStream | null = null;
let senderCtx: AudioContext | null = null;
let senderProcessor: ScriptProcessorNode | null = null;
let senderMuteGain: GainNode | null = null;

export async function startVoiceSend(): Promise<void> {
  if (senderWs && senderWs.readyState === WebSocket.OPEN) return;

  try {
    senderStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    console.warn("[ChamberVoice] Mic access denied:", err);
    return;
  }

  senderCtx = new AudioContext({ sampleRate: 16000 });
  const source = senderCtx.createMediaStreamSource(senderStream);

  // 4096 samples at 16 kHz ≈ 256 ms per chunk
  senderProcessor = senderCtx.createScriptProcessor(4096, 1, 1);
  senderMuteGain = senderCtx.createGain();
  senderMuteGain.gain.value = 0;

  senderWs = new WebSocket(getAudioWsUrl());
  senderWs.binaryType = "arraybuffer";

  senderWs.onopen = () => {
    senderWs!.send(JSON.stringify({ type: "register", role: "sender" }));

    senderProcessor!.onaudioprocess = (e) => {
      if (!senderWs || senderWs.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      senderWs.send(int16.buffer);
    };

    source.connect(senderProcessor!);
    // ScriptProcessorNode callbacks only run while the node is in an active
    // audio graph. A silent output keeps capture running without local echo.
    senderProcessor!.connect(senderMuteGain!);
    senderMuteGain!.connect(senderCtx!.destination);
    console.log("[ChamberVoice] Sender started");
  };

  senderWs.onerror = () => stopVoiceSend();
  senderWs.onclose = () => stopVoiceSend();
}

export function stopVoiceSend(): void {
  try { senderProcessor?.disconnect(); } catch (_) {}
  try { senderMuteGain?.disconnect(); } catch (_) {}
  try { senderCtx?.close(); } catch (_) {}
  try { senderStream?.getTracks().forEach(t => t.stop()); } catch (_) {}
  try { senderWs?.close(); } catch (_) {}
  senderProcessor = null;
  senderMuteGain = null;
  senderCtx = null;
  senderStream = null;
  senderWs = null;
  console.log("[ChamberVoice] Sender stopped");
}

/* ── LISTENER ──────────────────────────────────────────────────────── */

let listenerWs: WebSocket | null = null;
let listenerCtx: AudioContext | null = null;
let nextPlayTime = 0;
let listenerStopped = false;  // tracks intentional stop vs reconnect
const SAMPLE_RATE  = 16000;
const BUFFER_AHEAD = 0.08;    // 80 ms look-ahead scheduling

export function unlockVoiceAudio(): void {
  if (listenerCtx?.state === "suspended") {
    listenerCtx.resume().catch((err) => {
      console.warn("[ChamberVoice] Could not resume audio playback:", err);
    });
  }
}

export function startVoiceListen(): void {
  listenerStopped = false;
  if (listenerWs && listenerWs.readyState === WebSocket.OPEN) return;

  // Create / reuse AudioContext
  if (!listenerCtx || listenerCtx.state === "closed") {
    listenerCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  }
  nextPlayTime = listenerCtx.currentTime + BUFFER_AHEAD;

  listenerWs = new WebSocket(getAudioWsUrl());
  listenerWs.binaryType = "arraybuffer";

  listenerWs.onopen = () => {
    listenerWs!.send(JSON.stringify({ type: "register", role: "listener" }));
    // Resume AudioContext immediately on open (needs a prior user gesture to work)
    if (listenerCtx && listenerCtx.state === "suspended") {
      listenerCtx.resume().catch(() => {});
    }
    console.log("[ChamberVoice] Listener connected");
  };

  listenerWs.onmessage = (event) => {
    if (!listenerCtx || !(event.data instanceof ArrayBuffer)) return;

    // KEY FIX: resume the AudioContext on every incoming audio chunk.
    // Browsers suspend AudioContext created before any user gesture.
    // The first audio message arrives after the user has already interacted
    // (clicked mic button on speaker side), so this resume() will succeed.
    unlockVoiceAudio();

    const int16   = new Int16Array(event.data);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    try {
      const audioBuf = listenerCtx.createBuffer(1, float32.length, SAMPLE_RATE);
      audioBuf.copyToChannel(float32, 0);

      const src = listenerCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(listenerCtx.destination);

      const now = listenerCtx.currentTime;
      // If schedule fell behind (buffer underrun) reset to now + look-ahead
      if (nextPlayTime < now) nextPlayTime = now + BUFFER_AHEAD;
      src.start(nextPlayTime);
      nextPlayTime += audioBuf.duration;
    } catch (_) {}
  };

  listenerWs.onerror = () => {
    listenerWs = null;
    // Auto-reconnect after 2 s unless intentionally stopped
    if (!listenerStopped) setTimeout(startVoiceListen, 2000);
  };

  listenerWs.onclose = () => {
    listenerWs = null;
    if (!listenerStopped) setTimeout(startVoiceListen, 2000);
  };
}

export function stopVoiceListen(): void {
  listenerStopped = true;
  try { listenerWs?.close(); } catch (_) {}
  try { listenerCtx?.close(); } catch (_) {}
  listenerWs = null;
  listenerCtx = null;
  nextPlayTime = 0;
  console.log("[ChamberVoice] Listener stopped");
}
