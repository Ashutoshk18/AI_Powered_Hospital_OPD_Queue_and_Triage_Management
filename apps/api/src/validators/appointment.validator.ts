import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Valid patient UUID required'),
  doctorId: z.string().uuid('Valid doctor UUID required'),
  departmentId: z.string().uuid('Valid department UUID required'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO date string required for scheduledAt',
  }),
  reason: z.string().max(500).optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().min(5, 'Cancellation reason required (minimum 5 characters)'),
});
