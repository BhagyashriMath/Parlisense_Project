import React, { useRef, useEffect, useState } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Mic, Search, Radio, Volume2, ArrowDown } from "lucide-react";

interface LiveSpeechToTextFeedProps {
  className?: string;
  maxHeight?: string;
}

export function LiveSpeechToTextFeed({ className = "", maxHeight }: LiveSpeechToTextFeedProps) {
  const { telemetry, interimTranscript } = useParliament();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  // Extract transcripts
  const transcripts = telemetry?.recent_transcripts || [];

  // Convert transcripts into chronological sentence units
  const sentences = transcripts.flatMap((t) => {
    // Split on sentence terminators while retaining punctuation
    const rawSentences = t.text
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 0);

    return rawSentences.map((sentence, idx) => ({
      id: `${t.id}-s${idx}`,
      time: t.time,
      text: sentence.trim()
    }));
  });

  const filteredSentences = sentences.filter((s) =>
    s.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (autoScroll && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sentences, autoScroll]);

  return (
    <div
      id="live-speech-to-text-section"
      className={`bg-gray-50 rounded-lg border border-gray-200 flex flex-col h-full min-h-0 overflow-hidden ${className}`}
      style={{ maxHeight }}
    >
      {/* Header with Search and Engine Status (No Speaker Identifiers) */}
      <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <Mic className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider truncate">
                Live Speech-to-Text
              </h3>
              <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-50 text-emerald-700 border border-emerald-500/40 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Live STT Feed
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              Chronological, sentence-by-sentence transcription of detected chamber speech
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter transcribed text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-200 rounded pl-6 pr-2 py-0.5 text-[11px] text-gray-800 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-32 sm:w-44"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-1.5 py-1 rounded text-[10px] font-mono border transition-colors flex items-center gap-1 ${
              autoScroll
                ? "bg-gray-100 text-amber-400 border-amber-500/30"
                : "bg-white text-gray-400 border-gray-200 hover:text-gray-700"
            }`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll paused"}
          >
            <ArrowDown className={`w-3 h-3 ${autoScroll ? "animate-bounce" : ""}`} />
            <span className="hidden md:inline">Auto</span>
          </button>
        </div>
      </div>

      {/* Sentence-by-Sentence Chronological Transcript Display */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 text-xs">
        {filteredSentences.length === 0 && !interimTranscript ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <Volume2 className="w-6 h-6 mb-2 text-gray-300 animate-pulse" />
            <span className="text-xs font-semibold">Listening for floor speech...</span>
            <span className="text-[10px] text-gray-300 mt-0.5">
              Transcribed sentences will appear chronologically in real-time.
            </span>
          </div>
        ) : (
          filteredSentences.map((item, idx) => {
            const isLatest = idx === filteredSentences.length - 1;
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isLatest
                    ? "bg-amber-50/20 border-amber-500/40 shadow-sm"
                    : "bg-white border-gray-200/80 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 mt-0.5 flex-shrink-0">
                    <span className="px-1.5 py-0.2 rounded bg-white text-gray-500 border border-gray-200">
                      {item.time}
                    </span>
                    <span className="text-[9px] text-gray-300 font-bold">#{idx + 1}</span>
                  </div>

                  <p className="flex-1 text-gray-800 text-xs sm:text-sm font-sans leading-relaxed tracking-normal">
                    {item.text}
                    {isLatest && (
                      <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1 animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {interimTranscript && (
          <div className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-50/20 text-sky-200 text-xs italic">
            {interimTranscript}<span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-1 animate-pulse align-middle" />
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-white border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500 font-mono flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Continuous Speech Recognition Ingest</span>
        </span>
        <span>
          {sentences.length} {sentences.length === 1 ? "sentence" : "sentences"} logged
        </span>
      </div>
    </div>
  );
}
