/**
 * MemberSelfCamera — Physical Movement Detection (Module 1)
 *
 * Uses real YOLO detection via POST /api/ai/vision-frame (Node backend →
 * Python ML service → YOLOv8/v11 or pixel-based fallback when model absent).
 *
 * Detection rules:
 *  - Every 350 ms a JPEG frame is captured and sent to the YOLO backend.
 *  - If the person's bounding-box centre is outside the boundary → BOUNDARY_VIOLATION.
 *  - If no person is detected for MISSING_GRACE_FRAMES consecutive frames
 *    (handled server-side) → PERSON_MISSING audio alert fires ONCE per episode.
 *  - When person reappears the missing state resets; next disappearance fires a NEW alert.
 *  - Boundary violation alert repeats every BOUNDARY_REPEAT_MS while outside zone.
 *  - Missing alert repeats every MISSING_REPEAT_MS while person remains absent.
 *
 * Dashboard display (unchanged UI):
 *  - Dashed boundary rectangle on video overlay
 *  - Green/red bounding box with YOLO-style corner brackets + track-ID label
 *  - Tracking ID, position (cx%, cy%), alert status in identity bar
 *  - NOT DETECTED / BOUNDARY VIOLATION banners
 *
 * No pixel-diff, no simulated data, no duplicate components.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Camera, Video, VideoOff, User, AlertTriangle } from "lucide-react";
import { API_BASE, sendVisionFrame } from "../../../infrastructure/api/api";

interface MemberSelfCameraProps {
  memberId:   string;
  seatId:     string;
  micId:      string;
  memberName: string;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FRAME_INTERVAL_MS   = 350;    // capture + send interval
const ENCODE_W            = 320;    // JPEG encode width  (saves bandwidth)
const ENCODE_H            = 180;    // JPEG encode height
const ENCODE_QUALITY      = 0.65;   // JPEG quality

// Boundary box sent to Python (0-100 normalised %)
const BOUNDARY = { x1: 10, y1: 5, x2: 90, y2: 95 };

// Audio alert repeat intervals
// MISSING  : fires ONCE per episode (one-shot per disappearance).
//            Resets only when the person reappears.
// BOUNDARY : repeats every 10 s while outside zone (the person can hear and correct).
const BOUNDARY_REPEAT_MS  = 10_000;

// Server-side report cooldown
const REPORT_COOLDOWN_MS  = 20_000;

// ── Types ─────────────────────────────────────────────────────────────────────
interface YoloResult {
  person_detected:  boolean;
  person_count:     number | undefined;
  track_id:         number;
  position:         { cx: number; cy: number; bbox: { x1: number; y1: number; x2: number; y2: number } } | null;
  confidence:       number;
  inside_boundary:  boolean;
  alert_type:       "NONE" | "BOUNDARY_VIOLATION" | "PERSON_MISSING" | "PERSON_STILL_MISSING";
  alert_message:    string;
  is_new_alert:     boolean;
  status:           string;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
// Chrome requires a prior user gesture to unlock speechSynthesis.
// We track whether audio has been unlocked by a click/tap on this page.
let _audioUnlocked = false;
function unlockAudio() {
  if (!_audioUnlocked) {
    _audioUnlocked = true;
    // Resume any suspended AudioContext (belt-and-suspenders for Chrome)
    try { window.speechSynthesis.resume(); } catch (_) {}
  }
}
// Attach once at module load — will fire on the first user interaction
if (typeof window !== "undefined") {
  window.addEventListener("click",      unlockAudio, { once: false, passive: true });
  window.addEventListener("keydown",    unlockAudio, { once: false, passive: true });
  window.addEventListener("touchstart", unlockAudio, { once: false, passive: true });
  window.addEventListener("pointerdown",unlockAudio, { once: false, passive: true });
}

function speak(msg: string) {
  if (!msg || typeof window === "undefined") return;
  // If not yet unlocked by a user gesture, queue a brief silent utterance
  // to ensure the first real alert isn't swallowed by Chrome's autoplay policy.
  if (!_audioUnlocked) {
    try {
      const dummy = new SpeechSynthesisUtterance(" ");
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
      _audioUnlocked = true;
    } catch (_) {}
  }
  try {
    // Cancel any currently speaking utterance so the new alert plays immediately
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    u.rate   = 1.0;
    u.volume = 1.0;
    u.pitch  = 1.0;
    // Chrome bug: speak() right after cancel() can be silently dropped.
    // A tiny setTimeout lets the cancel complete before the new utterance starts.
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch (_) {}
    }, 80);
  } catch (_) {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MemberSelfCamera({ memberId, seatId, micId, memberName, className = "" }: MemberSelfCameraProps) {

  // DOM refs
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);  // visible YOLO overlay
  const captureRef = useRef<HTMLCanvasElement | null>(null);  // hidden encode canvas
  const streamRef  = useRef<MediaStream | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Alert timing refs (avoid re-renders on each frame)
  const lastMissingAlertAt  = useRef<number>(0);
  const lastBoundaryAlertAt = useRef<number>(0);
  const lastReportAt        = useRef<number>(0);
  const missingAlertFired   = useRef<boolean>(false); // tracks one-shot per episode
  const violationActive     = useRef<boolean>(false);

  // UI state
  const [cameraActive,   setCameraActive]   = useState(false);
  const [cameraError,    setCameraError]    = useState<string | null>(null);
  const [hasResult,      setHasResult]      = useState(false);
  const [yolo,           setYolo]           = useState<YoloResult>({
    person_detected: true, person_count: 0, track_id: 0,
    position: null, confidence: 0, inside_boundary: true,
    alert_type: "NONE", alert_message: "", is_new_alert: false, status: "",
  });

  // ── Camera lifecycle ───────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError" ? "Camera permission denied. Please allow camera access."
        : err?.name === "NotFoundError"  ? "No camera device found on this machine."
        : `Camera unavailable: ${err?.message || "unknown"}`
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    lastMissingAlertAt.current  = 0;
    lastBoundaryAlertAt.current = 0;
    missingAlertFired.current   = false;
    violationActive.current     = false;
    setCameraActive(false);
    setHasResult(false);
    setYolo(prev => ({ ...prev, person_detected: true, alert_type: "NONE" }));
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  // ── Server presence report ─────────────────────────────────────────────────
  const reportServer = useCallback(async (type: string, conf: number) => {
    const now = Date.now();
    const isTransition = type === "NORMAL" || type === "MEMBER_ABSENT";
    if (!isTransition && now - lastReportAt.current < REPORT_COOLDOWN_MS) return;
    lastReportAt.current = now;
    try {
      await fetch(`${API_BASE}/api/ai/member-presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId, seat_id: seatId, mic_id: micId,
          violation_type: type, confidence: conf.toFixed(2),
          timestamp: new Date().toISOString(), session_id: null,
        }),
      });
    } catch (_) {}
  }, [memberId, seatId, micId]);

  // ── YOLO frame loop ────────────────────────────────────────────────────────
  const runYolo = useCallback(async () => {
    const video   = videoRef.current;
    const capture = captureRef.current;
    if (!video || !capture || video.readyState < 2) return;

    // Capture frame into hidden canvas and encode to JPEG
    const ctx = capture.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, ENCODE_W, ENCODE_H);
    const b64 = capture.toDataURL("image/jpeg", ENCODE_QUALITY);

    let result: YoloResult;
    try {
      const res = await sendVisionFrame({
        frame_b64:   b64,
        member_id:   memberId,
        seat_id:     seatId,
        boundary_x1: BOUNDARY.x1,
        boundary_y1: BOUNDARY.y1,
        boundary_x2: BOUNDARY.x2,
        boundary_y2: BOUNDARY.y2,
      });

      // If ML backend unavailable, keep last known state — do not falsely flag absent
      if ((res as any).status === "ML_UNAVAILABLE") return;

      result = res as unknown as YoloResult;
    } catch (_) {
      return; // network error — keep last state
    }

    setYolo(result);
    setHasResult(true);

    // ── Audio alert logic ──────────────────────────────────────────────────
    if (!result.person_detected) {
      // Person not visible.
      // Fire audio ONCE per missing episode (when Python sends is_new_alert=true).
      // Do NOT repeat — user requirement: one alert per disappearance event.
      if (result.is_new_alert && result.alert_type === "PERSON_MISSING") {
        speak(
          "Warning. You are not visible in the camera frame. " +
          "Please return to your seat and face the camera."
        );
      }
      reportServer("MEMBER_ABSENT", 0.95);
      lastBoundaryAlertAt.current = 0;

    } else {
      // Person is visible — missing episode ended, boundary timer resets
      lastMissingAlertAt.current = 0;

      if (result.alert_type === "BOUNDARY_VIOLATION") {
        const now2 = Date.now();
        if (now2 - lastBoundaryAlertAt.current >= BOUNDARY_REPEAT_MS) {
          lastBoundaryAlertAt.current = now2;
          speak(
            "Warning. You have moved outside your designated boundary area. " +
            "Please return to your assigned seat immediately."
          );
        }
        violationActive.current = true;
        reportServer("UNAUTHORIZED_MOVEMENT", 0.90);
      } else {
        lastBoundaryAlertAt.current = 0;
        if (violationActive.current) {
          violationActive.current = false;
          reportServer("NORMAL", 0.95);
        }
      }
    }
  }, [memberId, seatId, reportServer]);

  // ── Start YOLO loop when camera warms up ───────────────────────────────────
  useEffect(() => {
    if (!cameraActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    // 1 s warmup — lets camera auto-exposure settle before first frame
    const warmup = setTimeout(() => {
      timerRef.current = setInterval(runYolo, FRAME_INTERVAL_MS);
    }, 1000);
    return () => {
      clearTimeout(warmup);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cameraActive, runYolo]);

  // ── YOLO canvas overlay (animates at ~60 fps, reads yolo state) ───────────
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !cameraActive) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const isViol  = yolo.alert_type === "BOUNDARY_VIOLATION";
      const isMiss  = hasResult && !yolo.person_detected;
      const pulse   = 0.5 + 0.5 * Math.sin(Date.now() / 350);

      // ── Boundary dashed rectangle ──────────────────────────────────────
      const bx = (BOUNDARY.x1 / 100) * W, by = (BOUNDARY.y1 / 100) * H;
      const bW = ((BOUNDARY.x2 - BOUNDARY.x1) / 100) * W;
      const bH = ((BOUNDARY.y2 - BOUNDARY.y1) / 100) * H;

      ctx.strokeStyle = isViol
        ? "rgba(239,68,68,0.9)"
        : isMiss
        ? "rgba(251,191,36,0.9)"
        : "rgba(56,189,248,0.6)";
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bx, by, bW, bH);
      ctx.setLineDash([]);

      // Zone label chip
      ctx.fillStyle = isViol ? "rgba(239,68,68,0.85)" : "rgba(56,189,248,0.75)";
      ctx.fillRect(bx, by - 14, 94, 14);
      ctx.fillStyle = "#fff";
      ctx.font      = "bold 8px monospace";
      ctx.textAlign = "left";
      ctx.fillText("DESIGNATED ZONE", bx + 3, by - 3);

      // ── Person bounding box (only when YOLO detects someone) ──────────
      if (yolo.person_detected && yolo.position) {
        const { x1, y1, x2, y2 } = yolo.position.bbox;
        const px1 = (x1 / 100) * W, py1 = (y1 / 100) * H;
        const px2 = (x2 / 100) * W, py2 = (y2 / 100) * H;
        const pW  = Math.max(px2 - px1, 20);
        const pH  = Math.max(py2 - py1, 20);

        // Fill glow
        ctx.fillStyle = isViol
          ? `rgba(239,68,68,${0.04 + pulse * 0.04})`
          : `rgba(16,185,129,${0.03 + pulse * 0.04})`;
        ctx.fillRect(px1, py1, pW, pH);

        // Box stroke
        ctx.strokeStyle = isViol
          ? `rgba(239,68,68,${0.75 + pulse * 0.25})`
          : `rgba(16,185,129,${0.75 + pulse * 0.25})`;
        ctx.lineWidth = 2 + pulse * 0.5;
        ctx.strokeRect(px1, py1, pW, pH);

        // Corner brackets (YOLO style)
        const cl = Math.min(12, pW / 3, pH / 3);
        ctx.strokeStyle = isViol ? "#ef4444" : "#34d399";
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.moveTo(px1,     py1+cl); ctx.lineTo(px1,     py1); ctx.lineTo(px1+cl, py1);
        ctx.moveTo(px2-cl,  py1);    ctx.lineTo(px2,     py1); ctx.lineTo(px2,    py1+cl);
        ctx.moveTo(px1,     py2-cl); ctx.lineTo(px1,     py2); ctx.lineTo(px1+cl, py2);
        ctx.moveTo(px2-cl,  py2);    ctx.lineTo(px2,     py2); ctx.lineTo(px2,    py2-cl);
        ctx.stroke();

        // Label bar above box
        const label = isViol
          ? `⚠ BOUNDARY VIOLATION · #${yolo.track_id}`
          : `YOLO LOCK · #${yolo.track_id}`;
        const lW = ctx.measureText(label).width + 10;
        ctx.fillStyle = isViol ? "#ef4444" : "#10b981";
        ctx.fillRect(px1, py1 - 15, lW, 15);
        ctx.fillStyle = isViol ? "#fff" : "#022c22";
        ctx.font      = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(label, px1 + 4, py1 - 4);

        // Centre crosshair
        const mcx = (yolo.position.cx / 100) * W;
        const mcy = (yolo.position.cy / 100) * H;
        ctx.strokeStyle = isViol ? "rgba(239,68,68,0.5)" : "rgba(52,211,153,0.5)";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(mcx - 8, mcy); ctx.lineTo(mcx + 8, mcy);
        ctx.moveTo(mcx, mcy - 8); ctx.lineTo(mcx, mcy + 8);
        ctx.stroke();
      }

      // Missing-person amber flash
      if (isMiss && Math.sin(Date.now() / 300) > 0) {
        ctx.fillStyle = "rgba(251,191,36,0.07)";
        ctx.fillRect(0, 0, W, H);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [yolo, hasResult, cameraActive]);

  // ── Derived display values ─────────────────────────────────────────────────
  const isMissing   = hasResult && !yolo.person_detected;
  const isViolation = yolo.alert_type === "BOUNDARY_VIOLATION";

  const borderColor =
    isMissing    ? "border-rose-500/80 border-solid"
    : isViolation ? "border-red-500/80 border-solid"
    : "border-sky-400/40 border-dashed";

  const labelText =
    isMissing    ? "PERSON NOT DETECTED"
    : isViolation ? "BOUNDARY VIOLATION"
    : "SEATING BOUNDARY";

  const labelClass =
    isMissing || isViolation
      ? "bg-red-50/90 border border-rose-500/60 text-red-700"
      : "bg-gray-50 border border-sky-500/30 text-sky-700";

  const dotClass =
    isMissing || isViolation ? "bg-rose-500 animate-ping" : "bg-emerald-400";

  const statusBadge =
    isMissing    ? "NOT SEATED ✗"
    : isViolation ? "OUT OF ZONE ⚠"
    : "SEATED ✓";

  const statusBadgeClass =
    isMissing || isViolation
      ? "bg-rose-500/25 text-red-700 border-rose-500/50 animate-pulse"
      : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";

  // ── Render (unchanged UI design) ───────────────────────────────────────────
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-2 shadow-sm flex flex-col h-full min-h-0 ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-gray-100 text-sky-400 border border-gray-300">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none">MY LIVE CAMERA</h3>
              {cameraActive ? (
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-50/80 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />LIVE
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-gray-100 text-gray-500 border border-gray-300">OFF</span>
              )}
            </div>
            <p className="text-[9px] text-gray-500 leading-none mt-0.5">
              Seat {seatId} · {micId} · Presence &amp; Movement Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!cameraActive ? (
            <button onClick={startCamera}
              className="px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-sky-800/30 text-sky-700 border-sky-700/50 hover:bg-sky-800/50 flex items-center gap-1 transition-colors">
              <Video className="w-3 h-3" /> Start Camera
            </button>
          ) : (
            <button onClick={stopCamera}
              className="px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200 flex items-center gap-1 transition-colors">
              <VideoOff className="w-3 h-3" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Video stage */}
      <div className="relative w-full flex-1 min-h-0 rounded overflow-hidden border border-gray-200 bg-white flex items-center justify-center"
        style={{ minHeight: "120px" }}>
        <div className="relative h-full overflow-hidden rounded bg-white border border-gray-200"
          style={{ aspectRatio: "1 / 1", minHeight: "120px" }}>

          {/* Live video feed */}
          <video ref={videoRef} playsInline muted
            className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "opacity-90" : "hidden"}`} />

          {/* Hidden encode canvas */}
          <canvas ref={captureRef} width={ENCODE_W} height={ENCODE_H} className="hidden" />

          {/* YOLO overlay canvas */}
          <canvas ref={overlayRef} width={640} height={640}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

          {/* Seating boundary guide box */}
          {cameraActive && (
            <div className={`absolute inset-x-[10%] top-[6%] bottom-[20%] pointer-events-none rounded-lg border transition-colors duration-300 ${borderColor}`}>
              <div className={`absolute top-1 left-1.5 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold tracking-wider flex items-center gap-1 shadow-sm ${labelClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                {labelText}
              </div>
              {/* Corner brackets */}
              <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 ${isMissing || isViolation ? "border-rose-500" : "border-sky-400"}`} />
              <div className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 ${isMissing || isViolation ? "border-rose-500" : "border-sky-400"}`} />
              <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 ${isMissing || isViolation ? "border-rose-500" : "border-sky-400"}`} />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 ${isMissing || isViolation ? "border-rose-500" : "border-sky-400"}`} />
            </div>
          )}

          {/* NOT DETECTED banner */}
          {cameraActive && isMissing && (
            <div className="absolute top-2 left-2 right-2 p-1.5 rounded-lg bg-red-50/95 border border-rose-500/80 text-red-800 text-[10px] font-semibold flex items-center justify-between gap-1.5 shadow-lg backdrop-blur-sm z-20 animate-pulse">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-ping" />
                <span className="truncate">⚠ PERSON NOT DETECTED — Audio alert active</span>
              </span>
              <span className="font-mono text-[8px] bg-rose-900/80 text-red-700 px-1 py-0.2 rounded border border-rose-500/40 font-bold uppercase flex-shrink-0">NOT SEATED</span>
            </div>
          )}

          {/* BOUNDARY VIOLATION banner */}
          {cameraActive && isViolation && (
            <div className="absolute top-2 left-2 right-2 p-1.5 rounded-lg bg-red-50/95 border border-red-500/80 text-red-800 text-[10px] font-semibold flex items-center justify-between gap-1.5 shadow-lg z-20 animate-pulse">
              <span className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="truncate">⚠ BOUNDARY VIOLATION — Audio alert active</span>
              </span>
              <span className="font-mono text-[8px] bg-red-900/80 text-red-200 px-1 py-0.2 rounded border border-red-500/40 font-bold flex-shrink-0">OUT OF ZONE</span>
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center bg-white">
              <VideoOff className="w-8 h-8 text-rose-500/60" />
              <p className="text-[10px] text-rose-400 font-semibold leading-snug">{cameraError}</p>
              <button onClick={startCamera}
                className="px-3 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-[10px] font-bold mt-1">
                Retry
              </button>
            </div>
          )}

          {/* Camera off placeholder */}
          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white">
              <User className="w-10 h-10 text-slate-700" />
              <p className="text-[10px] text-gray-400">Camera inactive</p>
            </div>
          )}

          {/* Identity bottom bar */}
          {cameraActive && (
            <div className="absolute bottom-2 left-2 right-2 p-1.5 bg-gray-50 border border-sky-500/30 rounded-lg backdrop-blur-md flex items-center justify-between gap-2 shadow-lg z-10">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isMissing || isViolation ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 text-[10px] truncate block">{memberName}</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                    <span className="text-amber-400">{seatId}</span>
                    <span>·</span>
                    <span className="text-sky-400">{micId}</span>
                    {hasResult && yolo.position && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-500">
                          #{yolo.track_id} {yolo.position.cx.toFixed(0)}%,{yolo.position.cy.toFixed(0)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusBadgeClass}`}>
                  {statusBadge}
                </span>
                <span className="text-[8px] text-gray-400 font-mono mt-0.5">
                  {!hasResult
                    ? "Initialising…"
                    : yolo.status === "ACTIVE_YOLO"
                    ? `YOLO ${(yolo.confidence * 100).toFixed(0)}%`
                    : yolo.status === "ML_UNAVAILABLE" || !yolo.status
                    ? "Vision active"
                    : `Vision ${(yolo.confidence * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
