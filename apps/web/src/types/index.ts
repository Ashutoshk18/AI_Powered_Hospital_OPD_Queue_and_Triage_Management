// Shared TypeScript types used across the web app
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PATIENT';
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Doctor {
  id: string;
  userId: string;
  departmentId: string;
  specialization: string;
  isAvailable: boolean;
  avgConsultationMinutes: number;
  user: { name: string; email: string };
  department: { name: string; code: string };
}

export interface Patient {
  id: string;
  userId: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address?: string;
  bloodGroup?: string;
  user: { name: string; email: string };
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: string;
  chiefComplaint?: string;
  priority?: string;
  doctor?: Partial<Doctor>;
  patient?: Partial<Patient>;
}

export interface QueueEntry {
  id: string;
  appointmentId: string;
  tokenNumber: number;
  triageTier: number;
  priorityScore: number;
  status: string;
  checkedInAt: string;
  calledAt?: string;
  completedAt?: string;
  estimatedWaitMinutes?: number;
  positionAhead?: number;
  source?: string;
  appointment?: Partial<Appointment>;
}
