/**
 * Member Domain Model & Audio Synthesizer Logic
 */

export { speakMessage, speakAlert, speakFloorSpeech } from "../../../shared/utils/chamberAudio";


export function calculateMemberTimeMetrics(
  usedSeconds: number,
  allocatedSeconds: number = 300
): {
  remainingSeconds: number;
  isQuotaExhausted: boolean;
  timePercent: number;
  isWarningZone: boolean;
} {
  const remainingSeconds = Math.max(0, allocatedSeconds - usedSeconds);
  const isQuotaExhausted = remainingSeconds === 0;
  const timePercent = allocatedSeconds > 0 ? Math.min(100, Math.max(0, (usedSeconds / allocatedSeconds) * 100)) : 100;
  const isWarningZone =
    remainingSeconds > 0 && remainingSeconds <= allocatedSeconds * 0.15;

  return {
    remainingSeconds,
    isQuotaExhausted,
    timePercent,
    isWarningZone
  };
}
