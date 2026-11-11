import React from 'react';
import { Member } from '../../../shared/types';
import { usePreSessionViewModel } from '../viewmodel/usePreSessionViewModel';
import { Tabs, TabItem } from '../../../components/common/Tabs';
import { Button } from '../../../components/common/Button';
import { LoadingState } from '../../../components/common/FeedbackStates';
import { SessionDetailsTab } from './presession/SessionDetailsTab';
import { AgendaTopicsTab } from './presession/AgendaTopicsTab';
import { MemberRosterTab } from './presession/MemberRosterTab';
import { SeatMicMatrixTab } from './presession/SeatMicMatrixTab';
import { FloorTimingsTab } from './presession/FloorTimingsTab';
import { RulesDecorumTab } from './presession/RulesDecorumTab';
import { SystemReadinessTab } from './presession/SystemReadinessTab';
import { MemberEditModal } from './presession/MemberEditModal';
import { TopicEditModal } from './presession/TopicEditModal';
import { generateNextMemberIdentifiers } from '../../registration/model/registration.model';
import {
  BookOpen,
  Calendar,
  Users,
  Mic,
  Clock,
  Sliders,
  ShieldAlert,
  Save,
  Check
} from 'lucide-react';

interface PreSessionConfigProps {
  onSessionStarted: () => void;
  members: Member[];
  onRefreshMembers: () => void;
}

export function PreSessionConfig({
  onSessionStarted,
  members,
  onRefreshMembers
}: PreSessionConfigProps) {
  const vm = usePreSessionViewModel(onSessionStarted, members, onRefreshMembers);

  if (vm.isLoading || !vm.config) {
    return <LoadingState message="Loading Parliamentary Pre-Session Configuration..." />;
  }

  const tabs: TabItem[] = [
    { id: "details", label: "Session Details", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "topics", label: "Agenda & Topics", icon: <Calendar className="w-3.5 h-3.5" />, badge: vm.config.topics.length },
    { id: "members", label: "Member Roster", icon: <Users className="w-3.5 h-3.5" />, badge: members.length },
    { id: "seats_mics", label: "Seat & Mic Matrix", icon: <Mic className="w-3.5 h-3.5" /> },
    { id: "timings", label: "Floor Timings", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "rules", label: "Rules & Decorum", icon: <Sliders className="w-3.5 h-3.5" /> },
    {
      id: "readiness",
      label: "System Readiness",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      badge: vm.readiness?.is_ready ? "READY" : "CHECK"
    }
  ];

  return (
    <div id="pre-session-config-view" className="h-full flex flex-col gap-2 min-h-0 overflow-hidden text-gray-800">
      {/* Top Pre-Session Navigation Header */}
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center justify-between flex-shrink-0">
        <Tabs
          tabs={tabs}
          activeTab={vm.activeSubTab}
          onChange={(id) => vm.setActiveSubTab(id as any)}
          className="border-b-0"
        />

        <div className="flex items-center gap-2 pr-1 flex-shrink-0">
          {vm.saveSuccessMessage && (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {vm.saveSuccessMessage}
            </span>
          )}
          <Button
            id="admin-save-config-btn"
            variant="secondary"
            size="sm"
            onClick={vm.handleSaveGeneralConfig}
            isLoading={vm.isSaving}
            icon={<Save className="w-3.5 h-3.5 text-amber-400" />}
          >
            Save Draft
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto">
        {vm.activeSubTab === "details" && (
          <SessionDetailsTab config={vm.config} onChange={vm.setConfig} />
        )}

        {vm.activeSubTab === "topics" && (
          <AgendaTopicsTab
            topics={vm.config.topics}
            onAddTopic={() => {
              vm.setEditingTopic({
                topic_id: `TOPIC-${String((vm.config?.topics.length || 0) + 1).padStart(2, "0")}`,
                title: "",
                description: "",
                start_time: "11:00 AM",
                end_time: "12:00 PM",
                priority: "HIGH"
              });
              vm.setIsTopicModalOpen(true);
            }}
            onEditTopic={(topic) => {
              vm.setEditingTopic(topic);
              vm.setIsTopicModalOpen(true);
            }}
            onDeleteTopic={vm.handleDeleteTopic}
          />
        )}

        {vm.activeSubTab === "members" && (
          <MemberRosterTab
            members={members}
            onAddMember={() => {
              const suggested = generateNextMemberIdentifiers(members, "Member");
              vm.setEditingMember({
                member_id: suggested.suggestedMemberId,
                name: "",
                seat_id: suggested.suggestedSeatId,
                mic_id: suggested.suggestedMicId,
                camera_id: suggested.suggestedCameraId,
                constituency: "",
                party: "",
                role: "Member of Parliament",
                allocated_time_seconds: 300,
                status: "ACTIVE"
              });
              vm.setIsMemberModalOpen(true);
            }}
            onEditMember={(member) => {
              vm.setEditingMember(member);
              vm.setIsMemberModalOpen(true);
            }}
            onDeleteMember={vm.handleDeleteMember}
          />
        )}

        {vm.activeSubTab === "seats_mics" && (
          <SeatMicMatrixTab
            members={members}
            onSeatChange={vm.handleSeatAssignment}
            onMicChange={vm.handleMicAssignment}
          />
        )}

        {vm.activeSubTab === "timings" && (
          <FloorTimingsTab config={vm.config} onChange={vm.setConfig} />
        )}

        {vm.activeSubTab === "rules" && (
          <RulesDecorumTab
            config={vm.config}
            activeRulePreset={vm.activeRulePreset}
            onApplyPreset={vm.applyRulePreset}
            onChange={vm.setConfig}
          />
        )}

        {vm.activeSubTab === "readiness" && (
          <SystemReadinessTab
            readiness={vm.readiness}
            isSaving={vm.isSaving}
          />
        )}
      </div>

      {/* Member Edit / Create Modal */}
      <MemberEditModal
        isOpen={vm.isMemberModalOpen}
        member={vm.editingMember}
        members={members}
        onClose={() => {
          vm.setIsMemberModalOpen(false);
          vm.setEditingMember(null);
        }}
        onSave={vm.handleSaveMember}
        onChange={vm.setEditingMember}
      />

      {/* Topic Edit / Create Modal */}
      <TopicEditModal
        isOpen={vm.isTopicModalOpen}
        topic={vm.editingTopic}
        onClose={() => {
          vm.setIsTopicModalOpen(false);
          vm.setEditingTopic(null);
        }}
        onSave={vm.handleSaveTopic}
        onChange={vm.setEditingTopic}
      />
    </div>
  );
}
