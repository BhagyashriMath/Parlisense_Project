import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useParliament } from "../../../infrastructure/context/ParliamentContext";
import { createMember, updateMember, deleteMember } from "../../../infrastructure/api/api";
import { Member } from "../../../shared/types";
import { MemberRegistrationInput, RosterModalMode } from "../model/registration.types";
import {
  validateMemberConflict,
  generateNextMemberIdentifiers,
  getNextAvailableId,
  deriveHardwareIdsFromSeatId,
  validateMemberUpdate
} from "../model/registration.model";

export function useRegisterViewModel() {
  const { members, refreshMembers, currentUser, navigateToLogin } = useParliament();
  const navigate = useNavigate();

  const isAuthorized = currentUser?.role === "admin";

  const suggested = generateNextMemberIdentifiers(members, "Member");

  const initialFormData: MemberRegistrationInput = {
    name: "",
    member_id: suggested.suggestedMemberId,
    seat_id: suggested.suggestedSeatId,
    mic_id: suggested.suggestedMicId,
    camera_id: suggested.suggestedCameraId,
    constituency: "",
    party: "National Democratic Front",
    role: "Member",
    allocated_time_seconds: 300,
    contact_info: "",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "ACTIVE",
    password: "",
    department: "None / General Member"
  };

  const [formData, setFormData] = useState<MemberRegistrationInput>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMember, setCreatedMember] = useState<Member | null>(null);

  // Selected Member Detail / Edit / Delete Modal State
  const [selectedRosterMember, setSelectedRosterMember] = useState<Member | null>(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterModalMode, setRosterModalModeState] = useState<RosterModalMode>("view");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [rosterEditFormData, setRosterEditFormData] = useState<Partial<Member>>({});

  const isMemberIdTaken = members.some(
    (m) => m.member_id.toUpperCase() === formData.member_id.trim().toUpperCase()
  );
  const isSeatTaken = members.some(
    (m) => m.seat_id.toUpperCase() === formData.seat_id.trim().toUpperCase()
  );
  const isMicTaken = members.some(
    (m) => (m.mic_id || "").toUpperCase() === (formData.mic_id || "").trim().toUpperCase()
  );
  const isCameraTaken = members.some(
    (m) => (m.camera_id || "").toUpperCase() === (formData.camera_id || "").trim().toUpperCase()
  );

  const isSpeaker = formData.role === "Speaker";
  const idLabel = isSpeaker ? "Speaker ID" : "Member ID";

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const updateField = <K extends keyof MemberRegistrationInput>(
    field: K,
    value: MemberRegistrationInput[K]
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "role") {
        const role = value === "Speaker" ? "Speaker" : "Member";
        const prefix = role === "Speaker" ? "SP" : "M";
        updated.member_id = getNextAvailableId(prefix, members);
        if (role === "Speaker") {
          updated.department = "Speaker's Office";
        } else if (prev.department === "Speaker's Office") {
          updated.department = "None / General Member";
        }
      } else if (field === "seat_id") {
        const strVal = String(value || "").trim();
        const digits = strVal.match(/\d+/g);
        if (digits && digits.length > 0) {
          const derived = deriveHardwareIdsFromSeatId(strVal);
          updated.mic_id = derived.micId;
          updated.camera_id = derived.cameraId;
        }
      }
      return updated;
    });
  };

  const resetForAnother = () => {
    setCreatedMember(null);
    const role = (formData.role as "Speaker" | "Member") || "Member";
    const nextSuggested = generateNextMemberIdentifiers(members, role);
    setFormData({
      ...initialFormData,
      role,
      member_id: nextSuggested.suggestedMemberId,
      seat_id: nextSuggested.suggestedSeatId,
      mic_id: nextSuggested.suggestedMicId,
      camera_id: nextSuggested.suggestedCameraId,
      password: "",
      department: role === "Speaker" ? "Speaker's Office" : "None / General Member"
    });
  };

  const navigateToDashboard = () => {
    navigate("/admin");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateMemberConflict(formData, members);
    if (validation.hasConflict) {
      setErrorMessage(validation.errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMember({
        ...formData,
        name: formData.name.trim(),
        member_id: formData.member_id.trim().toUpperCase(),
        seat_id: formData.seat_id.trim().toUpperCase(),
        mic_id: (formData.mic_id || "").trim().toUpperCase(),
        camera_id: (formData.camera_id || "").trim().toUpperCase(),
        allocated_time_seconds: Number(formData.allocated_time_seconds) || 300,
        contact_info:
          formData.contact_info || `parl.${formData.member_id.toLowerCase()}@sansad.nic.in`,
        password: formData.password ? formData.password.trim() : undefined,
        department:
          formData.department?.trim() ||
          (formData.role === "Speaker" ? "Speaker's Office" : "None / General Member")
      });

      const member = res?.member || (res as any);
      if (member && (member.member_id || member.id || member.name)) {
        await refreshMembers();
        setCreatedMember(member);
      } else {
        setErrorMessage("Failed to register member. Please check details.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error submitting registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRosterMemberModal = (member: Member) => {
    setSelectedRosterMember(member);
    setRosterEditFormData({
      name: member.name,
      member_id: member.member_id,
      seat_id: member.seat_id,
      mic_id: member.mic_id || "",
      camera_id: member.camera_id || "",
      constituency: member.constituency || "",
      party: member.party || "",
      role: member.role || "Member",
      allocated_time_seconds: member.allocated_time_seconds || 300,
      status: member.status || "ACTIVE",
      contact_info: member.contact_info || "",
      password: "",
      department: member.department || (member.role === "Speaker" ? "Speaker's Office" : "None / General Member")
    });
    setRosterModalModeState("view");
    setIsConfirmingDelete(false);
    setModalFeedback(null);
    setIsActionLoading(false);
    setIsRosterModalOpen(true);
  };

  const closeRosterMemberModal = () => {
    setIsRosterModalOpen(false);
    setSelectedRosterMember(null);
    setIsConfirmingDelete(false);
    setModalFeedback(null);
    setIsActionLoading(false);
  };

  const setRosterModalMode = (mode: RosterModalMode) => {
    setModalFeedback(null);
    setIsConfirmingDelete(false);
    if (mode === "edit" && selectedRosterMember) {
      setRosterEditFormData({
        name: selectedRosterMember.name,
        member_id: selectedRosterMember.member_id,
        seat_id: selectedRosterMember.seat_id,
        mic_id: selectedRosterMember.mic_id || "",
        camera_id: selectedRosterMember.camera_id || "",
        constituency: selectedRosterMember.constituency || "",
        party: selectedRosterMember.party || "",
        role: selectedRosterMember.role || "Member",
        allocated_time_seconds: selectedRosterMember.allocated_time_seconds || 300,
        status: selectedRosterMember.status || "ACTIVE",
        contact_info: selectedRosterMember.contact_info || "",
        password: "",
        department: selectedRosterMember.department || (selectedRosterMember.role === "Speaker" ? "Speaker's Office" : "None / General Member")
      });
    }
    setRosterModalModeState(mode);
  };

  const updateRosterEditField = <K extends keyof Member>(field: K, value: Member[K]) => {
    setRosterEditFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "role") {
        if (value === "Speaker") {
          updated.department = "Speaker's Office";
        } else if (prev.department === "Speaker's Office") {
          updated.department = "None / General Member";
        }
      } else if (field === "seat_id") {
        const strVal = String(value || "").trim();
        const digits = strVal.match(/\d+/g);
        if (digits && digits.length > 0) {
          const derived = deriveHardwareIdsFromSeatId(strVal);
          updated.mic_id = derived.micId;
          updated.camera_id = derived.cameraId;
        }
      }
      return updated;
    });
  };

  const handleSaveRosterMemberEdit = async () => {
    if (!selectedRosterMember) return;

    const validation = validateMemberUpdate(
      selectedRosterMember.member_id,
      rosterEditFormData,
      members
    );
    if (!validation.isValid) {
      setModalFeedback({ type: "error", message: validation.errorMessage || "Validation failed" });
      return;
    }

    setIsActionLoading(true);
    setModalFeedback(null);
    try {
      const updates: Partial<Member> = {
        name: rosterEditFormData.name?.trim(),
        role: rosterEditFormData.role,
        seat_id: rosterEditFormData.seat_id?.trim().toUpperCase(),
        mic_id: rosterEditFormData.mic_id ? rosterEditFormData.mic_id.trim().toUpperCase() : undefined,
        camera_id: rosterEditFormData.camera_id ? rosterEditFormData.camera_id.trim().toUpperCase() : undefined,
        constituency: rosterEditFormData.constituency?.trim(),
        party: rosterEditFormData.party?.trim(),
        allocated_time_seconds: Number(rosterEditFormData.allocated_time_seconds) || 300,
        status: rosterEditFormData.status || "ACTIVE",
        contact_info: rosterEditFormData.contact_info?.trim(),
        department:
          rosterEditFormData.department?.trim() ||
          (rosterEditFormData.role === "Speaker" ? "Speaker's Office" : "None / General Member")
      };

      if (rosterEditFormData.password && rosterEditFormData.password.trim()) {
        updates.password = rosterEditFormData.password.trim();
      }

      const res = await updateMember(selectedRosterMember.member_id, updates);
      await refreshMembers();

      const updated = res.member || { ...selectedRosterMember, ...updates };
      setSelectedRosterMember(updated);
      setRosterModalModeState("view");
      setModalFeedback({ type: "success", message: "Member credentials successfully updated!" });
    } catch (err: any) {
      setModalFeedback({ type: "error", message: err?.message || "Failed to update member credentials." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteRosterMember = async () => {
    if (!selectedRosterMember) return;
    setIsActionLoading(true);
    setModalFeedback(null);
    try {
      await deleteMember(selectedRosterMember.member_id);
      await refreshMembers();
      closeRosterMemberModal();
    } catch (err: any) {
      setModalFeedback({ type: "error", message: err?.message || "Failed to remove member from roster." });
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    isAuthorized,
    members,
    formData,
    isSubmitting,
    showPassword,
    errorMessage,
    createdMember,
    isMemberIdTaken,
    isSeatTaken,
    isMicTaken,
    isCameraTaken,
    isSpeaker,
    idLabel,
    // Roster modal states and handlers
    selectedRosterMember,
    isRosterModalOpen,
    rosterModalMode,
    isConfirmingDelete,
    isActionLoading,
    modalFeedback,
    rosterEditFormData,
    openRosterMemberModal,
    closeRosterMemberModal,
    setRosterModalMode,
    setIsConfirmingDelete,
    updateRosterEditField,
    handleSaveRosterMemberEdit,
    handleDeleteRosterMember,
    togglePasswordVisibility,
    updateField,
    resetForAnother,
    navigateToDashboard,
    navigateToLogin,
    handleSubmit
  };
}

export type RegisterViewModel = ReturnType<typeof useRegisterViewModel>;
