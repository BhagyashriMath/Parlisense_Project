import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParliament } from "../../infrastructure/context/ParliamentContext";
import { Member, SeatInfo } from "../types";
import { useChamberVideo } from "../hooks/useChamberVideo";
import {
  Camera,
  Video,
  VideoOff,
  Mic,
  MicOff,
  User,
  Crown,
  Volume2,
  Maximize2,
  Minimize2,
  Radio,
  Users,
  Lock
} from "lucide-react";

interface ChamberVideoGridProps {
  className?: string;
  compact?: boolean;
  memberCameras?: boolean;
}

function ParticipantVideo({ stream, local }: { stream: MediaStream; local: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [stream]);
  // Mute only the local preview. Remote participant tracks carry audio and
  // must remain audible so members can hear the recognized floor speaker.
  return <video ref={ref} playsInline autoPlay muted={local} className={`w-full h-full object-cover ${local ? "mirror-mode" : ""}`} />;
}

export const ChamberVideoGrid: React.FC<ChamberVideoGridProps> = ({
  className = "",
  compact = false,
  memberCameras = true,
}) => {
  const {
    telemetry,
    members: contextMembers,
    currentUser,
    selectedMemberId,
    setIsWebcamActive,
    isMicActive,
    setIsMicActive,
    liveMicDb,
  } = useParliament();

  const { localStream, remoteStreams, publishers, error: cameraError, status: videoStatus,
    cameraPending, startCamera, stopCamera } = useChamberVideo(
      telemetry?.session_id, !!telemetry?.is_active, currentUser?.memberId, isMicActive
    );
  const isWebcamActive = !!localStream;
  const [spotlightSeat, setSpotlightSeat] = useState<string | null>(null);

  const rawMembersList: Member[] = contextMembers || [];

  const isSessionLive = !!telemetry?.is_active && !telemetry?.is_paused;
  const activeSpeakerSeat = isSessionLive ? telemetry?.active_speaker?.seat_id : undefined;
  const activeSpeakerName = isSessionLive ? telemetry?.active_speaker?.name : undefined;
  const speakingDuration = isSessionLive ? (telemetry?.speaking_duration_seconds || 0) : 0;

  const toggleCamera = useCallback(() => {
    if (isWebcamActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isWebcamActive, startCamera, stopCamera]);

  useEffect(() => {
    setIsWebcamActive(isWebcamActive);
    return () => setIsWebcamActive(false);
  }, [isWebcamActive, setIsWebcamActive]);

  // Check which participant represents the local user
  const isLocalUserSpeaker = currentUser?.role === "speaker";
  const isLocalUserMember = currentUser?.role === "member";
  // Selecting a floor member must never replace the Speaker's own identity.
  const currentMemberId = currentUser?.memberId || (isLocalUserMember ? selectedMemberId : undefined);
  const effectiveMemberId = currentMemberId || (isLocalUserMember ? selectedMemberId : undefined);

  // Floor status indicator for highlighting recognized speaker
  const isFloorSpeaker = isSessionLive && !!telemetry?.active_speaker?.member_id && telemetry.active_speaker.member_id === effectiveMemberId;
  const canSpeak = true;

  // Speaker participant card & floor deduplication
  // If Karthik or anyone is Speaker, they sit on the Dais and must NOT be duplicated in floor member cards
  const speakerMember = rawMembersList.find(
    (m) =>
      m.role?.toLowerCase().includes("speaker") ||
      m.role?.toLowerCase().includes("presiding") ||
      (isLocalUserSpeaker && (m.member_id === currentMemberId || (currentUser?.memberName && m.name.toLowerCase() === currentUser.memberName.toLowerCase())))
  );

  const floorMembers: Member[] = rawMembersList.filter((m) => {
    if (m.role?.toLowerCase().includes("speaker") || m.role?.toLowerCase().includes("presiding")) {
      return false;
    }
    if (isLocalUserSpeaker && (m.member_id === currentMemberId || (currentUser?.memberName && m.name.toLowerCase() === currentUser.memberName.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const speakerParticipant = {
    id: speakerMember?.member_id || "SPEAKER",
    seat_id: speakerMember?.seat_id || "CHAMBER-DAIS",
    name: isLocalUserSpeaker && currentUser?.memberName
      ? `${currentUser.memberName} (Speaker)`
      : (speakerMember?.name ? `${speakerMember.name} (Speaker)` : "Hon. Speaker"),
    role: "Presiding Officer",
    party: speakerMember?.party || "Neutral / Chair",
    mic_id: speakerMember?.mic_id || "MIC-SPEAKER",
    isSpeaker: true,
  };

  // Render individual participant tile
  const renderParticipant = (
    p: {
      id?: string;
      member_id?: string;
      seat_id: string;
      name: string;
      role?: string;
      party?: string;
      mic_id?: string;
      isSpeaker?: boolean;
    },
    isSpotlight: boolean = false
  ) => {
    const pId = p.id || p.member_id;
    const isThisSpeaker = !!p.isSpeaker;
    const isThisActiveSpeaker = isSessionLive && (
      isThisSpeaker
        ? activeSpeakerSeat === "SPEAKER" || activeSpeakerSeat === "CHAMBER-DAIS" || (isLocalUserSpeaker && telemetry?.active_speaker?.member_id === currentMemberId)
        : (!!activeSpeakerSeat && activeSpeakerSeat === p.seat_id) || (!!activeSpeakerName && activeSpeakerName === p.name)
    );

    const isThisLocalUser =
      (isThisSpeaker && isLocalUserSpeaker) ||
      (!isThisSpeaker && isLocalUserMember && (currentMemberId === pId || currentMemberId === p.seat_id));

    // On the Speaker dashboard member cameras stay OFF by design — presence is
    // determined by the vision/movement pipeline instead of live video feeds.
    const stream = isThisLocalUser
      ? localStream
      : (memberCameras ? remoteStreams[pId || ""] : undefined);

    const seatPresence = !isThisSpeaker
      ? (telemetry?.vision_telemetry?.seat_status as Record<string, SeatInfo> | undefined)?.[p.seat_id]
      : undefined;
    const movementText = seatPresence?.movementStatus?.toLowerCase() || "";
    const presenceLabel = !isThisSpeaker && !memberCameras
      ? (seatPresence
          ? (!seatPresence.occupied || seatPresence.status === "Absent"
              ? "ABSENT"
              : movementText.includes("well rush") || seatPresence.status === "Moved Away"
              ? "MOVED AWAY"
              : "IN SEAT ✓")
          : "PRESENCE —")
      : null;
    const presenceTone = presenceLabel === "ABSENT"
      ? "bg-rose-500/20 text-red-700 border-rose-500/40"
      : presenceLabel === "MOVED AWAY"
      ? "bg-amber-500/20 text-amber-700 border-amber-500/40"
      : "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    const presencePulse = presenceLabel === "ABSENT" || presenceLabel === "MOVED AWAY" ? " animate-pulse" : "";

    const cameraStatus = isThisSpeaker
      ? stream ? "Camera live" : publishers.includes(pId || "") ? "Connecting camera…" : "Camera off"
      : memberCameras
      ? (stream ? "Camera live" : publishers.includes(pId || "") ? "Connecting camera…" : "Camera off")
      : (presenceLabel || "Presence monitoring");

    return (
      <div
        key={p.seat_id}
        onClick={() => setSpotlightSeat(spotlightSeat === p.seat_id ? null : p.seat_id)}
        className={`relative rounded-xl overflow-hidden bg-white border transition-all duration-300 flex flex-col justify-between group cursor-pointer ${
          isThisActiveSpeaker
            ? "border-amber-400/90 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
            : isThisLocalUser
            ? "border-sky-500/60 ring-1 ring-sky-500/30"
            : "border-gray-200 hover:border-gray-300"
        } ${isSpotlight ? "col-span-full h-80 sm:h-96" : "aspect-video min-h-[140px]"}`}
      >
        {/* Background / Live Video Stream */}
        <div className="absolute inset-0 bg-white overflow-hidden">
          {stream ? (
            <ParticipantVideo stream={stream} local={isThisLocalUser} />
          ) : (
            // Camera-off placeholder; remote feeds come from the session video room.
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
              {/* Subtle Chamber Architecture Background Lines */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Avatar Centerpiece */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg border transition-transform duration-300 group-hover:scale-105 ${
                    isThisSpeaker
                      ? "bg-gradient-to-br from-amber-600 to-amber-900 border-amber-400/50 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      : isThisActiveSpeaker
                      ? "bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-400/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                      : "bg-gradient-to-br from-slate-800 to-slate-900 border-gray-300 text-gray-800"
                  }`}
                >
                  {isThisSpeaker ? (
                    <User className="w-7 h-7 sm:w-8 sm:h-8 text-amber-800" />
                  ) : (
                    <span>
                      {p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                {isThisActiveSpeaker && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 text-[10px] font-mono font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>AUDIO LIVE</span>
                  </div>
                )}

                {presenceLabel && (
                  <div className={`mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${presenceTone}${presencePulse}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      presenceLabel === "ABSENT"
                        ? "bg-rose-400"
                        : presenceLabel === "MOVED AWAY"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`} />
                    <span>{presenceLabel}</span>
                  </div>
                )}
              </div>

              {/* Watermark Stream Tag */}
              <div className="absolute top-2.5 left-2.5 text-[9px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1 z-10">
                <Radio className={`w-2.5 h-2.5 ${isThisActiveSpeaker ? "text-emerald-400 animate-pulse" : "text-gray-600"}`} />
                <span>{cameraStatus}</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Floating Badge Bar */}
        <div className="relative z-10 p-2 sm:p-2.5 flex items-center justify-between pointer-events-none">
          {/* Role & Seat Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md shadow-sm font-mono ${
                isThisSpeaker
                  ? "bg-amber-50/80 text-amber-700 border-amber-500/50"
                  : "bg-gray-50 text-gray-700 border-gray-300"
              }`}
            >
              {p.seat_id}
            </span>
            {isThisLocalUser && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-700 border border-sky-400/40 backdrop-blur-md font-mono">
                YOU
              </span>
            )}
          </div>

          {/* Audio & Speaking State */}
          <div className="flex items-center gap-1.5">
            {isThisActiveSpeaker ? (
              <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/90 text-slate-950 shadow-md font-mono animate-pulse">
                <Mic className="w-2.5 h-2.5" />
                <span>SPEAKING {speakingDuration > 0 ? `${speakingDuration}s` : ""}</span>
              </span>
            ) : (
              <span className="p-1 rounded bg-gray-50 text-gray-400 border border-gray-200 backdrop-blur-sm">
                <MicOff className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>

        {/* Bottom Participant Info Overlay */}
        <div className="relative z-10 p-2.5 sm:p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 pr-1">
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-tight flex items-center gap-1">
                {isThisSpeaker && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                <span className="truncate">{p.name}</span>
              </p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5 font-medium">
                {p.role} {p.party ? `· ${p.party}` : ""}
              </p>
            </div>

            {/* Quick action buttons for local user */}
            {isThisLocalUser && (
              <div className="flex items-center gap-1.5 pointer-events-auto flex-shrink-0 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCamera();
                  }}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 shadow-sm transition-all ${
                    isWebcamActive
                      ? "bg-rose-600/30 text-red-700 border-rose-500/50 hover:bg-rose-600/50"
                      : "bg-sky-600/30 text-sky-700 border-sky-500/50 hover:bg-sky-600/50"
                  }`}
                  title={isWebcamActive ? "Stop my camera" : "Start my camera"}
                  disabled={cameraPending || !telemetry?.is_active || videoStatus !== "Connected"}
                >
                  {isWebcamActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="chamber-video-grid"
      className={`flex flex-col h-full min-h-0 bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden ${className}`}
    >
      {/* Grid Top Control Header */}
      <div className="p-2 sm:p-2.5 bg-white border-b border-gray-200 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight truncate">
                Chamber Video Feeds
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 font-mono">
                {memberCameras
                  ? `${publishers.length + (isWebcamActive ? 1 : 0)} CAMERAS LIVE`
                  : `${isWebcamActive ? 1 : 0} CAMERA LIVE · ${floorMembers.length} PRESENCE MONITORED`}
              </span>
            </div>
            <p className="text-[9px] text-gray-500 truncate hidden sm:block">
              {videoStatus === "Connected"
                ? (memberCameras
                    ? "Everyone can watch enabled cameras, including members with their camera off"
                    : "Only the Speaker's camera is shown — member presence is tracked by vision monitoring")
                : videoStatus}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {cameraError && (
            <span className="text-[10px] text-rose-400 font-mono hidden md:inline">
              {cameraError}
            </span>
          )}

          {/* Start / Stop Mic Button */}
          <button
            id="chamber-grid-toggle-mic-btn"
            onClick={() => setIsMicActive(!isMicActive)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isMicActive
                ? "bg-rose-500/20 text-red-700 border-rose-500/40 hover:bg-rose-500/30"
                : "bg-emerald-500/20 text-emerald-700 border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
            title={isMicActive ? "Mute / Turn off personal microphone" : "Unmute / Turn on personal microphone"}
          >
            {isMicActive ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stop Mic</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Start Mic</span>
              </>
            )}
          </button>

          {/* Start / Stop Cam Button */}
          <button
            id="chamber-grid-toggle-cam-btn"
            disabled={cameraPending || !telemetry?.is_active || videoStatus !== "Connected"}
            onClick={toggleCamera}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isWebcamActive
                ? "bg-rose-500/20 text-red-700 border-rose-500/40 hover:bg-rose-500/30"
                : "bg-sky-500/20 text-sky-700 border-sky-500/40 hover:bg-sky-500/30"
            }`}
            title={isWebcamActive ? "Turn off personal webcam" : "Turn on personal webcam"}
          >
            {isWebcamActive ? (
              <>
                <VideoOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stop Cam</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cameraPending ? "Starting…" : "Start Cam"}</span>
              </>
            )}
          </button>

          {spotlightSeat && (
            <button
              onClick={() => setSpotlightSeat(null)}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Return to multi-video grid view"
            >
              <Minimize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Grid View</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Tile Grid Stage */}
      {(cameraError || videoStatus !== "Connected" || !isWebcamActive) && (
        <p role="status" className="px-3 py-2 text-xs text-amber-800 border-b border-gray-200">
          {cameraError || (videoStatus !== "Connected" ? videoStatus : memberCameras
            ? "Please enable your camera during the session. You can still watch other members while your camera is off."
            : "Enable your camera to broadcast to the chamber. Member seats show vision presence status.")}
        </p>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        {spotlightSeat ? (
          // Spotlight Mode: Highlighted Participant + Row of Thumbnails
          <div className="flex flex-col gap-4">
            {/* Spotlit Participant */}
            {spotlightSeat === speakerParticipant.seat_id
              ? renderParticipant(speakerParticipant, true)
              : renderParticipant(
                  floorMembers.find((m) => m.seat_id === spotlightSeat) || {
                    id: spotlightSeat,
                    seat_id: spotlightSeat,
                    name: `Member (${spotlightSeat})`,
                    role: "Member of Parliament",
                  },
                  true
                )}

            {/* Thumbnails Row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-3 pt-1">
              {renderParticipant(speakerParticipant)}
              {floorMembers.map((m) =>
                renderParticipant({
                  id: m.member_id,
                  seat_id: m.seat_id,
                  name: m.name,
                  role: m.role || "Member of Parliament",
                  party: m.party,
                  mic_id: m.mic_id,
                })
              )}
            </div>
          </div>
        ) : (
          // Multi-Participant Grid View with enhanced horizontal card separation
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-y-5 gap-x-8 sm:gap-x-10 md:gap-x-12">
            {/* 1. Hon. Speaker Tile */}
            {renderParticipant(speakerParticipant)}

            {/* 2. All Joined Members Tiles (Floor Members) */}
            {floorMembers.map((m) =>
              renderParticipant({
                id: m.member_id,
                seat_id: m.seat_id,
                name: m.name,
                role: m.role || "Member of Parliament",
                party: m.party,
                mic_id: m.mic_id,
              })
            )}
          </div>
        )}
      </div>

      {/* Persistent audio playback elements for all connected remote chamber participants */}
      <div className="hidden" aria-hidden="true">
        {Object.entries(remoteStreams).map(([peerId, rStream]) => (
          <audio
            key={peerId}
            autoPlay
            playsInline
            ref={(audioEl) => {
              if (audioEl && audioEl.srcObject !== rStream) {
                audioEl.srcObject = rStream;
                audioEl.play().catch(() => {});
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
