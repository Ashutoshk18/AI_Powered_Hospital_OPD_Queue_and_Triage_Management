const API_BASE = '/api/v1';

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('opd_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => apiRequest<{ success: boolean; user: any }>('/auth/me'),

  // Departments & Doctors
  getDepartments: () => apiRequest<{ success: boolean; departments: any[] }>('/departments'),
  getDoctors: (deptId?: string) =>
    apiRequest<{ success: boolean; doctors: any[] }>(
      deptId ? `/doctors?departmentId=${deptId}` : '/doctors'
    ),
  updateDoctorAvailability: (doctorId: string, isAvailable: boolean) =>
    apiRequest<{ success: boolean; doctor: any }>(`/doctors/${doctorId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),

  // Patients
  registerPatient: (patientData: any) =>
    apiRequest<{ success: boolean; patient: any }>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),
  searchPatients: (query: string) =>
    apiRequest<{ success: boolean; patients: any[] }>(`/patients/search?q=${encodeURIComponent(query)}`),
  getPatientById: (id: string) =>
    apiRequest<{ success: boolean; patient: any }>(`/patients/${id}`),

  // Appointments
  getAppointments: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest<{ success: boolean; appointments: any[] }>(q ? `/appointments?${q}` : '/appointments');
  },
  createAppointment: (apptData: any) =>
    apiRequest<{ success: boolean; appointment: any }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(apptData),
    }),
  cancelAppointment: (id: string, reason: string) =>
    apiRequest<{ success: boolean; appointment: any }>(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // Queue & Triage
  getDepartmentQueue: (deptId: string) =>
    apiRequest<{
      success: boolean;
      department: any;
      inConsultation: any[];
      waitingQueue: any[];
      totalWaiting: number;
    }>(`/queue/department/${deptId}`),

  checkIn: (appointmentId: string, vitals?: any) =>
    apiRequest<{
      success: boolean;
      queueEntry: any;
      triageResult: any;
      prediction: any;
    }>('/queue/check-in', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, vitals }),
    }),

  callNextPatient: (doctorId: string) =>
    apiRequest<{ success: boolean; queueEntry: any }>('/queue/consultation/call-next', {
      method: 'POST',
      body: JSON.stringify({ doctorId }),
    }),

  completeConsultation: (payload: {
    queueEntryId: string;
    clinicalNotes: string;
    diagnosis?: string;
    prescriptionSummary?: string;
    chiefComplaint?: string;
  }) =>
    apiRequest<{ success: boolean; updatedEntry: any; consultationRecord: any }>(
      '/queue/consultation/complete',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  overrideTriage: (queueEntryId: string, newTier: number, reason: string) =>
    apiRequest<{ success: boolean; updatedEntry: any; overrideRecord: any }>(
      `/queue/${queueEntryId}/triage-override`,
      {
        method: 'POST',
        body: JSON.stringify({ newTier, reason }),
      }
    ),

  getMyTokenStatus: () =>
    apiRequest<{ success: boolean; activeToken: any }>('/queue/my-token'),

  // Analytics
  getAnalyticsSummary: () =>
    apiRequest<{ success: boolean; summary: any }>('/analytics/summary'),
  getAuditLogs: () =>
    apiRequest<{ success: boolean; logs: any[] }>('/analytics/audit-logs'),
};
