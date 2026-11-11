import React, { useRef, useEffect, useState } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Mic, Search, Radio, Volume2 } from "lucide-react";

interface LiveSessionSummaryProps {
  compact?: boolean;
  className?: string;
  defaultExpanded?: boolean;
  initialTab?: "stt" | "ideas" | "suggestions" | "topics";
}

export function LiveSessionSummary({
  compact = false,
  className = "",
  defaultExpanded = true,
  initialTab = "stt"
}: LiveSessionSummaryProps) {
  const { telemetry, interimTranscript, isMicActive } = useParliament();
  const [sttFilter, setSttFilter] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const transcripts = telemetry?.recent_transcripts || [];

  const sentences = transcripts.flatMap((t) =>
    t.text
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 0)
      .map((sentence, idx) => ({
        id: `${t.id}-s${idx}`,
        time: t.time,
        text: sentence.trim()
      }))
  );

  const filteredSentences = sentences.filter((s) =>
    s.text.toLowerCase().includes(sttFilter.toLowerCase())
  );

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sentences.length]);

  return (
    <div
      id="live-session-summary"
      className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-0 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 flex-shrink-0"
        style={{ background: "#f8f9fb" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Live Speech-to-Text
            </h3>
            <p className="text-[10px] text-gray-500">
              Real-time floor transcription
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter text..."
              value={sttFilter}
              onChange={(e) => setSttFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg pl-6 pr-2 py-1 text-[11px] text-gray-800 focus:outline-none focus:border-indigo-400 w-28"
            />
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
            style={isMicActive
              ? { background: "#f0fdf4", border: "1px solid #6ee7b7", color: "#059669" }
              : { background: "#f4f6f9", border: "1px solid #e2e5eb", color: "#9ca3af" }}>
            <Radio className={`w-3 h-3 ${isMicActive ? "animate-pulse" : ""}`} />
            {isMicActive ? "LIVE" : "MIC OFF"}
          </div>
        </div>
      </div>

      {/* Transcript stream — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {filteredSentences.length === 0 && !interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-6">
            <Volume2 className="w-6 h-6 text-gray-300 animate-pulse" />
            <p className="text-sm font-semibold text-gray-400">Awaiting floor speech…</p>
            <p className="text-[11px] text-gray-300">
              Transcribed text will appear here in real time
            </p>
          </div>
        ) : (
          filteredSentences.map((item, idx) => {
            const isLatest = idx === filteredSentences.length - 1;
            return (
              <div key={item.id}
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                  isLatest
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-white border border-gray-200 flex-shrink-0 mt-0.5">
                  {item.time}
                </span>
                <p className={`flex-1 text-sm leading-relaxed font-medium ${
                  isLatest ? "text-indigo-900" : "text-gray-800"
                }`}>
                  {item.text}
                  {isLatest && (
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle rounded-sm" />
                  )}
                </p>
              </div>
            );
          })
        )}

        {/* Interim (partial) recognition */}
        {interimTranscript && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl border border-sky-200 bg-sky-50">
            <span className="text-[10px] font-bold text-sky-700 px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 flex-shrink-0 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              …
            </span>
            <p className="flex-1 text-sm text-sky-700 italic leading-relaxed">
              {interimTranscript}
              <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-1 animate-pulse align-middle rounded-sm" />
            </p>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 flex-shrink-0"
        style={{ background: "#f8f9fb" }}>
        <span className="text-[10px] font-mono text-gray-500">
          {sentences.length} sentence{sentences.length !== 1 ? "s" : ""} transcribed
        </span>
        {isMicActive && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Recognition active
          </span>
        )}
      </div>
    </div>
  );
}
