/**
 * PhysicalMovementMonitor
 * ========================
 * Real-time single-person physical movement detection using YOLO.
 *
 * What it does:
 *  - Opens the member's webcam
 *  - Captures frames at ~5 FPS, encodes them as base64 JPEG
 *  - Posts each frame to POST /api/ai/vision-frame (Node backend → Python ML)
 *  - Receives YOLO tracking result: bounding box, track ID, position (cx, cy),
 *    inside_boundary flag, alert_type
 *  - Draws the bounding box + corner brackets + boundary box on a canvas overlay
 *    (similar to the existing CameraStreamView YOLO style)
 *  - Plays a one-shot audio alert when boundary is crossed or person disappears
 *    (does NOT repeat continuously for the same event)
 *  - Shows tracking ID, position coordinates, and alert status on the UI
 *
 * Alert behaviour:
 *  - BOUNDARY_VIOLATION  → throttled audio alert (once per 20 s)
 *  - PERSON_MISSING      → audio alert fires exactly once per missing episode
 *  - Silence resumes when person returns inside boundary
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  Camera,
  Video,
  VideoOff,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  MapPin,
} from "lucide-react";
import { sendVisionFrame } from "../../../infrastructure/api/api";

// ── Tuning constants ──────────────────────────────────────────────────────────
const FRAME_INTERVAL_MS   = 200;   // capture a frame every 200 ms (~5 FPS)
const ALERT_COOLDOWN_MS   = 20_000; // min gap between boundary-violation audio alerts
const ENCODE_QUALITY      = 0.65;  // JPEG quality for frame transmission (lower = faster)
const CAPTURE_WIDTH       = 320;   // downscale before sending (saves bandwidth)
const CAPTURE_HEIGHT      = 180;

// Boundary region (normalised 0-100 space) sent to the ML service
const BOUNDARY = { x1: 10, y1: 5, x2: 90, y2: 95 };

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrackResult {
  person_detected: boolean;
  track_id: number;
  position: { cx: number; cy: number; bbox: { x1: number; y1: number; x2: number; y2: number } } | null;
  confidence: number;
  inside_boundary: boolean;
  alert_type: "NONE" | "BOUNDARY_VIOLATION" | "PERSON_MISSING" | "PERSON_STILL_MISSING";
  alert_message: string;
  is_new_alert: boolean;
  timestamp_ms: number;
}

interface Props {
  memberId: string;
  seatId: string;
  memberName: string;
  className?: string;
}

// ── Audio helper ──────────────────────────────────────────────────────────────
function speakBoundaryAlert(message: string) {
  if (!message || typeof window === "undefined") return;
  try {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PhysicalMovementMonitor({
  memberId,
  seatId,
  memberName,
  className = "",
}: Props) {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const captureRef  = useRef<HTMLCanvasElement | null>(null); // off-screen capture canvas
  const streamRef   = useRef<MediaStream | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertAt = useRef<number>(0);           // last boundary-violation alert timestamp
  const missingAlertsRef = useRef<boolean>(false); // true while person missing + alert fired

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [trackResult,  setTrackResult]  = useState<TrackResult | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsLoading(true);
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
      const msg =
        err?.name === "NotAllowedError"
          ? "Camera permission denied."
          : err?.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera unavailable: ${err?.message || "unknown"}`;
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setTrackResult(null);
  }, []);

  // ── Frame capture + API call ──────────────────────────────────────────────

  const captureAndAnalyse = useCallback(async () => {
    const video   = videoRef.current;
    const capture = captureRef.current;
    if (!video || !capture || video.readyState < 2) return;

    // Draw frame into the small off-screen canvas
    const ctx = capture.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const b64 = capture.toDataURL("image/jpeg", ENCODE_QUALITY);

    try {
      const result = await sendVisionFrame({
        frame_b64:   b64,
        member_id:   memberId,
        seat_id:     seatId,
        boundary_x1: BOUNDARY.x1,
        boundary_y1: BOUNDARY.y1,
        boundary_x2: BOUNDARY.x2,
        boundary_y2: BOUNDARY.y2,
      });

      setTrackResult(result);

      // ── Audio alert logic ─────────────────────────────────────────────────
      const now = Date.now();

      if (result.alert_type === "PERSON_MISSING") {
        // Fire audio exactly once per missing episode
        if (!missingAlertsRef.current) {
          missingAlertsRef.current = true;
          speakBoundaryAlert(
            result.alert_message ||
            "Warning: You are not visible in the camera frame. Please return to your seat and face the camera."
          );
        }
      } else if (result.person_detected) {
        // Person is visible → reset missing tracker so next disappearance fires fresh
        missingAlertsRef.current = false;

        if (result.alert_type === "BOUNDARY_VIOLATION") {
          // Throttle boundary alert to once every ALERT_COOLDOWN_MS
          if (now - lastAlertAt.current >= ALERT_COOLDOWN_MS) {
            lastAlertAt.current = now;
            speakBoundaryAlert(
              result.alert_message ||
              "Warning: You have moved outside the designated boundary area. Please return immediately."
            );
          }
        }
      }
    } catch (_) {
      // Silently absorb — network hiccup should not crash the UI
    }
  }, [memberId, seatId]);

  // Start/stop interval when camera state changes
  useEffect(() => {
    if (cameraActive) {
      timerRef.current = setInterval(captureAndAnalyse, FRAME_INTERVAL_MS);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cameraActive, captureAndAnalyse]);

  // Auto-start on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── YOLO canvas overlay ───────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cameraActive) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const drawOverlay = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const W = canvas.width;
      const H = canvas.height;

      // ── Boundary box ──────────────────────────────────────────────────────
      const bx1 = (BOUNDARY.x1 / 100) * W;
      const by1 = (BOUNDARY.y1 / 100) * H;
      const bx2 = (BOUNDARY.x2 / 100) * W;
      const by2 = (BOUNDARY.y2 / 100) * H;
      const bW  = bx2 - bx1;
      const bH  = by2 - by1;

      const isViolation = trackResult?.alert_type === "BOUNDARY_VIOLATION";
      const isMissing   = !trackResult?.person_detected && trackResult !== null;

      // Boundary rectangle
      ctx.strokeStyle = isViolation
        ? "rgba(239,68,68,0.9)"       // red
        : isMissing
        ? "rgba(251,191,36,0.9)"      // amber
        : "rgba(56,189,248,0.6)";     // sky blue
      ctx.lineWidth   = isViolation ? 2.5 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bx1, by1, bW, bH);
      ctx.setLineDash([]);

      // Boundary label
      ctx.fillStyle = isViolation
        ? "rgba(239,68,68,0.85)"
        : "rgba(56,189,248,0.75)";
      ctx.fillRect(bx1, by1 - 14, 100, 14);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("DESIGNATED ZONE", bx1 + 4, by1 - 3);

      // ── YOLO person bounding box ──────────────────────────────────────────
      if (trackResult?.person_detected && trackResult.position) {
        const p = trackResult.position;

        // Convert normalised 0-100 → canvas pixels
        const px1 = (p.bbox.x1 / 100) * W;
        const py1 = (p.bbox.y1 / 100) * H;
        const px2 = (p.bbox.x2 / 100) * W;
        const py2 = (p.bbox.y2 / 100) * H;
        const pW  = px2 - px1;
        const pH  = py2 - py1;

        const now    = Date.now();
        const pulse  = 0.5 + 0.5 * Math.sin(now / 350);
        const boxCol = isViolation
          ? `rgba(239,68,68,${0.75 + pulse * 0.25})`
          : `rgba(16,185,129,${0.75 + pulse * 0.25})`;

        // Fill glow
        ctx.fillStyle = isViolation
          ? `rgba(239,68,68,${0.05 + pulse * 0.05})`
          : `rgba(16,185,129,${0.04 + pulse * 0.05})`;
        ctx.fillRect(px1, py1, pW, pH);

        // Stroke
        ctx.strokeStyle = boxCol;
        ctx.lineWidth   = 2 + pulse * 0.6;
        ctx.strokeRect(px1, py1, pW, pH);

        // Corner brackets (YOLO style)
        const cl = 14;
        ctx.strokeStyle = isViolation ? "#ef4444" : "#34d399";
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        // TL
        ctx.moveTo(px1, py1 + cl); ctx.lineTo(px1, py1); ctx.lineTo(px1 + cl, py1);
        // TR
        ctx.moveTo(px2 - cl, py1); ctx.lineTo(px2, py1); ctx.lineTo(px2, py1 + cl);
        // BL
        ctx.moveTo(px1, py2 - cl); ctx.lineTo(px1, py2); ctx.lineTo(px1 + cl, py2);
        // BR
        ctx.moveTo(px2 - cl, py2); ctx.lineTo(px2, py2); ctx.lineTo(px2, py2 - cl);
        ctx.stroke();

        // Label bar above bounding box
        const labelText = isViolation
          ? `⚠ BOUNDARY VIOLATION · ID #${trackResult.track_id}`
          : `YOLOv11 LOCK · ID #${trackResult.track_id}`;
        const labelW = ctx.measureText(labelText).width + 12;
        ctx.fillStyle = isViolation ? "#ef4444" : "#10b981";
        ctx.fillRect(px1, py1 - 16, labelW, 16);
        ctx.fillStyle = isViolation ? "#fff" : "#022c22";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(labelText, px1 + 5, py1 - 4);

        // Centre crosshair
        const cx = (px1 + px2) / 2;
        const cy = (py1 + py2) / 2;
        ctx.strokeStyle = isViolation
          ? "rgba(239,68,68,0.5)"
          : "rgba(52,211,153,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
        ctx.stroke();
      }

      // ── Missing person overlay ────────────────────────────────────────────
      if (isMissing) {
        const now   = Date.now();
        const blink = Math.sin(now / 300) > 0;
        if (blink) {
          ctx.fillStyle = "rgba(251,191,36,0.08)";
          ctx.fillRect(0, 0, W, H);
        }
        ctx.fillStyle = "rgba(251,191,36,0.9)";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚠ PERSON NOT DETECTED", W / 2, H / 2 - 8);
        ctx.fillStyle = "rgba(251,191,36,0.7)";
        ctx.font = "9px monospace";
        ctx.fillText("Audio alert has been triggered", W / 2, H / 2 + 8);
      }

      animId = requestAnimationFrame(drawOverlay);
    };

    drawOverlay();
    return () => cancelAnimationFrame(animId);
  }, [trackResult, cameraActive]);

  // ── Derived display values ────────────────────────────────────────────────

  const alertType  = trackResult?.alert_type ?? "NONE";
  const statusText = !cameraActive
    ? "CAMERA OFF"
    : !trackResult
    ? "INITIALISING…"
    : !trackResult.person_detected
    ? "NOT DETECTED ⚠"
    : alertType === "BOUNDARY_VIOLATION"
    ? "BOUNDARY VIOLATION ⚠"
    : "TRACKING ✓";

  const statusColor =
    !cameraActive || !trackResult
      ? "text-gray-400"
      : !trackResult.person_detected
      ? "text-amber-500"
      : alertType === "BOUNDARY_VIOLATION"
      ? "text-red-500"
      : "text-emerald-400";

  const borderColor =
    !cameraActive || !trackResult
      ? "border-gray-200"
      : !trackResult.person_detected
      ? "border-amber-400"
      : alertType === "BOUNDARY_VIOLATION"
      ? "border-red-500"
      : "border-emerald-400";

  const cx = trackResult?.position?.cx ?? null;
  const cy = trackResult?.position?.cy ?? null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`bg-white rounded-lg border ${borderColor} p-2 shadow-sm flex flex-col h-full min-h-0 transition-colors duration-300 ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-gray-100 text-emerald-500 border border-gray-300">
            <Crosshair className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none truncate">
                Physical Movement Monitor
              </h3>
              {cameraActive && (
                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE YOLO
                </span>
              )}
            </div>
            <p className="text-[9px] text-gray-500 leading-none mt-0.5 truncate">
              {seatId} · {memberId} · Boundary &amp; Presence Enforcement
            </p>
          </div>
        </div>

        {/* Camera toggle */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-emerald-50 text-emerald-700 border-emerald-500/40 hover:bg-emerald-100 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Video className="w-3 h-3" />
              {isLoading ? "Starting…" : "Start"}
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-1.5 py-0.5 text-[9px] font-semibold rounded border bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200 flex items-center gap-1 transition-colors"
            >
              <VideoOff className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Video + Canvas Stage ──────────────────────────────────────────── */}
      <div
        className={`relative w-full flex-1 min-h-0 rounded overflow-hidden border ${borderColor} bg-gray-950 flex items-center justify-center transition-colors duration-300`}
        style={{ minHeight: "160px" }}
      >
        {/* Live video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? "opacity-80" : "hidden"}`}
        />

        {/* YOLO tracking canvas overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Off-screen frame capture canvas (hidden) */}
        <canvas
          ref={captureRef}
          width={CAPTURE_WIDTH}
          height={CAPTURE_HEIGHT}
          className="hidden"
        />

        {/* Violation banner */}
        {cameraActive && alertType === "BOUNDARY_VIOLATION" && (
          <div className="absolute top-2 left-2 right-2 p-1.5 rounded-lg bg-red-50/95 border border-red-500/80 text-red-800 text-[10px] font-semibold flex items-center gap-1.5 shadow-lg z-20 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
            <span className="truncate">⚠ BOUNDARY VIOLATION — Audio alert sent</span>
            <span className="ml-auto font-mono text-[8px] bg-red-900/80 text-red-200 px-1 py-0.5 rounded border border-red-500/40 flex-shrink-0">
              OUT OF ZONE
            </span>
          </div>
        )}

        {/* Missing person banner */}
        {cameraActive && !trackResult?.person_detected && trackResult !== null && (
          <div className="absolute top-2 left-2 right-2 p-1.5 rounded-lg bg-amber-50/95 border border-amber-400/80 text-amber-800 text-[10px] font-semibold flex items-center gap-1.5 shadow-lg z-20 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="truncate">⚠ PERSON NOT VISIBLE — Audio alert sent once</span>
            <span className="ml-auto font-mono text-[8px] bg-amber-900/80 text-amber-200 px-1 py-0.5 rounded border border-amber-500/40 flex-shrink-0">
              MISSING
            </span>
          </div>
        )}

        {/* Camera off / error placeholder */}
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950">
            <Camera className="w-8 h-8 text-gray-600" />
            <p className="text-[10px] text-gray-500 font-mono">
              Click "Start" to begin YOLO tracking
            </p>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 bg-gray-950">
            <VideoOff className="w-7 h-7 text-red-500/60" />
            <p className="text-[10px] text-red-400 text-center leading-snug">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold mt-1"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Tracking Dashboard Strip ──────────────────────────────────────── */}
      {cameraActive && (
        <div className="mt-1.5 grid grid-cols-3 gap-1 flex-shrink-0">
          {/* Track ID */}
          <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
            <div className="text-[8px] text-gray-400 font-mono uppercase tracking-wider mb-0.5">
              Track ID
            </div>
            <div className="text-[13px] font-bold text-sky-600 font-mono leading-none">
              #{trackResult?.track_id ?? "—"}
            </div>
          </div>

          {/* Position */}
          <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
            <div className="text-[8px] text-gray-400 font-mono uppercase tracking-wider mb-0.5 flex items-center justify-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" /> Position
            </div>
            <div className="text-[11px] font-bold text-gray-700 font-mono leading-none">
              {cx !== null && cy !== null
                ? `${cx.toFixed(0)}%, ${cy.toFixed(0)}%`
                : "—"}
            </div>
          </div>

          {/* Alert Status */}
          <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
            <div className="text-[8px] text-gray-400 font-mono uppercase tracking-wider mb-0.5">
              Alert Status
            </div>
            <div className={`text-[9px] font-bold font-mono leading-none ${statusColor}`}>
              {statusText}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom status bar ──────────────────────────────────────────────── */}
      <div className="mt-1 flex items-center justify-between text-[9px] text-gray-400 font-mono flex-shrink-0">
        <div className="flex items-center gap-1">
          {trackResult?.person_detected && alertType === "NONE" && (
            <>
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-500">Inside boundary · compliant</span>
            </>
          )}
          {alertType === "BOUNDARY_VIOLATION" && (
            <>
              <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
              <span className="text-red-500">Outside boundary</span>
            </>
          )}
          {!trackResult?.person_detected && trackResult !== null && (
            <>
              <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
              <span className="text-amber-500">Person not visible</span>
            </>
          )}
          {!cameraActive && <span>Camera inactive</span>}
        </div>
        <span>
          {trackResult
            ? `Conf: ${(trackResult.confidence * 100).toFixed(0)}% · YOLOv11`
            : "YOLOv11 Physical Movement"}
        </span>
      </div>
    </div>
  );
}
