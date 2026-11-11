import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Cpu,
  Mic,
  Eye,
  Scale,
  Database,
  Sparkles,
  FastForward,
  CheckCircle2,
  Lock
} from "lucide-react";

interface LoginIntroAnimationProps {
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Cinematic intro animation that runs through 4 system-check phases,
 * then fades out and hands control to the login page.
 *
 * Phase 1 (0–2.5s):  Encrypted Handshake
 * Phase 2 (2.5–5.5s): Sensor Subsystem Init
 * Phase 3 (5.5–8s):   Audio & Vision Calibration
 * Phase 4 (8–9.5s):   System Ready
 * Fade-out (9.5–10.5s): opacity → 0, then onComplete
 */
const PHASE_END = [2500, 5500, 8000, 9500] as const;
const FADE_DURATION = 1000;
const TOTAL_DURATION = PHASE_END[3] + FADE_DURATION; // 10500ms

export function LoginIntroAnimation({
  onComplete,
  onSkip
}: LoginIntroAnimationProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [fadingOut, setFadingOut] = useState(false);

  // Refs to avoid stale closures in the timer effect
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  // Main animation timer — depends only on mount
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now() - startTime;
      if (now >= TOTAL_DURATION) {
        setElapsed(TOTAL_DURATION);
        clearInterval(interval);
        onCompleteRef.current();
      } else {
        setElapsed(now);
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearInterval(interval);
        if (onSkipRef.current) onSkipRef.current();
        else onCompleteRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Phase & fade-out tracking
  useEffect(() => {
    const newPhase =
      elapsed < PHASE_END[0]
        ? 1
        : elapsed < PHASE_END[1]
          ? 2
          : elapsed < PHASE_END[2]
            ? 3
            : 4;
    if (newPhase !== currentPhase) setCurrentPhase(newPhase);

    if (elapsed >= PHASE_END[3] && !fadingOut) setFadingOut(true);
  }, [elapsed, currentPhase, fadingOut]);

  const progress = Math.min(100, (elapsed / PHASE_END[3]) * 100);

  // Phase completion checkmarks for footer
  const phaseLabels = [
    "Secure Handshake",
    "Sensor Subsystems",
    "Audio & Vision",
    "Authorization"
  ];

  const handleSkip = () => {
    if (onSkipRef.current) onSkipRef.current();
    else onCompleteRef.current();
  };

  return (
    <div
      id="login-intro-animation-overlay"
      className="fixed inset-0 z-50 bg-white text-gray-900 flex flex-col justify-between overflow-hidden select-none font-sans"
      style={{
        opacity: fadingOut
          ? Math.max(0, 1 - (elapsed - PHASE_END[3]) / FADE_DURATION)
          : 1,
        transition: "opacity 0.15s linear"
      }}
    >
      {/* Inline keyframes for animations not in default Tailwind */}
      <style>{`
        @keyframes intro-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes intro-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .intro-fade-in { animation: intro-fade-in 0.5s ease-out both; }
        .intro-spin     { animation: intro-spin 14s linear infinite; }
        /* Override global footer height forced by index.css */
        #login-intro-animation-overlay footer {
          height: auto !important;
          padding: 16px 24px !important;
        }
      `}</style>

      {/* Dynamic Cyber Grid & Radial Scan Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/10 via-emerald-500/10 to-sky-500/10 rounded-full blur-3xl opacity-70 animate-pulse" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(to right, #f59e0b 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }}
        />
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-40 blur-[1px]"
          style={{
            top: String((progress * 1.5) % 100) + "%",
            transition: "top 0.1s linear"
          }}
        />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-amber-700/90 bg-amber-50/60 border border-amber-500/30 px-3 py-1 rounded-full">
            PARLIAMENTARY SECURE PROTOCOL • LEVEL 4
          </span>
        </div>

        {/* Skip Intro Button */}
        <button
          id="intro-skip-btn"
          type="button"
          onClick={handleSkip}
          className="group px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-600/20 text-gray-700 hover:text-amber-700 border border-gray-200 hover:border-amber-500/40 text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          <kbd className="hidden md:inline-block text-[9px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">
            ESC
          </kbd>
        </button>
      </header>

      {/* Center Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 text-center max-w-4xl mx-auto w-full">
        {/* Logo */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-sky-500/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -inset-2.5 rounded-full border border-dashed border-amber-400/40 pointer-events-none intro-spin" />
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white border-2 border-amber-400/60 shadow-2xl p-2.5 flex items-center justify-center backdrop-blur-md">
            <img
              src="/Parlisense.png"
              alt="ParliSense Official Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(245,158,11,0.5)]"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-mono text-amber-400 font-semibold shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>SANSAD BHAVAN • LOK SABHA CHAMBER SYSTEM</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-serif">
            Parli<span className="text-amber-400">Sense</span> AI
          </h1>
          <p className="text-xs sm:text-sm text-gray-700 max-w-lg mx-auto font-medium leading-relaxed">
            AI-Powered Parliamentary Decorum, Audio Intelligence & Legislative
            Decision-Support System
          </p>
        </div>

        {/* Phase-Dependent Content */}
        <div className="w-full max-w-2xl min-h-[140px] flex items-center justify-center">
          {currentPhase === 1 && (
            <div key="phase-1" className="w-full space-y-3 intro-fade-in">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-50/40 border border-emerald-500/30 py-2 px-4 rounded-xl max-w-md mx-auto">
                <Lock className="w-3.5 h-3.5" />
                <span>ESTABLISHING ENCRYPTED CHAMBER HANDSHAKE...</span>
              </div>
              <p className="text-xs text-gray-500 font-mono">
                Authenticating Workstation Node • Verifying Chamber Protocol 2026
              </p>
            </div>
          )}

          {currentPhase === 2 && (
            <div
              key="phase-2"
              className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left intro-fade-in"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-md">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Acoustics</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">543 Floor Mics</div>
                <div className="text-[9px] text-emerald-400 font-mono font-bold mt-1">✓ Whisper STT Online</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-md">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Vision AI</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Spatial Cam Mesh</div>
                <div className="text-[9px] text-emerald-400 font-mono font-bold mt-1">✓ YOLOv8 Active</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-md">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Rule Guard</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">Rules 373 & 374</div>
                <div className="text-[9px] text-emerald-400 font-mono font-bold mt-1">✓ Decorum Armed</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-md">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                  <Database className="w-3.5 h-3.5" />
                  <span>State Core</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">SQLite WAL + WS</div>
                <div className="text-[9px] text-emerald-400 font-mono font-bold mt-1">✓ 30 FPS Stream</div>
              </div>
            </div>
          )}

          {currentPhase === 3 && (
            <div key="phase-3" className="w-full space-y-3 intro-fade-in">
              <div className="flex items-center justify-center gap-1.5 h-10">
                {[45, 80, 60, 95, 30, 75, 90, 50, 85, 40, 70, 100, 65, 85, 55, 90, 45, 60].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-amber-500 to-emerald-400 rounded-full transition-all duration-150"
                      style={{
                        height:
                          String(
                            Math.max(15, h * (0.6 + Math.sin(elapsed / 200 + i) * 0.4))
                          ) + "%"
                      }}
                    />
                  )
                )}
              </div>
              <div className="text-xs font-mono font-bold text-amber-400">
                CALIBRATING AMBIENT CHAMBER NOISE & VOCAL SPECTRUM
              </div>
              <p className="text-[11px] text-gray-500 italic">
                &ldquo;Ensuring dignity, parliamentary fairness, and democratic
                decorum through intelligent telemetry&rdquo;
              </p>
            </div>
          )}

          {currentPhase === 4 && (
            <div key="phase-4" className="w-full space-y-3 intro-fade-in">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-50/60 border border-emerald-500/50 py-2 px-5 rounded-2xl shadow-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span className="font-bold tracking-wide">
                  ALL SYSTEMS ONLINE • ENTERING CHAMBER TERMINAL
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar: Phase Checklist + Progress */}
      <footer className="relative z-10 bg-gray-50 border-t border-gray-200/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Phase checklist row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-[11px] font-mono">
            {phaseLabels.map((label, i) => {
              const phaseNum = i + 1;
              const done = currentPhase > phaseNum;
              const active = currentPhase === phaseNum;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 transition-colors ${
                    done
                      ? "text-emerald-400"
                      : active
                        ? "text-amber-400"
                        : "text-gray-600"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : active ? (
                    <Cpu className="w-3 h-3 animate-pulse" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />
                  )}
                  <span className={active ? "font-bold" : ""}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white rounded-full overflow-hidden p-0.5 border border-gray-200">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: String(progress) + "%" }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1">
            <span>ParliSense Sansad Digital Grid</span>
            <span className="hidden sm:inline">
              Press ESC anytime to skip directly to login
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
