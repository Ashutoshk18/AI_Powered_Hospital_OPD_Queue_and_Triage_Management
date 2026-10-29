import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2),
  avgConsultationMinutes: z.number().int().min(5).max(120).default(15),
});

export const updateDoctorAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
