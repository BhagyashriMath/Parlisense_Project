export interface Member {
  member_id: string;
  name: string;
  seat_id: string;
  mic_id?: string;
  camera_id?: string;
  constituency?: string;
  party?: string;
  role?: string;
  avatar?: string;
  allocated_time_seconds: number;
  historical_score?: number;
  warnings_count?: number;
  violations_count?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contact_info?: string;
  password?: string;
  department?: string;
}

export interface UserSession {
  role: "admin" | "speaker" | "member";
  memberId?: string;
  memberName?: string;
  seatId?: string;
  loginTime: string;
}

export interface SeatInfo {
  seatId: string;
  occupied: boolean;
  status: string;
  movementStatus: string;
  x: number;
  y: number;
  is_active_speaker?: boolean;
}

export interface TranscriptItem {
  id: string;
  time?: string;
  timestamp?: string;
  speakerId?: string;
  speakerName?: string;
  member_id?: string;
  name?: string;
  seatId?: string;
  seat_id?: string;
  text: string;
  emotion?: string;
  relevance?: number;
}

export interface AlertItem {
  alert_id: string;
  timestamp: string;
  rule_id: string;
  member_id: string;
  seat_id: string;
  member_name: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  member_audio_message?: string;
  source_module: string;
  confidence?: number;
  status: "ACTIVE" | "ACKNOWLEDGED";
}

