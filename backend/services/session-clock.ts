export interface ClockState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  pauseTimestamp: number | null;
  pausedElapsedSeconds: number;
  activeSpeakerId: string;
  speakingStartTime: number;
  speakingDuration: number;
  memberSpeakingMs: Record<string, number>;
}

export function readSessionClock(state: ClockState, now: number) {
  const endpoint = state.isPaused ? (state.pauseTimestamp ?? now) : now;
  const turnMs = state.isActive && state.activeSpeakerId
    ? Math.max(0, endpoint - state.speakingStartTime) : 0;
  const totals = { ...state.memberSpeakingMs };
  if (state.isActive && state.activeSpeakerId) {
    totals[state.activeSpeakerId] = (totals[state.activeSpeakerId] ?? 0) + turnMs;
  }
  return {
    sessionSeconds: state.isActive
      ? Math.floor(Math.max(0, endpoint - state.startTime) / 1000)
      : state.pausedElapsedSeconds,
    speakingSeconds: Math.floor(turnMs / 1000),
    memberSeconds: Object.fromEntries(Object.entries(totals).map(([id, ms]) => [id, Math.floor(ms / 1000)])),
    turnMs,
  };
}

/** Apply control changes at their exact timestamp, independently of polling. */
export function updateSessionClock<T extends ClockState>(state: T, change: Partial<T>, now: number): T {
  const next = { ...state, ...change, memberSpeakingMs: { ...state.memberSpeakingMs } };
  const restarting = change.isActive === true && (!state.isActive || change.startTime !== undefined);
  if (restarting) {
    return { ...next, startTime: now, speakingStartTime: now, speakingDuration: 0,
      pausedElapsedSeconds: 0, pauseTimestamp: next.isPaused ? now : null, memberSpeakingMs: {} };
  }
  const clock = readSessionClock(state, now);
  const changingSpeaker = change.activeSpeakerId !== undefined && change.activeSpeakerId !== state.activeSpeakerId;
  if (changingSpeaker || (state.isActive && !next.isActive)) {
    if (state.isActive && state.activeSpeakerId) {
      next.memberSpeakingMs = { ...next.memberSpeakingMs,
        [state.activeSpeakerId]: (next.memberSpeakingMs[state.activeSpeakerId] ?? 0) + clock.turnMs };
    }
    next.speakingStartTime = state.isPaused ? (state.pauseTimestamp ?? now) : now;
    next.speakingDuration = 0;
  }
  if (state.isActive && !next.isActive) {
    next.pausedElapsedSeconds = clock.sessionSeconds;
    next.isPaused = false;
    next.pauseTimestamp = null;
  } else if (next.isActive && !state.isPaused && next.isPaused) {
    next.pauseTimestamp = now;
    next.pausedElapsedSeconds = clock.sessionSeconds;
    next.speakingDuration = changingSpeaker ? 0 : clock.speakingSeconds;
  } else if (state.isPaused && !next.isPaused) {
    const gap = Math.max(0, now - (state.pauseTimestamp ?? now));
    next.startTime += gap;
    next.speakingStartTime += gap;
    next.pauseTimestamp = null;
  }
  return next;
}
