import React from "react";
import { useLoginViewModel } from "../viewmodel/useLoginViewModel";
import { LoginIntroAnimation } from "./components/LoginIntroAnimation";
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

/* ─── colour tokens (all light) ──────────────────────────── */
const C = {
  bg:        "#f1f4f8",
  card:      "#ffffff",
  subtle:    "#f7f9fc",
  border:    "#d8dde8",
  ink:       "#1f2937",
  body:      "#374151",
  muted:     "#6b7280",
  faint:     "#9ca3af",
  accent:    "#4f46e5",
  accentBg:  "#eef2ff",
  accentBdr: "#c7d2fe",
};

const ROLE_COLOR: Record<string, { bg: string; text: string; border: string; btn: string; shadow: string }> = {
  speaker: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d", btn: "#d97706", shadow: "rgba(217,119,6,0.30)" },
  admin:   { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd", btn: "#2563eb", shadow: "rgba(37,99,235,0.28)" },
  member:  { bg: "#f0fdf4", text: "#065f46", border: "#6ee7b7", btn: "#059669", shadow: "rgba(5,150,105,0.28)" },
};

export function LoginPage() {
  const vm = useLoginViewModel();
  if (vm.showIntro) return <LoginIntroAnimation onComplete={vm.dismissIntro} onSkip={vm.dismissIntro} />;

  const rc = ROLE_COLOR[vm.role];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <header style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: C.subtle, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <img src="/Parlisense.png" alt="ParliSense" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>
              Parli<span style={{ color: C.accent }}>Sense</span> AI
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
              Sansad Bhavan Chamber Network · Secure Terminal
            </div>
          </div>
        </div>
        <button onClick={vm.replayIntro} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8,
          fontSize: 12, fontWeight: 600, color: C.body, cursor: "pointer"
        }}>
          <Sparkles style={{ width: 14, height: 14, color: C.accent }} />
          <span>Replay Intro</span>
        </button>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }} className="animate-fade-in-up">

          {/* Card */}
          <div style={{
            background: C.card, borderRadius: 20,
            border: `1px solid ${C.border}`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            padding: "36px 40px"
          }}>
            {/* Seal */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18, margin: "0 auto 16px",
                background: C.subtle, border: `1.5px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <img src="/Parlisense.png" alt="ParliSense" style={{ width: 50, height: 50, objectFit: "contain" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                Chamber Sign In
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                Select your role and authenticate your workstation
              </div>
            </div>

            {/* Error */}
            {vm.errorMessage && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626"
              }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                {vm.errorMessage}
              </div>
            )}

            {/* Role selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: C.muted, marginBottom: 8 }}>
                Select Role
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
                padding: 6, background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 12
              }}>
                {(["speaker", "admin", "member"] as const).map((r) => {
                  const rrc = ROLE_COLOR[r];
                  const active = vm.role === r;
                  return (
                    <button key={r} onClick={() => vm.handleRoleChange(r)} style={{
                      padding: "10px 4px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                      background: active ? rrc.btn : "transparent",
                      color: active ? "#ffffff" : C.muted,
                      boxShadow: active ? `0 2px 10px ${rrc.shadow}` : "none",
                      transition: "all 0.15s"
                    }}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role context pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
              padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: rc.btn, flexShrink: 0 }} />
              {vm.role === "speaker" ? "Presiding Officer Console"
                : vm.role === "admin" ? "Administration Station"
                : "Member of Parliament Terminal"}
            </div>

            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: C.muted, marginBottom: 6 }}>
                Username / ID
              </label>
              <div style={{ position: "relative" }}>
                <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: C.faint }} />
                <input
                  id="login-username-input"
                  type="text"
                  value={vm.usernameOrId}
                  onChange={e => vm.setUsernameOrId(e.target.value)}
                  placeholder={vm.role === "member" ? "e.g. M001" : vm.role === "speaker" ? "e.g. SP001" : "e.g. ADM01"}
                  style={{
                    width: "100%", paddingLeft: 40, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.subtle,
                    fontSize: 13, color: C.ink, outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: C.muted, marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: C.faint }} />
                <input
                  id="login-password-input"
                  type={vm.showPassword ? "text" : "password"}
                  value={vm.password}
                  onChange={e => vm.setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%", paddingLeft: 40, paddingRight: 44, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.subtle,
                    fontSize: 13, color: C.ink, outline: "none"
                  }}
                />
                <button onClick={vm.togglePasswordVisibility} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.faint, padding: 0
                }}>
                  {vm.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>
                {vm.role === "admin" ? "e.g. ADM01 / admin123" : "Set during member registration"}
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="button"
              onClick={vm.handleSubmit as any}
              disabled={vm.isAuthenticating}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: 12, border: "none",
                background: rc.btn, color: "#ffffff", fontSize: 14, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: vm.isAuthenticating ? "not-allowed" : "pointer", opacity: vm.isAuthenticating ? 0.65 : 1,
                boxShadow: `0 4px 16px ${rc.shadow}`, transition: "all 0.15s"
              }}
            >
              {vm.isAuthenticating
                ? <><RefreshCw style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /><span>Verifying…</span></>
                : <><span>Sign in as {vm.role.charAt(0).toUpperCase() + vm.role.slice(1)}</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
            </button>

            <div style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 20 }}>
              Parliamentary AI Decision-Support System
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
