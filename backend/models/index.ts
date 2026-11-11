export interface MemberEntity {
  member_id: string;
  name: string;
  seat_id: string;
  camera_id: string;
  mic_id: string;
  allocated_time_seconds: number;
  status: "ACTIVE" | "SUSPENDED" | "ABSENT" | "INACTIVE";
  constituency?: string;
  party?: string;
  role?: string;
  department?: string;
  contact_info?: string;
  avatar?: string;
  password?: string;
  password_hash?: string;
  historical_score?: number;
  warnings_count?: number;
  violations_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserEntity {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "speaker" | "member";
  display_name?: string;
  member_id?: string;
  created_at?: string;
}

export interface SessionEntity {
  session_id: string;
  title?: string;
  agenda?: string;
  session_date: string;
  status: "CONFIGURING" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED";
  start_time?: string;
  scheduled_end_time?: string;
  started_at?: string;
  ended_at?: string;
  created_at?: string;
}

export interface TopicEntity {
  topic_id: string;
  session_id?: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  priority?: "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT";
  speeches_count?: number;
  avg_relevance?: number;
  violations_count?: number;
  created_at?: string;
}

export interface SessionTopic extends TopicEntity {}

export interface SessionConfig {
  session_id: string;
  session_date: string;
  start_time: string;
  scheduled_end_time: string;
  session_type: string;
  house_chamber: string;
  current_topic: string;
  topics: SessionTopic[];
  timings: {
    session_start_time: string;
    session_end_time: string;
    max_speaking_time_seconds: number;
    warning_time_seconds: number;
    break_periods: string;
    total_expected_duration: string;
  };
  rules: {
    max_speaking_time_seconds: number;
    warning_time_seconds: number;
    noise_threshold_db: number;
    agenda_relevance_threshold: number;
    multiple_speaker_threshold_ms: number;
    seat_compliance_enabled: boolean;
    offensive_language_detection: boolean;
    movement_rules_enabled: boolean;
    rules_list: Array<{
      id: string;
      name: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      penalty_points: number;
      enabled: boolean;
    }>;
  };
  status: "CONFIGURING" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED";
  is_locked: boolean;
}

export interface SessionTimelineEvent {
  id: string;
  timestamp: string;
  time_formatted: string;
  title: string;
  description: string;
  type: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  member_id?: string;
}

export interface AlertEntity {
  alert_id: string;
  session_id: string;
  member_id: string;
  seat_id?: string;
  member_name?: string;
  rule_id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  alert_level?: number;
  title: string;
  description: string;
  member_audio_message?: string;
  suspension_recommended?: boolean;
  suspension_evidence?: any;
  source_module: string;
  status: "ACTIVE" | "ACKNOWLEDGED";
  confidence?: number;
  created_at?: string;
}

export interface TranscriptEntity {
  id: string;
  session_id: string;
  member_id: string;
  seat_id?: string;
  speakerName?: string;
  text: string;
  confidence?: number;
  emotion?: string;
  relevance?: number;
  created_at?: string;
}

export interface EmergencyRequestEntity {
  id: string;
  session_id: string;
  member_id: string;
  member_name?: string;
  seat_id?: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "REJECTED";
  requested_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface SuspensionEntity {
  id: string;
  session_id: string;
  member_id: string;
  reason: string;
  duration_days: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  requested_at: string;
  decided_at?: string;
  confirmed_by?: string;
}

export interface NotificationEntity {
  id: string;
  session_id: string;
  member_id: string;
  type: string;
  alert_level: number;
  title: string;
  member_audio_message?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_read: boolean;
  created_at: string;
}
