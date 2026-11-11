/**
 * Speaker Domain Model & Business Logic
 */

export function calculateSpeakingProgress(
  speakingSeconds: number,
  allocatedSeconds: number = 300
): {
  timeRemaining: number;
  timePercent: number;
  isTimeOver: boolean;
} {
  const timeRemaining = Math.max(0, allocatedSeconds - speakingSeconds);
  const timePercent = allocatedSeconds > 0 ? Math.min(100, Math.max(0, (speakingSeconds / allocatedSeconds) * 100)) : 100;
  const isTimeOver = speakingSeconds >= allocatedSeconds;
  return { timeRemaining, timePercent, isTimeOver };
}

export function isCriticalAlert(severity?: string): boolean {
  return severity === "CRITICAL" || severity === "HIGH";
}
