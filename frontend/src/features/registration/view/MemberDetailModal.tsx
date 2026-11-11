import React from "react";
import {
  X,
  User,
  Shield,
  MapPin,
  Mic,
  Video,
  Clock,
  Award,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Lock,
  Mail,
  Save,
  ArrowLeft,
  Loader2,
  Briefcase,
  RefreshCw
} from "lucide-react";
import type { RegisterViewModel } from "../viewmodel/useRegisterViewModel";
import {
  formatAllocatedTime,
  PARLIAMENTARY_DEPARTMENTS,
  deriveHardwareIdsFromSeatId
} from "../model/registration.model";

interface MemberDetailModalProps {
  vm: RegisterViewModel;
}

export function MemberDetailModal({ vm }: MemberDetailModalProps) {
  if (!vm.isRosterModalOpen || !vm.selectedRosterMember) {
    return null;
  }

  const member = vm.selectedRosterMember;
  const isSpeaker = member.role === "Speaker" || member.member_id.startsWith("SP");
  const isEditMode = vm.rosterModalMode === "edit";

  return (
    <div className="fixed inset-0 z-50 bg-gray-800/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-gray-300/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-amber-500/60 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 border-2 border-amber-500/60 flex items-center justify-center font-bold text-amber-400 text-lg shadow-md flex-shrink-0">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isSpeaker
                      ? "bg-amber-500/20 text-amber-700 border border-amber-500/40"
                      : "bg-blue-500/20 text-blue-700 border border-blue-500/40"
                  }`}
                >
                  {member.member_id}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    member.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-700 border border-emerald-500/40"
                      : member.status === "SUSPENDED"
                      ? "bg-rose-500/20 text-red-700 border border-rose-500/40"
                      : "bg-gray-200/40 text-gray-700 border border-slate-600/40"
                  }`}
                >
                  ● {member.status || "ACTIVE"}
                </span>
                <span className="text-xs text-gray-500 font-medium">{member.role || "Member"}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-1 leading-tight">
                {member.name}
              </h2>
            </div>
          </div>

          <button
            onClick={vm.closeRosterMemberModal}
            className="p-1.5 rounded-lg bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {vm.modalFeedback && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              vm.modalFeedback.type === "success"
                ? "bg-emerald-50/60 border-emerald-800/80 text-emerald-200"
                : "bg-red-50/60 border-rose-800/80 text-red-800"
            }`}
          >
            {vm.modalFeedback.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{vm.modalFeedback.message}</span>
          </div>
        )}

        {/* DELETE CONFIRMATION BANNER */}
        {vm.isConfirmingDelete && (
          <div className="p-4 bg-red-50/80 border-b border-rose-800/80 text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-900/80 rounded-lg text-red-700 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs">Are you sure you want to delete this member?</p>
                <p className="text-[11px] text-red-700/90 mt-0.5">
                  This permanently revokes credentials and unassigns seat{" "}
                  <strong className="text-white">{member.seat_id}</strong> and mic{" "}
                  <strong className="text-white">{member.mic_id || "N/A"}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => vm.setIsConfirmingDelete(false)}
                disabled={vm.isActionLoading}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={vm.handleDeleteRosterMember}
                disabled={vm.isActionLoading}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/50"
              >
                {vm.isActionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Delete Member</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL SECTION HEADER */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            {!isEditMode ? (
              <>
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Overview & Details</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Credentials</span>
              </>
            )}
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={() => vm.setRosterModalMode("view")}
              className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Overview</span>
            </button>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!isEditMode ? (
            /* VIEW MODE */
            <div className="space-y-4">
              {/* CORE HARDWARE & SEAT ASSIGNMENTS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-gray-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Chamber Seat
                  </div>
                  <div className="font-mono text-base font-black text-amber-400">{member.seat_id}</div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <Mic className="w-3.5 h-3.5 text-blue-400" /> Audio Channel
                  </div>
                  <div className="font-mono text-base font-black text-blue-400">
                    {member.mic_id || "Unbound"}
                  </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <Video className="w-3.5 h-3.5 text-cyan-400" /> Vision Feed
                  </div>
                  <div className="font-mono text-base font-black text-cyan-400">
                    {member.camera_id || "CAM-01"}
                  </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Floor Time
                  </div>
                  <div className="font-mono text-sm font-black text-emerald-400">
                    {formatAllocatedTime(member.allocated_time_seconds)}
                  </div>
                </div>
              </div>

              {/* POLITICAL & PARLIAMENTARY DETAILS */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Parliamentary Profile
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Political Party</span>
                    <span className="font-semibold text-gray-800">
                      {member.party || "Independent"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Constituency</span>
                    <span className="font-semibold text-gray-800">
                      {member.constituency || "Unspecified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Department / Ministry Portfolio</span>
                    <span className="font-semibold text-amber-700 flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>
                        {member.department || (isSpeaker ? "Speaker's Office" : "None / General Member")}
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Contact Email / Phone</span>
                    <span className="font-mono text-gray-700">
                      {member.contact_info || `parl.${member.member_id.toLowerCase()}@sansad.nic.in`}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Chamber Authentication</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                      <Lock className="w-3 h-3" /> Password Protected & Certified
                    </span>
                  </div>
                </div>
              </div>

              {/* DECORUM PERFORMANCE SCORE */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-700">
                    <Award className="w-4 h-4 text-amber-400" /> Decorum Compliance Index
                  </div>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {member.historical_score ?? 90}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                    style={{ width: `${member.historical_score ?? 90}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Calculated using AI acoustic speech relevance, decorum adherence, and seat compliance.
                </p>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                vm.handleSaveRosterMemberEdit();
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.name || ""}
                    onChange={(e) => vm.updateRosterEditField("name", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Parliamentary Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={
                      vm.rosterEditFormData.role === "Speaker"
                        ? "Speaker"
                        : "Member"
                    }
                    onChange={(e) => vm.updateRosterEditField("role", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Speaker">Speaker</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                    <span>Department / Ministry Portfolio</span>
                  </span>
                  <span className="text-[10px] text-gray-400 normal-case">
                    Type custom or select from suggestions
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="modal-dept-suggestions"
                    value={vm.rosterEditFormData.department ?? ""}
                    onChange={(e) => vm.updateRosterEditField("department", e.target.value)}
                    placeholder="e.g. Ministry of Education, Ministry of Defence"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="modal-dept-suggestions">
                    {PARLIAMENTARY_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Hardware & Station Allocation
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentSeat = vm.rosterEditFormData.seat_id || member.seat_id;
                      const derived = deriveHardwareIdsFromSeatId(currentSeat);
                      vm.updateRosterEditField("mic_id", derived.micId);
                      vm.updateRosterEditField("camera_id", derived.cameraId);
                    }}
                    title="Auto-derive Mic and Camera IDs from Seat ID"
                    className="text-[10px] text-amber-400 hover:text-amber-700 font-semibold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Auto-align Mic & Cam ({vm.rosterEditFormData.seat_id || member.seat_id})</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Seat ID *
                    </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.seat_id || ""}
                    onChange={(e) =>
                      vm.updateRosterEditField("seat_id", e.target.value.toUpperCase())
                    }
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-amber-700 font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Mic ID
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.mic_id || ""}
                    onChange={(e) =>
                      vm.updateRosterEditField("mic_id", e.target.value.toUpperCase())
                    }
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Camera ID
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.camera_id || ""}
                    onChange={(e) =>
                      vm.updateRosterEditField("camera_id", e.target.value.toUpperCase())
                    }
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Political Party
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.party || ""}
                    onChange={(e) => vm.updateRosterEditField("party", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Constituency
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.constituency || ""}
                    onChange={(e) => vm.updateRosterEditField("constituency", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Allocated Speaking Time (Seconds) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={vm.rosterEditFormData.allocated_time_seconds ?? 300}
                      onChange={(e) =>
                        vm.updateRosterEditField("allocated_time_seconds", Number(e.target.value))
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono font-bold focus:outline-none focus:border-amber-500"
                      required
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      ({formatAllocatedTime(vm.rosterEditFormData.allocated_time_seconds || 300)})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={vm.rosterEditFormData.status || "ACTIVE"}
                    onChange={(e) =>
                      vm.updateRosterEditField(
                        "status",
                        e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED"
                      )
                    }
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Contact Email / Phone
                  </label>
                  <input
                    type="text"
                    value={vm.rosterEditFormData.contact_info || ""}
                    onChange={(e) => vm.updateRosterEditField("contact_info", e.target.value)}
                    placeholder="e.g. m001@sansad.nic.in"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>New Password</span>
                    <span className="text-[10px] text-gray-400 normal-case">(Leave blank to keep)</span>
                  </label>
                  <input
                    type="password"
                    value={vm.rosterEditFormData.password || ""}
                    onChange={(e) => vm.updateRosterEditField("password", e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5">
          {!isEditMode ? (
            <>
              <button
                type="button"
                onClick={() => vm.setIsConfirmingDelete(true)}
                disabled={vm.isActionLoading}
                className="px-3 py-2 rounded-lg bg-white hover:bg-red-50/60 border border-rose-900/50 text-rose-400 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Member</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={vm.closeRosterMemberModal}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => vm.setRosterModalMode("edit")}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/50 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Credentials</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => vm.setRosterModalMode("view")}
                disabled={vm.isActionLoading}
                className="px-3.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => vm.setRosterModalMode("view")}
                  disabled={vm.isActionLoading}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={vm.handleSaveRosterMemberEdit}
                  disabled={vm.isActionLoading}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/50 cursor-pointer"
                >
                  {vm.isActionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
