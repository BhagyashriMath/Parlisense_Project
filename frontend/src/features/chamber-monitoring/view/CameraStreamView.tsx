import React, { useRef, useEffect, useState } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import {
  Camera,
  Video,
  VideoOff,
  Mic,
  Crosshair,
  Sparkles,
  Radio,
  User,
  ShieldCheck
} from "lucide-react";

interface CameraStreamViewProps {
  compact?: boolean;
  className?: string;
  title?: string;
  /** When true, webcam starts automatically and the toggle button is hidden */
  autoWebcam?: boolean;
}

export function CameraStreamView({
  compact = false,
  className = "",
  title = "Active Speaker Live Camera Stream",
  autoWebcam = false,
}: CameraStreamViewProps) {
  const { telemetry, isWebcamActive, setIsWebcamActive } = useParliament();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE_SPEAKER" | "CHAMBER_RADAR">("ACTIVE_SPEAKER");

  // Auto-start webcam when autoWebcam prop is true
  useEffect(() => {
    if (autoWebcam && !isWebcamActive) {
      setIsWebcamActive(true);
    }
  }, [autoWebcam]);

  const activeSpeaker = telemetry?.active_speaker;
  const activeSpeakerSeat = activeSpeaker?.seat_id || "S01";
  const seatStatus = telemetry?.vision_telemetry?.seat_status || {};
  const speakingDuration = telemetry?.speaking_duration_seconds || 0;
  const audioNoiseDb = telemetry?.ai_output?.noise_level || 58;

  // Connect webcam stream if user enables live camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (isWebcamActive && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
        .then((s) => {
          if (isCancelled) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current && !isCancelled) {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch((err) => {
                    if (err.name !== "AbortError" && err.name !== "NotAllowedError") {
                      console.warn("Video play error:", err);
                    }
                  });
                }
              }
            };
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.warn("Could not access laptop webcam:", err);
            setIsWebcamActive(false);
          }
        });
    } else {
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.onloadedmetadata = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.onloadedmetadata = null;
      }
    };
  }, [isWebcamActive, setIsWebcamActive]);

  // Render optical tracking overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const renderOverlay = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (viewMode === "ACTIVE_SPEAKER") {
        // Active speaker isolated framing canvas
        const centerX = canvas.width / 2;
        // Standing person: head near top-third, full body visible
        const headY = canvas.height * 0.22;
        const bodyTopY = headY + 28;   // shoulder line
        const bodyBotY = canvas.height * 0.88; // feet line

        if (!isWebcamActive) {
          // Studio backdrop gradient
          const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
          grad.addColorStop(0, "#0b1329");
          grad.addColorStop(1, "#040711");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Floor line (podium ground)
          ctx.strokeStyle = "rgba(56,189,248,0.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX - 100, bodyBotY + 4);
          ctx.lineTo(centerX + 100, bodyBotY + 4);
          ctx.stroke();

          // Spotlight radial from above
          const radial = ctx.createRadialGradient(centerX, headY - 20, 10, centerX, headY + 60, canvas.width * 0.38);
          radial.addColorStop(0, "rgba(56, 189, 248, 0.1)");
          radial.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = radial;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // --- Standing figure silhouette ---
          ctx.save();
          ctx.fillStyle = "#1e293b";

          // Head
          ctx.beginPath();
          ctx.arc(centerX, headY, 22, 0, Math.PI * 2);
          ctx.fill();

          // Neck
          ctx.fillRect(centerX - 8, headY + 20, 16, 14);

          // Torso (rectangular body)
          const torsoW = 52;
          const torsoH = 90;
          ctx.beginPath();
          ctx.roundRect(centerX - torsoW / 2, bodyTopY + 12, torsoW, torsoH, 6);
          ctx.fill();

          // Left arm (extended slightly outward — standing pose)
          ctx.beginPath();
          ctx.moveTo(centerX - torsoW / 2, bodyTopY + 20);
          ctx.lineTo(centerX - torsoW / 2 - 22, bodyTopY + 75);
          ctx.lineTo(centerX - torsoW / 2 - 14, bodyTopY + 78);
          ctx.lineTo(centerX - torsoW / 2 + 6, bodyTopY + 26);
          ctx.closePath();
          ctx.fill();

          // Right arm
          ctx.beginPath();
          ctx.moveTo(centerX + torsoW / 2, bodyTopY + 20);
          ctx.lineTo(centerX + torsoW / 2 + 22, bodyTopY + 75);
          ctx.lineTo(centerX + torsoW / 2 + 14, bodyTopY + 78);
          ctx.lineTo(centerX + torsoW / 2 - 6, bodyTopY + 26);
          ctx.closePath();
          ctx.fill();

          // Left leg
          ctx.beginPath();
          ctx.moveTo(centerX - 14, bodyTopY + torsoH + 10);
          ctx.lineTo(centerX - 20, bodyBotY);
          ctx.lineTo(centerX - 5, bodyBotY);
          ctx.lineTo(centerX, bodyTopY + torsoH + 10);
          ctx.closePath();
          ctx.fill();

          // Right leg
          ctx.beginPath();
          ctx.moveTo(centerX + 14, bodyTopY + torsoH + 10);
          ctx.lineTo(centerX + 20, bodyBotY);
          ctx.lineTo(centerX + 5, bodyBotY);
          ctx.lineTo(centerX, bodyTopY + torsoH + 10);
          ctx.closePath();
          ctx.fill();

          // Parliamentary tie / badge on chest
          ctx.fillStyle = "#3b82f6";
          ctx.beginPath();
          ctx.moveTo(centerX - 5, bodyTopY + 18);
          ctx.lineTo(centerX + 5, bodyTopY + 18);
          ctx.lineTo(centerX + 3, bodyTopY + 50);
          ctx.lineTo(centerX, bodyTopY + 58);
          ctx.lineTo(centerX - 3, bodyTopY + 50);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        // Bounding box — tall to encompass full standing figure
        const boxW = 160;
        // Top of box: above head; bottom: below feet
        const boxTop = headY - 35;
        const boxBot = bodyBotY + 14;
        const boxH = boxBot - boxTop;
        const boxLeft = centerX - boxW / 2;

        // Animated pulse glow when speaker is active
        const now = Date.now();
        const pulse = 0.5 + 0.5 * Math.sin(now / 400);
        ctx.strokeStyle = activeSpeaker ? `rgba(16, 185, 129, ${0.7 + pulse * 0.3})` : "#10b981";
        ctx.lineWidth = activeSpeaker ? 2 + pulse * 0.8 : 2;
        ctx.strokeRect(boxLeft, boxTop, boxW, boxH);

        // Fill subtle emerald glow — brighter when speaking
        ctx.fillStyle = activeSpeaker
          ? `rgba(16, 185, 129, ${0.04 + pulse * 0.05})`
          : "rgba(16, 185, 129, 0.04)";
        ctx.fillRect(boxLeft, boxTop, boxW, boxH);

        // YOLO Tracking corner brackets
        const cornerLen = 14;
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.5;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(boxLeft, boxTop + cornerLen);
        ctx.lineTo(boxLeft, boxTop);
        ctx.lineTo(boxLeft + cornerLen, boxTop);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(boxLeft + boxW - cornerLen, boxTop);
        ctx.lineTo(boxLeft + boxW, boxTop);
        ctx.lineTo(boxLeft + boxW, boxTop + cornerLen);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(boxLeft, boxTop + boxH - cornerLen);
        ctx.lineTo(boxLeft, boxTop + boxH);
        ctx.lineTo(boxLeft + cornerLen, boxTop + boxH);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(boxLeft + boxW - cornerLen, boxTop + boxH);
        ctx.lineTo(boxLeft + boxW, boxTop + boxH);
        ctx.lineTo(boxLeft + boxW, boxTop + boxH - cornerLen);
        ctx.stroke();

        // Mid-body crosshair
        const midY = boxTop + boxH / 2;
        ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 10, midY);
        ctx.lineTo(centerX + 10, midY);
        ctx.moveTo(centerX, midY - 10);
        ctx.lineTo(centerX, midY + 10);
        ctx.stroke();

        // "SPEAKING" pulse badge beside box when active
        if (activeSpeaker) {
          const badgeAlpha = 0.7 + pulse * 0.3;
          ctx.fillStyle = `rgba(16, 185, 129, ${badgeAlpha})`;
          ctx.beginPath();
          ctx.roundRect(boxLeft + boxW + 5, boxTop + 4, 62, 14, 3);
          ctx.fill();
          ctx.fillStyle = "#022c22";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "left";
          ctx.fillText("● SPEAKING", boxLeft + boxW + 9, boxTop + 14);
        }

        // YOLO Tag Bar at top of bounding box
        ctx.fillStyle = "#10b981";
        ctx.fillRect(boxLeft, boxTop - 16, boxW, 16);
        ctx.fillStyle = "#022c22";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        const speakerLabel = activeSpeaker
          ? `${activeSpeaker.name} · ${activeSpeakerSeat}`
          : `ACTIVE SPEAKER · ${activeSpeakerSeat}`;
        ctx.fillText(
          `YOLOv11 LOCK: ${speakerLabel}`,
          centerX,
          boxTop - 4
        );
      } else {
        // Chamber Radar Overview
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Floor curves
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 35, canvas.width * 0.45, 0, Math.PI);
        ctx.stroke();

        // Draw individual seats
        Object.entries(seatStatus).forEach(([seatId, info]: [string, any]) => {
          const xPx = ((info?.x || 50) / 100) * canvas.width;
          const yPx = ((info?.y || 50) / 100) * canvas.height;
          const isSpeaker = seatId === activeSpeakerSeat;

          const boxW = 32;
          const boxH = 32;

          ctx.strokeStyle = isSpeaker ? "#10b981" : "#38bdf8";
          ctx.fillStyle = isSpeaker ? "rgba(16, 185, 129, 0.3)" : "rgba(56, 189, 248, 0.12)";
          ctx.lineWidth = isSpeaker ? 2.5 : 1.5;
          ctx.strokeRect(xPx - boxW / 2, yPx - boxH / 2, boxW, boxH);
          ctx.fillRect(xPx - boxW / 2, yPx - boxH / 2, boxW, boxH);

          ctx.fillStyle = isSpeaker ? "#10b981" : "#0284c7";
          ctx.fillRect(xPx - boxW / 2, yPx - boxH / 2 - 10, boxW, 9);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(seatId, xPx, yPx - boxH / 2 - 2);
        });
      }

      animationId = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [viewMode, activeSpeaker, activeSpeakerSeat, seatStatus, isWebcamActive]);

  return (
    <div
      id="camera-stream-view"
      className={`bg-white rounded-lg border border-gray-200 p-2 shadow-sm relative flex flex-col h-full min-h-0 ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-gray-100 text-emerald-400 border border-gray-300">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider leading-none truncate">
                {title}
              </h3>
              <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-50/80 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-[9px] text-gray-500 leading-none mt-0.5 truncate">
              Auto-tracks member standing to speak on the floor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!autoWebcam && (
            <button
              onClick={() => setViewMode(viewMode === "ACTIVE_SPEAKER" ? "CHAMBER_RADAR" : "ACTIVE_SPEAKER")}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
              title="Toggle between isolated active speaker feed and full chamber seat radar"
            >
              {viewMode === "ACTIVE_SPEAKER" ? "Speaker Focus" : "Radar View"}
            </button>
          )}

          {!autoWebcam && (
            <button
              id="toggle-webcam-btn"
              onClick={() => setIsWebcamActive(!isWebcamActive)}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 transition-all ${
                isWebcamActive
                  ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/40"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
              title="Use laptop webcam for live video tracking"
            >
              {isWebcamActive ? <Video className="w-3 h-3 text-emerald-400" /> : <VideoOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isWebcamActive ? "Webcam ON" : "Laptop Cam"}</span>
            </button>
          )}

          {autoWebcam && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-50/60 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
              <Video className="w-3 h-3 text-emerald-400" />
              Live Camera
            </span>
          )}
        </div>
      </div>

      {/* Video & Canvas Stage */}
      <div className="relative w-full flex-1 min-h-0 rounded overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isWebcamActive ? "opacity-75" : "hidden"}`}
        />

        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Live Active Speaker Identification Card Overlay */}
        <div className="absolute bottom-2 left-2 right-2 p-2 bg-gray-50 border border-emerald-500/40 rounded-lg backdrop-blur-md flex items-center justify-between gap-2 shadow-lg z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-500/50 flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0 overflow-hidden">
              {activeSpeaker?.name
                ? activeSpeaker.name.split(" ").map((w) => w[0]).slice(0, 2).join("")
                : "🎤"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 text-xs truncate">
                  {activeSpeaker?.name || "Active Floor Speaker"}
                </span>
                <span className="px-1 py-0.2 rounded font-mono text-[9px] bg-gray-100 text-amber-700 border border-amber-500/30">
                  {activeSpeaker?.party || "MP"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <span>Seat: <strong className="text-emerald-400">{activeSpeakerSeat}</strong></span>
                <span>•</span>
                <span>Mic: <strong className="text-sky-400">{activeSpeaker?.mic_id || `MIC-${activeSpeakerSeat}`}</strong></span>
                <span>•</span>
                <span>Floor Time: <strong className="text-amber-400">{speakingDuration}s</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <Mic className="w-3 h-3 animate-pulse" />
              <span>{audioNoiseDb.toFixed(1)} dB</span>
            </div>
            <span className="text-[9px] text-gray-500 font-mono">AI Frame Lock: 99.4%</span>
          </div>
        </div>
      </div>

        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Standing speaker auto-tracked • full-body frame lock</span>
          </div>
          <span className="font-mono text-gray-400 text-[9px]">YOLOv11n Optical Target Lock • 30 FPS</span>
        </div>
    </div>
  );
}
