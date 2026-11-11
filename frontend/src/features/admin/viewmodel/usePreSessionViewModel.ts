import React, { useState, useEffect, useCallback } from "react";
import {
  SessionConfig,
  PreSessionCheckResult,
  Member,
  AgendaTopic
} from "../../../shared/types";
import {
  fetchSessionConfig,
  updateSessionConfig,
  createMember,
  updateMember,
  deleteMember,
  assignSeat,
  assignMic,
  addOrUpdateTopic,
  deleteTopic
} from "../../../infrastructure/api/api";
import { deriveHardwareIdsFromSeatId } from "../../registration/model/registration.model";

export type PreSessionSubTab = "details" | "topics" | "members" | "seats_mics" | "timings" | "rules" | "readiness";

export function usePreSessionViewModel(
  onSessionStarted: () => void,
  members: Member[],
  onRefreshMembers: () => void
) {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [readiness, setReadiness] = useState<PreSessionCheckResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<PreSessionSubTab>("details");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  // Rules & Decorum State
  const [ruleSeverityFilter, setRuleSeverityFilter] = useState<string>("ALL");
  const [activeRulePreset, setActiveRulePreset] = useState<"standard" | "strict" | "relaxed">("standard");

  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);

  // Topic Modal State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<AgendaTopic> | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchSessionConfig();
      setConfig(res.config);
      setReadiness(res.readiness);
    } catch (err) {
      console.error("Failed to load session config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveGeneralConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await updateSessionConfig(config);
      setSaveSuccessMessage("Configuration saved successfully!");
      setTimeout(() => setSaveSuccessMessage(""), 3000);
      await loadConfig();
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartSession = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await updateSessionConfig({ status: "LIVE", is_locked: true });
      onSessionStarted();
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name) return;

    try {
      if (editingMember.member_id && members.some((m) => m.member_id === editingMember.member_id)) {
        await updateMember(editingMember.member_id, editingMember);
      } else {
        await createMember(editingMember);
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
      onRefreshMembers();
      await loadConfig();
    } catch (err) {
      console.error("Error saving member:", err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm(`Are you sure you want to remove Member ${id}?`)) return;
    try {
      await deleteMember(id);
      onRefreshMembers();
      await loadConfig();
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editingTopic.title) return;

    try {
      await addOrUpdateTopic(editingTopic as AgendaTopic);
      setIsTopicModalOpen(false);
      setEditingTopic(null);
      await loadConfig();
    } catch (err) {
      console.error("Error saving topic:", err);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm(`Delete topic ${topicId}?`)) return;
    try {
      await deleteTopic(topicId);
      await loadConfig();
    } catch (err) {
      console.error("Error deleting topic:", err);
    }
  };

  const handleSeatAssignment = async (memberId: string, seatId: string) => {
    const derived = deriveHardwareIdsFromSeatId(seatId);
    await assignSeat(memberId, seatId);
    await assignMic(memberId, derived.micId);
    onRefreshMembers();
  };

  const handleMicAssignment = async (memberId: string, micId: string) => {
    await assignMic(memberId, micId);
    onRefreshMembers();
  };

  const applyRulePreset = (preset: "standard" | "strict" | "relaxed") => {
    if (!config) return;
    setActiveRulePreset(preset);
    if (preset === "standard") {
      setConfig({
        ...config,
        rules: {
          ...config.rules,
          noise_threshold_db: 78,
          agenda_relevance_threshold: 45,
          multiple_speaker_threshold_ms: 500,
          seat_compliance_enabled: true,
          offensive_language_detection: true,
          movement_rules_enabled: true,
          rules_list: config.rules.rules_list.map((r) => ({ ...r, enabled: true }))
        }
      });
    } else if (preset === "strict") {
      setConfig({
        ...config,
        rules: {
          ...config.rules,
          noise_threshold_db: 70,
          agenda_relevance_threshold: 60,
          multiple_speaker_threshold_ms: 350,
          seat_compliance_enabled: true,
          offensive_language_detection: true,
          movement_rules_enabled: true,
          rules_list: config.rules.rules_list.map((r) => ({ ...r, enabled: true }))
        }
      });
    } else if (preset === "relaxed") {
      setConfig({
        ...config,
        rules: {
          ...config.rules,
          noise_threshold_db: 85,
          agenda_relevance_threshold: 35,
          multiple_speaker_threshold_ms: 800,
          seat_compliance_enabled: true,
          offensive_language_detection: true,
          movement_rules_enabled: false,
          rules_list: config.rules.rules_list.map((r) => ({ ...r, enabled: r.severity !== "LOW" }))
        }
      });
    }
  };

  return {
    config,
    setConfig,
    readiness,
    activeSubTab,
    setActiveSubTab,
    isLoading,
    isSaving,
    saveSuccessMessage,
    ruleSeverityFilter,
    setRuleSeverityFilter,
    activeRulePreset,
    applyRulePreset,
    isMemberModalOpen,
    setIsMemberModalOpen,
    editingMember,
    setEditingMember,
    isTopicModalOpen,
    setIsTopicModalOpen,
    editingTopic,
    setEditingTopic,
    loadConfig,
    handleSaveGeneralConfig,
    handleStartSession,
    handleSaveMember,
    handleDeleteMember,
    handleSaveTopic,
    handleDeleteTopic,
    handleSeatAssignment,
    handleMicAssignment
  };
}

export type PreSessionViewModel = ReturnType<typeof usePreSessionViewModel>;
