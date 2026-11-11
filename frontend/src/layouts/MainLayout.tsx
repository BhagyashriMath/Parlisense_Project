import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useParliament } from "../infrastructure/context/ParliamentContext";
import { Header } from "../shared/components/Header";
import { ScorecardModal, SessionReportModal } from "../features/scorecard";
import { getAudioContext, unlockChamberAudio } from "../shared/utils/chamberAudio";
import { unlockVoiceAudio } from "../shared/utils/chamberVoice";
import { Volume2 } from "lucide-react";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  useEffect(() => {
    const checkAudioState = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        setAudioNeedsUnlock(true);
      } else {
        setAudioNeedsUnlock(false);
      }
    };

    checkAudioState();
    const interval = setInterval(checkAudioState, 2000);

    const onUserInteraction = () => {
      unlockChamberAudio();
      unlockVoiceAudio();
      setTimeout(checkAudioState, 150);
    };

    window.addEventListener("click", onUserInteraction, { passive: true });
    window.addEventListener("keydown", onUserInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, []);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative"
      style={{ background: "#f1f4f8", color: "#1a1f2e" }}>
      <Header />

      {/* main must NOT scroll — dashboards manage their own internal scroll */}
      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {children || <Outlet />}
      </main>

      {audioNeedsUnlock && (
        <button id="enable-chamber-audio-floating-btn"
          onClick={() => { unlockChamberAudio(true); unlockVoiceAudio(); setAudioNeedsUnlock(false); }}
          className="fixed bottom-10 right-4 z-50 flex items-center gap-2 font-bold px-4 py-2 rounded-full shadow-lg text-xs cursor-pointer text-white"
          style={{ background: "#4f46e5", boxShadow: "0 4px 20px rgba(79,70,229,0.35)" }}>
          <Volume2 className="w-4 h-4" />
          <span>Enable Chamber Audio</span>
        </button>
      )}

      {/* Chamber Modals */}
      <ScorecardModal />
      <SessionReportModal />

      <footer className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 text-xs font-mono"
        style={{ height: "30px", background: "#ffffff", borderTop: "1px solid #e2e5eb", color: "#bcc2ce" }}>
        <span className="truncate mr-2">ParliSense AI · YOLO · Whisper · Decorum Engine</span>
        <span className="hidden md:inline flex-shrink-0">Telemetry Active · Low Latency</span>
      </footer>
    </div>
  );
}

export default MainLayout;
