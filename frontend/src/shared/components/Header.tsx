import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import {
  ShieldAlert,
  Radio,
  FileText,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Layers,
  UserCheck,
  Building2,
  AlertTriangle,
  Lock,
  LogOut,
  Flag,
  Activity,
  Cpu,
  Menu,
  X,
  Settings,
  User,
  Compass
} from "lucide-react";


import { unlockChamberAudio } from "../utils/chamberAudio";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    telemetry,
    currentTab,
    setCurrentTab,
    currentUser,
    logout,
    resetEmergency,
    toggleSession,
    switchMode,
    openReport,
    endSessionAndGenerateReport,
    isMuted,
    setIsMuted
  } = useParliament();

  // Close mobile drawer on route changes or Escape key
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Detect if this laptop is role-locked via URL param
  const [lockedRole, setLockedRole] = useState<string | null>(null);
  const [lockedMemberId, setLockedMemberId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    const id = params.get("id");
    if (role) setLockedRole(role);
    if (id) setLockedMemberId(id);
  }, []);

  const isLocked = !!lockedRole;
  const isEmergency = telemetry?.ai_output?.emergency;
  const isSessionActive = !!telemetry?.is_active;
  const isPaused = !!telemetry?.is_paused;
  const isLive = isSessionActive && !isPaused;
  const isDemo = telemetry?.mode === "DEMO";
  const isSpeaker = currentUser?.role === "speaker" || (!currentUser && currentTab === "speaker");

  const sessionStatusText = !isSessionActive
    ? "SESSION CONCLUDED"
    : isPaused
    ? "SESSION PAUSED"
    : "SESSION ONGOING";

  const sessionStatusDotColor = !isSessionActive
    ? "bg-slate-500"
    : isPaused
    ? "bg-amber-400"
    : "bg-emerald-400";

  const roleLabel: Record<string, string> = {
    speaker: "Speaker Presiding Console",
    admin: "Executive Administration Station",
    member: "Member of Parliament Terminal"
  };

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: <Building2 className="w-4 h-4" /> },
    { label: "Speaker Console", path: "/speaker", icon: <Building2 className="w-4 h-4 text-amber-400" /> },
    { label: "Member Terminal", path: "/member", icon: <UserCheck className="w-4 h-4 text-emerald-400" /> },
    { label: "Admin Station", path: "/admin", icon: <Layers className="w-4 h-4 text-sky-400" /> },
    { label: "Floor Monitor", path: "/parliament", icon: <Compass className="w-4 h-4 text-purple-400" /> },
    { label: "Credentials", path: "/profile", icon: <User className="w-4 h-4 text-amber-700" /> },
    { label: "Settings", path: "/settings", icon: <Settings className="w-4 h-4 text-gray-500" /> },
  ];

  return (
    <header
      id="parliament-header"
      className="bg-white sticky top-0 z-40 flex-shrink-0"
      style={{ borderBottom: "1px solid #e2e5eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {/* Emergency Global Banner if Active */}
      {isEmergency && (
        <div
          id="emergency-banner"
          className="bg-red-600 text-white px-3 sm:px-4 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 animate-pulse text-xs font-bold tracking-wide shadow-md"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-800 animate-bounce flex-shrink-0" />
            <span className="uppercase font-black text-[11px] sm:text-xs">
              CRITICAL EMERGENCY IN CHAMBER — MARSHALS DISPATCHED — SAFETY PROTOCOL ACTIVE
            </span>
          </div>
          <button
            id="reset-emergency-btn"
            onClick={() => resetEmergency()}
            className="bg-white text-red-700 hover:bg-red-50 text-[10px] font-black px-2.5 py-1 rounded shadow transition-transform active:scale-95 flex-shrink-0"
          >
            DISMISS EMERGENCY
          </button>
        </div>
      )}

      <div className="w-full px-2.5 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Brand & Parliamentary Crest */}
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="Go to Chamber Dashboard"
          >
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] border border-amber-500/40 p-1 flex-shrink-0 overflow-hidden">
              <img src="/Parlisense.png" alt="ParliSense" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h1 className="text-base font-bold leading-none"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#1a1f2e" }}>
                  Parli<span style={{ color: "#4f46e5" }}>Sense</span>
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 tracking-wide font-mono">
                  DECISION-SUPPORT
                </span>
              </div>
              <p className="text-[10px] text-gray-500 truncate max-w-[140px] sm:max-w-xs md:max-w-sm mt-0.5 leading-tight font-medium">
                {telemetry?.current_bill || "Digital Data Governance & AI Ethics Framework Bill"}
              </p>
            </div>
          </div>

          {/* Desktop Center: Role Status or Station Switcher (hidden on mobile/tablet < lg) */}
          <div className="hidden lg:flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold shadow-inner ${
                    currentUser.role === "speaker"
                      ? "bg-amber-50/40 border-amber-500/50 text-amber-700"
                      : currentUser.role === "admin"
                      ? "bg-sky-50/40 border-sky-500/50 text-sky-700"
                      : "bg-emerald-50/40 border-emerald-500/50 text-emerald-700"
                  }`}
                >
                  {currentUser.role === "speaker" && <Building2 className="w-3.5 h-3.5 text-amber-400" />}
                  {currentUser.role === "admin" && <Layers className="w-3.5 h-3.5 text-sky-400" />}
                  {currentUser.role === "member" && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="tracking-wide">
                    {currentUser.role === "speaker" && "Speaker Console"}
                    {currentUser.role === "admin" && "Administration Station"}
                    {currentUser.role === "member" && (
                      <>
                        <span>Member Terminal</span>
                        {currentUser.seatId && (
                          <span className="ml-2 font-mono text-[10px] bg-gray-50 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                            Seat {currentUser.seatId}
                          </span>
                        )}
                        {currentUser.memberName && (
                          <span className="ml-1.5 font-normal text-gray-700">
                            ({currentUser.memberName.split(" ").slice(0, 2).join(" ")})
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>

                <button
                  id="header-logout-btn"
                  onClick={logout}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white hover:bg-red-50/60 text-gray-500 hover:text-red-700 border border-gray-200 hover:border-rose-500/40 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Log out and return to Login Gateway"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : !isLocked ? (
              <div
                id="dashboard-tabs"
                className="flex items-center p-1 rounded-xl flex-shrink-0"
                style={{ background: "#f4f6f9", border: "1px solid #e2e5eb" }}
              >
                <button id="tab-speaker"
                  onClick={() => { setCurrentTab("speaker"); navigate("/speaker"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                  style={currentTab === "speaker"
                    ? { background: "#4f46e5", color: "#fff", boxShadow: "0 2px 6px rgba(79,70,229,0.25)" }
                    : { color: "#8a93a6" }}>
                  <Building2 className="w-3.5 h-3.5" /><span>Speaker</span>
                </button>
                <button id="tab-member"
                  onClick={() => { setCurrentTab("member"); navigate("/member"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                  style={currentTab === "member"
                    ? { background: "#4f46e5", color: "#fff", boxShadow: "0 2px 6px rgba(79,70,229,0.25)" }
                    : { color: "#8a93a6" }}>
                  <UserCheck className="w-3.5 h-3.5" /><span>Member</span>
                </button>
                <button id="tab-admin"
                  onClick={() => { setCurrentTab("admin"); navigate("/admin"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                  style={currentTab === "admin"
                    ? { background: "#4f46e5", color: "#fff", boxShadow: "0 2px 6px rgba(79,70,229,0.25)" }
                    : { color: "#8a93a6" }}>
                  <Layers className="w-3.5 h-3.5" /><span>Admin</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-50/40 border border-amber-500/50 flex-shrink-0">
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-bold text-amber-700">
                  {roleLabel[lockedRole!] || lockedRole}
                </span>
                {lockedMemberId && (
                  <span className="text-[10px] font-mono text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-300">
                    {lockedMemberId}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop Right Controls (hidden on mobile/tablet < lg) */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            {/* Session Time & State */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 shadow-inner text-xs">
              <span className="flex h-2.5 w-2.5 relative">
                {isLive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sessionStatusDotColor}`}
                />
              </span>
              <span className="font-bold text-gray-700 text-[11px]">
                {sessionStatusText}
              </span>
              <span className="font-mono text-amber-400 font-black tracking-wider text-xs">
                {telemetry?.session_duration_formatted || "00:00:00"}
              </span>
            </div>

            {/* Mode Switcher */}
            <button
              id="mode-toggle-btn"
              onClick={() => switchMode(isDemo ? "LIVE" : "DEMO")}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isDemo
                  ? "bg-indigo-50/60 text-indigo-700 border-indigo-500/50 hover:bg-indigo-900/80"
                  : "bg-emerald-50/60 text-emerald-700 border-emerald-500/50 hover:bg-emerald-900/80"
              }`}
              title="Toggle between Demo simulation and Live hardware feed"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{isDemo ? "DEMO" : "HARDWARE"}</span>
            </button>

            {/* End Sitting / Official Report (End Sitting available ONLY for Speaker) */}
            {isLive && isSpeaker ? (
              <button
                id="header-end-session-btn"
                onClick={() => endSessionAndGenerateReport()}
                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md flex items-center gap-1.5 border border-rose-400/40 transition-all active:scale-95 cursor-pointer"
                title="Conclude sitting and synthesize certified report"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>End & Report</span>
              </button>
            ) : (
              <button
                id="header-report-btn"
                onClick={() => openReport()}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-white hover:bg-gray-100 text-gray-800 border border-gray-300/80 flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Inspect certified parliamentary session report"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Official Report</span>
              </button>
            )}

            {/* Mute Audio Alerts */}
            <button
              id="mute-toggle-btn"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (!nextMuted) {
                  unlockChamberAudio(true);
                }
              }}
              className="p-1.5 text-gray-500 hover:text-gray-900 bg-white rounded-lg border border-gray-200 transition-colors shadow-sm cursor-pointer"
              title={isMuted ? "Unmute sound alerts" : "Mute sound alerts"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-gray-700" />}
            </button>

            {/* Pause/Resume Session (Available ONLY for Speaker) */}
            {isSpeaker && (
              <button
                id="session-play-pause-btn"
                disabled={!isSessionActive}
                onClick={() => {
                  if (!isSessionActive) return;
                  toggleSession(isPaused);
                }}
                className={`p-1.5 rounded-lg border transition-all shadow-sm ${
                  !isSessionActive
                    ? "opacity-30 cursor-not-allowed bg-white text-gray-300 border-gray-200"
                    : isPaused
                    ? "bg-amber-500/30 text-amber-700 border-amber-400 animate-pulse hover:bg-amber-500/40 cursor-pointer"
                    : "bg-amber-600/20 text-amber-400 border-amber-500/40 hover:bg-amber-600/30 cursor-pointer"
                }`}
                title={
                  !isSessionActive
                    ? "Session not started — Start session from Speaker console first"
                    : isPaused
                    ? "Resume paused sitting"
                    : "Pause sitting (does not end session)"
                }
              >
                {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
              </button>
            )}
          </div>

          {/* Mobile & Tablet Compact Controls (< lg) */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Compact Sitting Status Pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${sessionStatusDotColor} ${isLive ? "animate-pulse" : ""}`} />
              <span className="font-bold text-amber-400">
                {telemetry?.session_duration_formatted || "00:00:00"}
              </span>
            </div>

            {/* Mute Quick Toggle */}
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (!nextMuted) {
                  unlockChamberAudio(true);
                }
              }}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-gray-900"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Hamburger Menu Button */}
            <button
              id="mobile-nav-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-gray-800/75 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] h-full bg-white border-l border-gray-200 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto p-4 space-y-4">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-sm">
                    🏛️
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase text-gray-900">ParliSense Navigation</h2>
                    <p className="text-[10px] text-amber-400/90 font-mono">Chamber Station Menu</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active User / Console Identity */}
              {currentUser && (
                <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Active Station
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 font-bold uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 mt-1 truncate">
                    {currentUser.memberName || "Parliament Workstation"}
                  </p>
                  {currentUser.seatId && (
                    <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      Assigned Seat: {currentUser.seatId}
                    </p>
                  )}
                </div>
              )}

              {/* Station Switcher Tabs */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-1">
                  Chamber Roles & Consoles
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setCurrentTab("speaker");
                      navigate("/speaker");
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center border transition-all ${
                      currentTab === "speaker"
                        ? "bg-amber-600 text-white border-amber-400"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Speaker
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab("member");
                      navigate("/member");
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center border transition-all ${
                      currentTab === "member"
                        ? "bg-amber-600 text-white border-amber-400"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Member
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab("admin");
                      navigate("/admin");
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 px-1 rounded-lg text-xs font-bold text-center border transition-all ${
                      currentTab === "admin"
                        ? "bg-amber-600 text-white border-amber-400"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Route Links */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-1">
                  Workspace Views
                </span>
                <div className="space-y-1">
                  {navLinks.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                          isActive
                            ? "bg-amber-50/40 text-amber-700 border border-amber-500/40 font-bold"
                            : "text-gray-700 hover:text-white hover:bg-white"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chamber Sitting Controls */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-1">
                  Session Controls
                </span>

                <div className={`grid ${isSpeaker ? "grid-cols-2" : "grid-cols-1"} gap-1.5`}>
                  <button
                    onClick={() => switchMode(isDemo ? "LIVE" : "DEMO")}
                    className="py-2 px-2 rounded-lg bg-white border border-gray-200 text-[11px] font-mono text-gray-800 flex items-center justify-center gap-1.5"
                  >
                    <Radio className="w-3 h-3 text-indigo-400" />
                    <span>{isDemo ? "Demo" : "Hardware"}</span>
                  </button>

                  {isSpeaker && (
                    <button
                      disabled={!isSessionActive}
                      onClick={() => {
                        if (!isSessionActive) return;
                        toggleSession(isPaused);
                      }}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-mono flex items-center justify-center gap-1.5 ${
                        !isSessionActive
                          ? "opacity-30 cursor-not-allowed bg-white text-gray-300 border-gray-200"
                          : "bg-white border-gray-200 text-gray-800 cursor-pointer"
                      }`}
                    >
                      {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    openReport();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white border border-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-100"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Certified Session Report</span>
                </button>

                {isLive && isSpeaker && (
                  <button
                    onClick={() => {
                      endSessionAndGenerateReport();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>End Live Session</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom: Logout */}
            <div className="pt-3 border-t border-gray-200">
              {currentUser ? (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-50/40 hover:bg-rose-900/60 text-red-700 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out Workstation</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Go to Login Gateway</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
