/**
 * Chamber Audio & Speech Engine
 * Provides robust Web Audio API alert sound effects and multi-role Speech Synthesis (TTS).
 * Automatically unlocks audio on user gestures and ensures speech from members & speaker
 * is clearly audible to all participants in the chamber.
 */

// Global singletons
let sharedAudioCtx: AudioContext | null = null;
const activeUtterances = new Set<SpeechSynthesisUtterance>();
let cachedVoices: SpeechSynthesisVoice[] = [];
let audioUnlocked = false;
let globalIsMuted = false;
let lastSpeakTimestamp = 0;

// Queue for floor speech to avoid overlapping or chopped utterances
interface FloorSpeechItem {
  id: string;
  text: string;
  isSpeakerRole: boolean;
  speakerName?: string;
}
const floorSpeechQueue: FloorSpeechItem[] = [];
let isProcessingQueue = false;

export function setChamberMuted(muted: boolean) {
  globalIsMuted = muted;
  if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
    floorSpeechQueue.length = 0;
    activeUtterances.clear();
  }
}

export function isChamberMuted(): boolean {
  return globalIsMuted;
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

// Ensure voices are fetched as soon as browser emits voiceschanged event
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }
}

/**
 * Actively unlock audio context and speech synthesis on user interaction.
 */
export function unlockChamberAudio(playConfirmChime = false) {
  audioUnlocked = true;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.resume();
    } catch (_) {}
  }
  if (playConfirmChime) {
    playChamberAlertChime("LOW");
  }
}

export function initChamberAudio() {
  if (typeof window === "undefined") return;
  loadVoices();

  const handleUserGesture = () => {
    unlockChamberAudio();
  };

  // Keep persistent event listeners so every interaction ensures AudioContext is alive
  window.addEventListener("click", handleUserGesture, { passive: true });
  window.addEventListener("keydown", handleUserGesture, { passive: true });
  window.addEventListener("touchstart", handleUserGesture, { passive: true });
  window.addEventListener("pointerdown", handleUserGesture, { passive: true });
  document.addEventListener("click", handleUserGesture, { passive: true });
}

// Auto-init on script load
if (typeof window !== "undefined") {
  initChamberAudio();
}

/**
 * Play an acoustic alert chime for chamber notifications and warnings.
 */
export function playChamberAlertChime(severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM") {
  if (globalIsMuted || typeof window === "undefined") return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const emitChime = () => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isCritical = severity === "CRITICAL";
      const isHigh = severity === "HIGH";

      osc.type = isCritical ? "sawtooth" : isHigh ? "triangle" : "sine";
      const freq = isCritical ? 780 : isHigh ? 620 : 480;
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(freq, now);
      if (isCritical || isHigh) {
        osc.frequency.setValueAtTime(freq * 1.25, now + 0.12);
        osc.frequency.setValueAtTime(freq * 1.5, now + 0.24);
      }

      gain.gain.setValueAtTime(isCritical ? 0.22 : 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (err) {
      console.warn("[ChamberAudio] emitChime error:", err);
    }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(emitChime).catch(() => {});
  } else {
    emitChime();
  }
}

/**
 * Select the best matching voice and language for the given parliamentary role.
 * IMPORTANT: To prevent "language-unavailable" silent failures in Chromium on Windows,
 * utt.lang MUST match the selected voice's actual language (e.g. en-US if Microsoft David).
 */
function selectBestVoice(isSpeakerRole: boolean): { voice: SpeechSynthesisVoice | null; lang: string } {
  const voices = loadVoices();
  if (!voices || voices.length === 0) {
    return { voice: null, lang: navigator.language || "en-US" };
  }

  // Look for English voices
  const enVoices = voices.filter(v => v.lang.startsWith("en") || v.lang.startsWith("en-"));

  if (isSpeakerRole) {
    // Authoritative, dignified Dais Presiding Officer voice
    const speakerVoice =
      enVoices.find(v => v.name.includes("David") || v.name.includes("Ravi") || v.name.includes("Male") || v.name.includes("George")) ||
      enVoices.find(v => !v.name.includes("Zira") && !v.name.includes("Female")) ||
      enVoices[0] ||
      voices[0];
    return { voice: speakerVoice, lang: speakerVoice?.lang || "en-US" };
  } else {
    // Articulate Parliamentarian Floor Member debate voice
    const memberVoice =
      enVoices.find(v => v.name.includes("Zira") || v.name.includes("Heera") || v.name.includes("Natural") || v.name.includes("Mark")) ||
      enVoices[1] ||
      enVoices[0] ||
      voices[0];
    return { voice: memberVoice, lang: memberVoice?.lang || "en-US" };
  }
}

