export interface PositiveMarksBreakdown {
  agenda_relevance_points: number;
  constructive_proposals_points: number;
  foundational_discussion_points: number;
  decorum_conduct_bonus: number;
  total_positive_marks: number;
}

export interface NegativeMarksBreakdown {
  speaking_time_overage_deduction: number;
  off_topic_speech_deduction: number;
  interruptions_cross_talk_deduction: number;
  disruptive_movement_deduction: number;
  offensive_language_deduction: number;
  excessive_noise_deduction: number;
  rule_violations_deduction: number;
  total_negative_deductions: number;
}

export interface MemberKeywordNote {
  term: string;
  explanation_note: string;
}

export interface MemberSessionSpeechSummary {
  subject_title?: string;
  discussion_summary: string;
  subject_notes_points: string[];
  major_ideas_raised: string[];
  policy_keywords: string[];
  keyword_notes?: MemberKeywordNote[];
}

export interface MemberScorecard {
  member_id: string;
  name: string;
  seat_id: string;
  mic_id?: string;
  role?: string;
  party?: string;
  overall_score: number;
  grade: string;
  positive_marks: PositiveMarksBreakdown;
  negative_deductions: NegativeMarksBreakdown;
  member_summary: MemberSessionSpeechSummary;
  categories: {
    participation: number;
    agenda_relevance: number;
    speaking_discipline: number;
    seat_compliance: number;
    decorum_discipline: number;
  };
  statistics: {
    speaking_time_seconds: number;
    allocated_time_seconds: number;
    speaking_turns: number;
    time_violations: number;
    seat_violations: number;
    offensive_incidents: number;
    interruptions: number;
  };
  disclaimer?: string;
}

export interface AgendaTopic {
  topic_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  speeches_count?: number;
  avg_relevance?: number;
  violations_count?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  time_formatted: string;
  title: string;
  description: string;
  type: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  member_id?: string;
}

export interface MemberSessionSummary {
  member_id: string;
  name: string;
  seat_id: string;
  mic_id: string;
  role?: string;
  party?: string;
  presence: "Present" | "Absent" | "Displaced";
  speaking_time_formatted: string;
  speaking_time_seconds: number;
  speeches_count: number;
  agenda_relevance_pct: number;
  violations_count: number;
  warnings_count: number;
  seat_compliance_pct: number;
  behavior_emotion: string;
  positive_marks: PositiveMarksBreakdown;
  negative_deductions: NegativeMarksBreakdown;
  member_summary: MemberSessionSpeechSummary;
  speaking_score: number;
  agenda_score: number;
  discipline_score: number;
  seat_score: number;
  violations_score: number;
  final_score: number;
  grade: string;
}

export interface ChamberKeywordItem {
  keyword: string;
  category: string;
  frequency: number;
  relevance_percentage: number;
  members_mentioned: string[];
  sample_context?: string;
}

export interface MainKeywordsSummary {
  total_keywords_extracted: number;
  primary_thematic_areas: Array<{
    theme: string;
    keyword_count: number;
    prominence_score: number;
    description: string;
  }>;
  keyword_cloud: ChamberKeywordItem[];
  high_frequency_keywords: ChamberKeywordItem[];
  actionable_policy_takeaways: string[];
}

// -------------------------------------------------------------
// Pure Domain Helper Functions
// -------------------------------------------------------------
export function getGradeBadgeStyle(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (grade.startsWith("B")) return "bg-sky-500/20 text-sky-400 border-sky-500/40";
  if (grade.startsWith("C")) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-rose-500/20 text-rose-400 border-rose-500/40";
}
