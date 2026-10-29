export type Role = 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PATIENT';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface VitalSignsInput {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  oxygenSaturation?: number;
  temperatureCelsius?: number;
  painScore?: number; // 0 - 10
  respiratoryDistress?: boolean;
  alteredMentalState?: boolean;
}

export interface TriageResult {
  tier: number; // 1 to 5
  explanation: string;
  isEmergency: boolean; // Tier 1 trigger
  baseWeight: number;
}

export interface MLPredictionPayload {
  queue_position: number;
  patients_ahead: number;
  active_consultations_count: number;
  department_code: string;
  hour_of_day: number;
  day_of_week: number;
  doctor_experience_years: number;
  urgency_tier: number;
}

export interface MLPredictionResponse {
  predicted_wait_minutes: number;
  confidence_interval: [number, number];
  model_version: string;
  model_name: string;
  source: 'ML_MODEL' | 'FALLBACK_RULE';
  latency_ms: number;
}