const recentSpokenAlerts = new Map<string, number>();

/**
 * Speak an urgent or standard warning/alert message out loud.
 */
export function speakAlert(
  text: string,
  category = "alert",
  isUrgent = false
) {
  if (globalIsMuted || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  const now = Date.now();
  const lastSpoken = recentSpokenAlerts.get(trimmed) || 0;
  if (!isUrgent && now - lastSpoken < 4000) return;
  recentSpokenAlerts.set(trimmed, now);

  const executeSpeak = () => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utt = new SpeechSynthesisUtterance(trimmed);
      const { voice, lang } = selectBestVoice(false);
      if (voice) {
        utt.voice = voice;
        utt.lang = voice.lang || lang;
      } else {
        utt.lang = lang || "en-US";
      }

      utt.rate = 1.0;
      utt.pitch = 1.05;
      utt.volume = 1.0;

      activeUtterances.add(utt);

      utt.onend = () => {
        activeUtterances.delete(utt);
        processFloorSpeechQueue();
      };
      utt.onerror = (e) => {
        console.warn("[ChamberAudio] speakAlert utterance error:", e);
        activeUtterances.delete(utt);
        processFloorSpeechQueue();
      };

      window.speechSynthesis.speak(utt);
    } catch (err) {
      console.warn("[ChamberAudio] speakAlert error:", err);
    }
  };

  if (isUrgent) {
    try {
      window.speechSynthesis.cancel();
      activeUtterances.clear();
      floorSpeechQueue.length = 0;
    } catch (_) {}
    // Delay slightly to prevent Chromium bug where cancel() immediately cancels the next speak()
    setTimeout(executeSpeak, 50);
  } else {
    executeSpeak();
  }
}

/**
 * Speak floor speech delivered by a member or the speaker.
 * Multiple speech snippets are queued and spoken sequentially.
 */
export function speakFloorSpeech(
  text: string,
  speakerId?: string,
  speakerName?: string,
  isSpeakerRole = false
) {
  if (globalIsMuted || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const trimmed = text.trim();
  if (trimmed.length < 2) return;

  // Enqueue snippet
  const id = `speech-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  floorSpeechQueue.push({ id, text: trimmed, isSpeakerRole, speakerName });
  processFloorSpeechQueue();
}

function processFloorSpeechQueue() {
  if (globalIsMuted || floorSpeechQueue.length === 0 || isProcessingQueue) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Unpause if Chromium auto-paused in background
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Watchdog: If Chromium gets stuck in speaking state for > 10s, clear and unblock
  if (window.speechSynthesis.speaking) {
    if (lastSpeakTimestamp > 0 && Date.now() - lastSpeakTimestamp > 10000) {
      console.warn("[ChamberAudio] Resetting stuck speech synthesis queue");
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      activeUtterances.clear();
    } else {
      return;
    }
  }

  const item = floorSpeechQueue.shift();
  if (!item) return;

  isProcessingQueue = true;
  lastSpeakTimestamp = Date.now();

  try {
    window.speechSynthesis.resume();
    const utt = new SpeechSynthesisUtterance(item.text);
    const { voice, lang } = selectBestVoice(item.isSpeakerRole);

    if (voice) {
      utt.voice = voice;
      utt.lang = voice.lang || lang;
    } else {
      utt.lang = lang || "en-US";
    }

    if (item.isSpeakerRole) {
      // Dignified, authoritative Chair voice
      utt.pitch = 0.95;
      utt.rate = 0.96;
    } else {
      // Articulate parliamentarian floor debate voice
      utt.pitch = 1.04;
      utt.rate = 1.02;
    }
    utt.volume = 1.0;

    activeUtterances.add(utt);

    const onDone = () => {
      activeUtterances.delete(utt);
      isProcessingQueue = false;
      setTimeout(processFloorSpeechQueue, 80);
    };

    utt.onend = onDone;
    utt.onerror = (e) => {
      console.warn("[ChamberAudio] Floor speech utterance error:", e);
      onDone();
    };

    window.speechSynthesis.speak(utt);
  } catch (err) {
    isProcessingQueue = false;
    console.warn("[ChamberAudio] processFloorSpeechQueue error:", err);
  }
}

/**
 * Legacy compatible alias for existing imports.
 */
export function speakMessage(
  text: string,
  category = "general",
  cooldownMs = 0
) {
  speakAlert(text, category, false);
}
