/**
 * LiveTranscript — Member Dashboard
 * Same style as SpeakerTranscriptFeed:
 *   offensive words → red, all other text → black, nothing else shown.
 */
import React, { useRef, useEffect } from "react";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { Mic, Radio } from "lucide-react";

interface LiveTranscriptProps {
  textOnly?: boolean;
}

const OFFENSIVE: string[] = [
  "idiot", "idiotic", "stupid", "moron", "bastard", "corrupt thief", "thief",
  "scoundrel", "liar", "lies", "lie", "shut up", "clown", "traitor",
  "bloody fool", "shameful", "corrupt", "corruption", "cheat", "scam",
  "fraud", "disgrace", "rubbish", "bribe", "criminal", "fool", "nonsense",
  "disgraceful", "outrageous", "unacceptable", "shame", "protest",
  "incompetent", "hypocrite"
];

function makeRegex(extra: string[] = []) {
  const all = Array.from(new Set([...OFFENSIVE, ...extra.map(w => w.toLowerCase().trim())]))
    .filter(Boolean).sort((a, b) => b.length - a.length);
  return new RegExp(`(${all.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
}

function renderText(text: string, regex: RegExp) {
  const parts = text.split(regex);
  return parts.map((part, i) => {
    regex.lastIndex = 0;
    const isMatch = regex.test(part);
    regex.lastIndex = 0;
    return isMatch
      ? <span key={i} style={{ color: "#dc2626", fontWeight: 700 }}>{part}</span>
      : <span key={i} style={{ color: "#111827" }}>{part}</span>;
  });
}

export function LiveTranscript({ textOnly = false }: LiveTranscriptProps) {
  const { telemetry, interimTranscript, isMicActive } = useParliament();
  const flaggedWords = telemetry?.ai_output?.flagged_words || [];
  const transcripts  = telemetry?.recent_transcripts || [];
  const scrollRef    = useRef<HTMLDivElement>(null);

  const sentences = transcripts.flatMap((t) =>
    t.text.split(/(?<=[.?!])\s+/).filter(s => s.trim()).map((s, i) => ({
      id: `${t.id}-${i}`, text: s.trim(),
      relevance: t.relevance,
      emotion: (t as any).emotion,
      time: t.time || ""
    }))
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sentences.length, interimTranscript]);

  const sttSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#ffffff", borderRadius: 14,
      border: "1px solid #e2e5eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid #e2e5eb",
        background: "#f8f9fb", flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "#eef2ff",
            border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Mic style={{ width: 15, height: 15, color: "#4f46e5" }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Live Speech-to-Text
            </p>
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>Floor transcription</p>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
          borderRadius: 999, fontSize: 10, fontWeight: 700,
          background: isMicActive ? "#f0fdf4" : "#f4f6f9",
          border: `1px solid ${isMicActive ? "#6ee7b7" : "#e2e5eb"}`,
          color: isMicActive ? "#059669" : "#9ca3af"
        }}>
          <Radio style={{ width: 11, height: 11 }} />
          {isMicActive ? "LIVE" : !sttSupported ? "UNSUPPORTED" : "MIC OFF"}
        </div>
      </div>

      {/* Text stream */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 14px" }}>
        {sentences.length === 0 && !interimTranscript ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
            <Mic style={{ width: 28, height: 28, color: "#d1d5db" }} />
            <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>Awaiting floor speech…</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sentences.map((s, idx) => {
              const regex = makeRegex(flaggedWords);
              const isLatest = idx === sentences.length - 1;
              const rel = typeof s.relevance === "number" ? s.relevance : null;
              const relPct = rel !== null ? Math.round(rel * 100) : null;
              const isIrrelevant = rel !== null && rel < 0.35;
              const isPartial    = rel !== null && rel >= 0.35 && rel < 0.55;
              const isOffTopic   = isIrrelevant; // kept for compat
              const isOffensive  = regex.test(s.text);
              regex.lastIndex = 0;
              return (
                <div key={s.id} style={{ marginBottom: isLatest ? 0 : 10, paddingBottom: isLatest ? 0 : 10, borderBottom: isLatest ? "none" : "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.75, margin: 0 }}>
                    {renderText(s.text, regex)}
                    {isLatest && (
                      <span style={{
                        display: "inline-block", width: 2, height: 14,
                        background: "#4f46e5", marginLeft: 3,
                        verticalAlign: "middle", borderRadius: 1,
                        animation: "pulse 1s infinite"
                      }} />
                    )}
                  </p>
                  {/* NLP inline tag — only shown when flagged */}
                  {(isIrrelevant || isPartial || isOffensive) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                      {isIrrelevant && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                          padding: "2px 8px", borderRadius: 999,
                          background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5"
                        }}>⛔ IRRELEVANT · {relPct}%</span>
                      )}
                      {isPartial && !isIrrelevant && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                          padding: "2px 8px", borderRadius: 999,
                          background: "#fffbeb", color: "#92400e", border: "1px solid #fcd34d"
                        }}>⚠ PARTIALLY RELEVANT · {relPct}%</span>
                      )}
                      {isOffensive && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                          padding: "2px 8px", borderRadius: 999,
                          background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5"
                        }}>⛔ UNPARLIAMENTARY</span>
                      )}
                      {s.emotion && (
                        <span style={{
                          fontSize: 10, fontFamily: "monospace", color: "#6b7280",
                          padding: "2px 6px", borderRadius: 999,
                          background: "#f9fafb", border: "1px solid #e5e7eb"
                        }}>{s.emotion}</span>
                      )}
                      {relPct !== null && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{
                            display: "inline-block", width: 60, height: 4,
                            borderRadius: 999, background: "#f3f4f6", overflow: "hidden"
                          }}>
                            <span style={{
                              display: "block", height: "100%", borderRadius: 999,
                              width: `${relPct}%`,
                              background: isIrrelevant ? "#dc2626" : isPartial ? "#d97706" : "#059669"
                            }} />
                          </span>
                          <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>{relPct}%</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {interimTranscript && (
              <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.75, color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                {interimTranscript}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "6px 14px", borderTop: "1px solid #e2e5eb", background: "#f8f9fb",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 10, color: "#9ca3af", fontFamily: "monospace"
      }}>
        <span>{sentences.length} sentence{sentences.length !== 1 ? "s" : ""} transcribed</span>
        {isMicActive && <span style={{ color: "#059669", fontWeight: 700 }}>● Recognition active</span>}
      </div>
    </div>
  );
}
