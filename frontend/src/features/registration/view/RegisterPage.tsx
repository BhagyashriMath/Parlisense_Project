import React from "react";
import { useRegisterViewModel } from "../viewmodel/useRegisterViewModel";
import { formatAllocatedTime, PARLIAMENTARY_DEPARTMENTS } from "../model/registration.model";
import { MemberDetailModal } from "./MemberDetailModal";
import {
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Building2,
  MapPin,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Briefcase
} from "lucide-react";

/**
 * RegisterPage View (Feature-Based MVM Architecture)
 * Presentation layout for chamber member enrollment.
 */
export function RegisterPage() {
  const vm = useRegisterViewModel();

  if (!vm.isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⛔
          </div>
          <h2 className="text-lg font-black text-gray-900">Access Restricted</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Adding and enrolling new Members of Parliament is an administrative function reserved
            exclusively for the <strong>Chamber Administrator</strong>.
          </p>
          <button
            onClick={vm.navigateToLogin}
            className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white text-base shadow-inner font-serif font-black border border-amber-500/40 flex-shrink-0">
            🏛️
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">Parliament AI</h1>
            <p className="text-[10px] text-amber-400 font-semibold mt-0.5 truncate">
              Chamber Roster Enrollment & Member Registration
            </p>
          </div>
        </div>
        <button
          onClick={vm.navigateToDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-300 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Admin Station</span>
          <span className="sm:hidden">Back</span>
        </button>
      </header>

      {/* Main Registration Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center items-start">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-xl">
            {vm.createdMember ? (
              /* Success State */
              <div className="flex flex-col items-center text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-500/30">
                    Registration Certified
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-2">
                    Member Successfully Enrolled
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    {vm.createdMember.name} is now registered in the Lok Sabha Chamber database at
                    Seat {vm.createdMember.seat_id}.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200 text-left w-full space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {vm.createdMember.role === "Speaker" ? "Speaker ID:" : "Member ID:"}
                    </span>
                    <span className="text-amber-400 font-bold">{vm.createdMember.member_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seat Number:</span>
                    <span className="text-emerald-400 font-bold">{vm.createdMember.seat_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Microphone ID:</span>
                    <span className="text-sky-400">{vm.createdMember.mic_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Camera ID:</span>
                    <span className="text-indigo-400">{vm.createdMember.camera_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Speaking Limit:</span>
                    <span className="text-gray-800 font-bold">
                      {formatAllocatedTime(vm.createdMember.allocated_time_seconds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Station Password:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      •••••••• (Configured)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                  <button
                    onClick={vm.navigateToDashboard}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Return to Admin Station
                  </button>
                  <button
                    onClick={vm.resetForAnother}
                    className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs border border-gray-300"
                  >
                    Register Another MP
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={vm.handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-base font-black text-gray-900">
                      Parliamentary Member Enrollment
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      Configure credentials, floor seat assignment, and AI monitoring IDs
                    </p>
                  </div>
                </div>

                {vm.errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{vm.errorMessage}</span>
                  </div>
                )}

                {/* Section 1: Personal & Parliamentary Identity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 1. Member Identity
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Member Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajeshwar Sharma"
                      value={vm.formData.name}
                      onChange={(e) => vm.updateField("name", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Political Party Affiliation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. National Democratic Front"
                        value={vm.formData.party}
                        onChange={(e) => vm.updateField("party", e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Parliamentary Role <span className="text-rose-400">*</span>
                      </label>
                      <select
                        id="register-role-select"
                        value={vm.formData.role || "Member"}
                        onChange={(e) => vm.updateField("role", e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Speaker">Speaker</option>
                        <option value="Member">Member</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        <span>Department / Ministry Portfolio</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        Type custom or select from suggestions
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="register-dept-suggestions"
                        value={vm.formData.department ?? ""}
                        onChange={(e) => vm.updateField("department", e.target.value)}
                        placeholder="e.g. Ministry of Education, Ministry of Defence"
                        className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none"
                      />
                      <datalist id="register-dept-suggestions">
                        {PARLIAMENTARY_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Constituency
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Varanasi North"
                        value={vm.formData.constituency}
                        onChange={(e) => vm.updateField("constituency", e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Official Contact Info
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mp.office@sansad.nic.in"
                        value={vm.formData.contact_info}
                        onChange={(e) => vm.updateField("contact_info", e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Account Password <span className="text-rose-400">*</span></span>
                        <span className="text-[9px] text-gray-400 font-normal">Min. 4 characters</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="register-password-input"
                          type={vm.showPassword ? "text" : "password"}
                          required
                          placeholder="Create account password"
                          value={vm.formData.password || ""}
                          onChange={(e) => vm.updateField("password", e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-amber-500 rounded-xl pl-9 pr-9 py-2 text-xs text-gray-900 placeholder-slate-600 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={vm.togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700"
                          title={vm.showPassword ? "Hide password" : "Show password"}
                        >
                          {vm.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Station Access Status
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center justify-between h-[34px]">
                        <span>Authentication</span>
                        <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          ENABLED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Hardware & Seat Allocation */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> 2. Chamber Seat & Hardware Mapping
                    </h3>
                    <span className="text-[10px] text-amber-400/80 font-medium">
                      Mic & Camera IDs auto-derived from Seat ID
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                        {vm.idLabel} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="register-member-id-input"
                        type="text"
                        required
                        value={vm.formData.member_id}
                        onChange={(e) =>
                          vm.updateField("member_id", e.target.value.toUpperCase())
                        }
                        placeholder={vm.isSpeaker ? "e.g. SP001" : "e.g. M001"}
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          vm.isMemberIdTaken
                            ? "border-rose-500 text-red-700"
                            : "border-gray-200 text-amber-400 focus:border-amber-500"
                        }`}
                      />
                      {vm.isMemberIdTaken && (
                        <span className="text-[9px] text-rose-400">ID in use</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                        Seat ID <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. S001"
                        value={vm.formData.seat_id}
                        onChange={(e) => vm.updateField("seat_id", e.target.value.toUpperCase())}
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          vm.isSeatTaken
                            ? "border-rose-500 text-red-700"
                            : "border-gray-200 text-emerald-400 focus:border-emerald-500"
                        }`}
                      />
                      {vm.isSeatTaken && (
                        <span className="text-[9px] text-rose-400">Seat taken</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                        Microphone ID <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MIC001"
                        value={vm.formData.mic_id}
                        onChange={(e) => vm.updateField("mic_id", e.target.value.toUpperCase())}
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          vm.isMicTaken
                            ? "border-rose-500 text-red-700"
                            : "border-gray-200 text-sky-400 focus:border-sky-500"
                        }`}
                      />
                      {vm.isMicTaken && (
                        <span className="text-[9px] text-rose-400">Mic in use</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                        Camera ID <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CAM001"
                        value={vm.formData.camera_id}
                        onChange={(e) =>
                          vm.updateField("camera_id", e.target.value.toUpperCase())
                        }
                        className={`w-full bg-white border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          vm.isCameraTaken
                            ? "border-rose-500 text-red-700"
                            : "border-gray-200 text-indigo-400 focus:border-indigo-500"
                        }`}
                      />
                      {vm.isCameraTaken && (
                        <span className="text-[9px] text-rose-400">Cam in use</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Speaking Time Limit (Seconds)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="60"
                        max="1800"
                        step="30"
                        value={vm.formData.allocated_time_seconds}
                        onChange={(e) =>
                          vm.updateField("allocated_time_seconds", Number(e.target.value))
                        }
                        className="w-32 bg-white border border-gray-200 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs font-mono text-gray-900 focus:outline-none"
                      />
                      <span className="text-xs text-amber-400 font-medium">
                        = {formatAllocatedTime(vm.formData.allocated_time_seconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={
                      vm.isSubmitting ||
                      vm.isMemberIdTaken ||
                      vm.isSeatTaken ||
                      vm.isMicTaken ||
                      vm.isCameraTaken
                    }
                    className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-gray-100 disabled:text-gray-300 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    {vm.isSubmitting
                      ? "Registering Member..."
                      : "Confirm & Issue Member Credentials"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Live ID Badge Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Chamber ID Card Preview
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  Live Preview
                </span>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 relative overflow-hidden shadow-2xl">
                <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 select-none pointer-events-none">
                  🏛️
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400/50 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-md">
                    {vm.formData.name.trim()
                      ? vm.formData.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "MP"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30 font-mono">
                      {vm.formData.member_id || "M000"}
                    </span>
                    <h3 className="text-sm font-black text-gray-900 truncate mt-1">
                      {vm.formData.name.trim() || "Honourable Member"}
                    </h3>
                    <p className="text-[10px] text-amber-400/90 font-semibold truncate">
                      {vm.formData.role || "Member"}
                      {vm.formData.department && vm.formData.department !== "None / General Member"
                        ? ` • ${vm.formData.department}`
                        : ""}
                    </p>
                    <p className="text-[9px] text-gray-500 truncate">
                      {vm.formData.party || "Party Affiliation"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-200 text-center">
                  <div className="p-1.5 rounded-lg bg-white border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-semibold">
                      Seat
                    </span>
                    <span className="text-xs font-black font-mono text-emerald-400">
                      {vm.formData.seat_id || "—"}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-semibold">
                      Mic
                    </span>
                    <span className="text-xs font-black font-mono text-sky-400">
                      {vm.formData.mic_id || "—"}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-gray-200">
                    <span className="text-[8px] text-gray-400 block uppercase font-semibold">
                      Camera
                    </span>
                    <span className="text-xs font-black font-mono text-indigo-400">
                      {vm.formData.camera_id || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[9px] text-gray-500 pt-2 border-t border-gray-200/60 font-mono">
                  <span>
                    Constituency:{" "}
                    <strong className="text-gray-700">
                      {vm.formData.constituency || "General"}
                    </strong>
                  </span>
                  <span className="text-emerald-400 font-bold">● ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Currently Occupied Chamber Seats Reference */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Currently Enrolled Roster (
                  {vm.members.length} Members)
                </h4>
                <span className="text-[10px] text-gray-400">Click member to manage</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {vm.members.map((m) => (
                  <button
                    type="button"
                    key={m.member_id}
                    onClick={() => vm.openRosterMemberModal(m)}
                    className="p-1.5 rounded-lg bg-white hover:bg-gray-100/90 border border-gray-200/80 hover:border-amber-500/50 flex items-center justify-between text-[10px] text-left transition-all cursor-pointer group"
                    title={`Click to view, edit, or delete ${m.name} (${m.member_id})`}
                  >
                    <span className="font-bold text-gray-700 group-hover:text-amber-700 truncate mr-1">
                      {m.name.split(" ")[0]}
                    </span>
                    <span className="font-mono text-amber-400 group-hover:text-amber-700 text-[9px] font-bold">
                      {m.seat_id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Details, Edit, Update, and Delete Modal */}
      <MemberDetailModal vm={vm} />
    </div>
  );
}