export interface EmergencyExitRequest {
  id: string;
  session_id?: string;
  member_id: string;
  member_name: string;
  seat_id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED" | "EXPIRED";
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface AIOutput {
  timestamp: string;
  session_id: string;
  member_id: string;
  seat_id: string;
  member_name: string;
  transcript: string;
  speaking_time: number;
  allocated_time: number;
  agenda_relevance: number;
  agenda_relevance_percentage: number;
  agenda_status: string;
  matched_agenda_keywords: string[];
  emotion: string;
  emotion_confidence: number;
  offensive: boolean;
  flagged_words: string[];
  noise_level: number;
  noise_category: string;
  multiple_speakers: boolean;
  disruption_level: string;
  seat_status: string;
  movement_status: string;
  emergency: boolean;
}

export interface SessionTimingConfig {
  session_start_time: string;
  session_end_time: string;
  max_speaking_time_seconds: number;
  warning_time_seconds: number;
  break_periods: string;
  total_expected_duration: string;
}

export interface RuleConfigItem {
  id: string;
  name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  penalty_points: number;
  enabled: boolean;
}

export interface SessionRulesConfig {
  max_speaking_time_seconds: number;
  warning_time_seconds: number;
  noise_threshold_db: number;
  agenda_relevance_threshold: number;
  multiple_speaker_threshold_ms: number;
  seat_compliance_enabled: boolean;
  offensive_language_detection: boolean;
  movement_rules_enabled: boolean;
  rules_list: RuleConfigItem[];
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

export interface SessionConfig {
  session_id: string;
  session_date: string;
  start_time: string;
  scheduled_end_time: string;
  session_type: string;
  house_chamber: string;
  current_topic: string;
  topics: AgendaTopic[];
  timings: SessionTimingConfig;
  rules: SessionRulesConfig;
  status: "CONFIGURING" | "SCHEDULED" | "LIVE" | "ENDED";
  is_locked: boolean;
}

export interface PreSessionCheckResult {
  is_ready: boolean;
  checks: {
    members_configured: boolean;
    seats_assigned: boolean;
    mics_assigned: boolean;
    cameras_assigned?: boolean;
    agenda_configured: boolean;
    timing_configured: boolean;
    rules_loaded: boolean;
    mic_connected: boolean;
    camera_connected: boolean;
    ai_engine_ready: boolean;
    database_connected: boolean;
  };
  missing_items: string[];
}

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
  score_points?: {
    successful_speech_points: number;
    warning_deductions: number;
    violation_deductions: number;
    total: number;
  };
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
  presence: "Present" | "Absent" | "Displaced" | "Suspended";
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

export interface NationalDevelopmentSummary {
  session_title: string;
  brief_summary: string;
  has_relevant_content?: boolean;
  relevant_transcript_count?: number;
  total_transcript_count?: number;
  key_topics: Array<{
    title: string;
    description: string;
    relevance_score: number;
    speeches_count?: number;
  }>;
  /** Discussions organized by agenda topic — only relevant speech included */
  agenda_topic_discussions?: Array<{
    topic_id: string;
    topic_title: string;
    sentences: Array<{ text: string; speaker: string; relevance: number }>;
  }>;
  transformative_ideas: Array<{
    id: string;
    idea: string;
    member_name: string;
    party?: string;
    impact_area: string;
    national_benefit: string;
  }>;
  policy_suggestions: Array<{
    id: string;
    suggestion: string;
    member_name: string;
    focus: string;
    development_potential: "High" | "Transformative" | "Crucial" | string;
  }>;
  key_keywords: Array<{
    word: string;
    category: string;
    significance: string;
  }>;
  last_updated: string;
}

export interface SpeakingRequest {
  member_id: string;
  seat_id: string;
  name: string;
  requested_at: number;
}

export interface SessionTelemetry {
  server_timestamp_ms?: number;
  member_speaking_seconds?: Record<string, number>;
  session_id: string;
  is_active: boolean;
  is_paused?: boolean;
  session_status?: "LIVE" | "PAUSED" | "STOPPED";
  mode: "LIVE" | "DEMO";
  session_duration_seconds: number;
  session_duration_formatted: string;
  current_bill: string;
  active_speaker: Member;
  emergency_requests?: EmergencyExitRequest[];
  speaking_requests?: SpeakingRequest[];
  speaking_duration_seconds: number;
  ai_output: AIOutput;
  chamber_status: "NORMAL_ORDER" | "TIMER_ADVISORY" | "DECORUM_ADVISORY" | "DISRUPTIVE_ALERT" | "CRITICAL_ACTION_REQUIRED";
  vision_telemetry: {
    total_persons_detected: number;
    total_seats_monitored: number;
    occupancy_rate: number;
    seat_status: Record<string, SeatInfo>;
    has_movement_violation: boolean;
  };
  recent_alerts: AlertItem[];
  suspension_recommendations?: Array<{ alert_id: string; member_id: string; member_name: string; seat_id: string; title: string }>;
  recent_transcripts: TranscriptItem[];
  national_development_summary?: NationalDevelopmentSummary;
  scheduled_session?: {
    session_id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    max_speaking_time_seconds?: number;
    status: string;
    is_locked?: boolean;
  };
  upcoming_notifications?: any[];
  ai_modules_health: Record<string, string>;
  speaker_mic_active?: boolean;
  previous_speaker_id?: string;
}

export interface SessionReport {
  report_id: string;
  generated_at: string;
  session_information: {
    session_id: string;
    date: string;
    start_time: string;
    end_time: string;
    duration: string;
    agenda_bill: string;
    presiding_officer: string;
  };
  session_statistics: {
    total_members_registered: number;
    total_members_present: number;
    total_active_speakers: number;
    total_speaking_time_minutes: number;
    total_alerts_issued: number;
    critical_violations: number;
    high_severity_alerts: number;
    off_topic_incidents: number;
    offensive_language_incidents: number;
    unauthorized_movement_incidents: number;
    emergency_activations: number;
    average_ambient_noise_db: number | null;
    peak_noise_recorded_db: number | null;
  };
  ai_analytics_summary: {
    average_agenda_relevance_percentage: number;
    emotion_distribution: Record<string, number>;
    decorum_compliance_index: number;
    chamber_order_rating: string;
  };
  rule_violations_log: AlertItem[];
  member_scorecards: MemberScorecard[];
  disclaimer: string;
}

export interface CompleteSessionSummary {
  session_information: {
    session_id: string;
    date: string;
    start_time: string;
    end_time: string;
    total_duration: string;
    session_type: string;
    house_chamber: string;
    number_of_members: number;
    number_of_topics: number;
  };
  session_activity: {
    total_speeches: number;
    total_speaking_time_formatted: string;
    total_speaking_time_seconds: number;
    average_speaking_time_formatted: string;
    number_of_active_members: number;
    number_of_members_present: number;
  };
  violation_summary: {
    total_violations: number;
    low_violations: number;
    medium_violations: number;
    high_violations: number;
    critical_violations: number;
    types_breakdown: Record<string, number>;
  };
  main_keywords_summary?: MainKeywordsSummary;
  topic_wise_summary: AgendaTopic[];
  member_wise_summary: MemberSessionSummary[];
  member_scorecards: MemberScorecard[];
  timeline: TimelineEvent[];
  generated_at: string;
}
