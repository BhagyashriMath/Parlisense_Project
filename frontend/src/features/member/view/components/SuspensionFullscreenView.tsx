/**
 * SuspensionFullscreenView
 *
 * Shown to the member when the Speaker has suspended them.
 * - Full-screen red alert — no camera feed
 * - Audio alert fires once on mount
 * - Clean, high-contrast, completely readable
 */
import React, { useEffect, useRef } from 'react';
import { Member, MemberScorecard } from '../../../../shared/types';
import { playChamberAlertChime, speakAlert } from '../../../../shared/utils/chamberAudio';
import { ShieldAlert, LogOut, AlertTriangle } from 'lucide-react';

interface SuspensionFullscreenViewProps {
  currentMember: Member;
  scorecard: MemberScorecard | null;
  onLogout: () => void;
}

export const SuspensionFullscreenView: React.FC<SuspensionFullscreenViewProps> = ({
  currentMember,
  scorecard,
  onLogout
}) => {
  const audioFired = useRef(false);

  /* Fire audio alert once on mount */
  useEffect(() => {
    if (audioFired.current) return;
    audioFired.current = true;
    playChamberAlertChime("CRITICAL");
    setTimeout(() => {
      speakAlert(
        `${currentMember.name}, you have been suspended from the current parliamentary session by the Honourable Speaker under Rule 374. Please vacate the chamber immediately.`,
        "RULE_9_SUSPENSION",
        true
      );
    }, 600);
  }, [currentMember.name]);

  const violationCount =
    (scorecard?.statistics?.time_violations || 0) +
    (scorecard?.statistics?.seat_violations || 0) +
    (scorecard?.statistics?.interruptions || 0) +
    (scorecard?.statistics?.offensive_incidents || 0) || 3;

  return (
    <div
      id="suspension-fullscreen-mode"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#fff1f2",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24, gap: 0
      }}
    >
      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 520,
        background: "#ffffff",
        border: "2px solid #dc2626",
        borderRadius: 24,
        boxShadow: "0 20px 60px rgba(220,38,38,0.20)",
        overflow: "hidden"
      }}>

        {/* Red header band */}
        <div style={{
          background: "#dc2626",
          padding: "20px 28px",
          display: "flex", alignItems: "center", gap: 14
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "rgba(255,255,255,0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}>
            <ShieldAlert style={{ width: 30, height: 30, color: "#ffffff" }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.80)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
              Parliamentary Suspension
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1 }}>
              You Are Suspended
            </h1>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>

          {/* Member details */}
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 12, padding: "14px 16px", marginBottom: 20
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 13 }}>
              {[
                ["Member", `${currentMember.name}`],
                ["Seat", currentMember.seat_id],
                ["Member ID", currentMember.member_id],
                ["Violations", `${violationCount} (Threshold: 3)`],
                ["Rule Applied", "Rule 374 — Disciplinary Suspension"],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <span style={{ color: "#9ca3af", fontWeight: 600 }}>{label}</span>
                  <span style={{ color: "#111827", fontWeight: 700 }}>{value}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Message */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "#fffbeb", border: "1px solid #fcd34d",
            borderRadius: 12, padding: "12px 16px", marginBottom: 24
          }}>
            <AlertTriangle style={{ width: 18, height: 18, color: "#d97706", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                Action Required
              </p>
              <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
                Your microphone has been deactivated. Parliamentary marshals have been
                notified. Please vacate the chamber immediately and report to the
                Parliamentary Secretariat.
              </p>
            </div>
          </div>

          {/* Acknowledge button */}
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "14px 20px",
              background: "#dc2626", color: "#ffffff",
              border: "none", borderRadius: 14,
              fontSize: 14, fontWeight: 800,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(220,38,38,0.35)",
              letterSpacing: "0.02em"
            }}
          >
            <LogOut style={{ width: 18, height: 18 }} />
            Acknowledge &amp; Leave Terminal
          </button>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        Parliamentary AI Decision-Support System · Enforcement record saved
      </p>
    </div>
  );
};
