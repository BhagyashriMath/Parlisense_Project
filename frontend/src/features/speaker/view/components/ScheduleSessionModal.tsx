import React, { useState } from 'react';
import { Modal } from '../../../../components/common/Modal';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import { Calendar, Clock, BookOpen, UserCheck, Bell, ShieldCheck } from 'lucide-react';

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: {
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    max_speaking_time_seconds: number;
    agenda?: string;
    description?: string;
  }) => Promise<void>;
  currentTopic?: string;
  isScheduling?: boolean;
}

export const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  currentTopic = "Digital Education & AI Governance Bill 2026",
  isScheduling = false
}) => {
  // Default date: today or tomorrow
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const [title, setTitle] = useState(currentTopic);
  const [sessionDate, setSessionDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("17:00");
  const [speakingLimitMinutes, setSpeakingLimitMinutes] = useState(5);
  const [agenda, setAgenda] = useState(
    "Legislative clause-by-clause consideration, rural laboratory fund allocation, and statutory algorithmic audit guidelines."
  );
  const [notifyMembers, setNotifyMembers] = useState(true);
  const [error, setError] = useState("");

  const formatTimeToAmPm = (t: string) => {
    if (!t) return "10:00 AM";
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${String(formattedHour).padStart(2, "0")}:${m} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please specify the legislative topic or bill title.");
      return;
    }
    if (!sessionDate) {
      setError("Please select the sitting date.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Please set both the sitting start and adjournment times.");
      return;
    }

    setError("");
    try {
      await onSchedule({
        title: title.trim(),
        session_date: sessionDate,
        start_time: formatTimeToAmPm(startTime),
        end_time: formatTimeToAmPm(endTime),
        max_speaking_time_seconds: speakingLimitMinutes * 60,
        agenda: agenda.trim(),
        description: agenda.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to schedule session.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5 text-amber-400">
          <Calendar className="w-5 h-5" />
          <span>Schedule Parliamentary Sitting</span>
        </div>
      }
      subtitle="Presiding Officer Session Planning & Member Chamber Notification"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50/40 border border-rose-800 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Presiding Authority Note */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-gray-700">
              Authority: <strong className="text-gray-900">Hon. Speaker</strong> • Session state will be updated to <span className="text-amber-400 font-mono font-bold">SCHEDULED</span>.
            </span>
          </div>
          <Badge variant="warning" size="sm" className="font-mono flex-shrink-0">
            PRESIDING ACTION
          </Badge>
        </div>

        {/* Legislative Bill / Topic */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Legislative Topic / Bill for Deliberation *</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Digital Education & AI Governance Bill 2026"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Date and Timings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sitting Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Sitting Date *</span>
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              min={todayStr}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Start Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Call to Order Time *</span>
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Adjournment Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>Scheduled Adjournment *</span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Floor Limit & Notice Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Speaking Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Floor Speaking Cap per Member</span>
            </label>
            <select
              value={speakingLimitMinutes}
              onChange={(e) => setSpeakingLimitMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
            >
              <option value={3}>3 Minutes (Short Interventions)</option>
              <option value={5}>5 Minutes (Standard Debate Cap)</option>
              <option value={8}>8 Minutes (Major Bill Speeches)</option>
              <option value={10}>10 Minutes (Ministerial Statements)</option>
            </select>
          </div>

          {/* Notification Checkbox */}
          <div className="flex items-center gap-2 pt-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyMembers}
                onChange={(e) => setNotifyMembers(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-white border-gray-300 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs text-gray-800">
                <span className="font-semibold flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-400 inline" /> Notify all Members
                </span>
                <p className="text-[10px] text-gray-500">Broadcasts instant sitting notice to member terminals</p>
              </div>
            </label>
          </div>
        </div>

        {/* Order of Business Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Order of Business / Legislative Notes
          </label>
          <textarea
            rows={2}
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Brief summary of motions, clause voting, or special debate instructions..."
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            size="sm"
            disabled={isScheduling}
            isLoading={isScheduling}
            icon={<Calendar className="w-3.5 h-3.5" />}
          >
            {isScheduling ? "Publishing Schedule..." : "Schedule Session & Notify Members"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
