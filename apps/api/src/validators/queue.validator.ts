import { z } from 'zod';

export const checkInSchema = z.object({
  appointmentId: z.string().uuid('Valid appointment UUID required'),
  vitals: z
    .object({
      systolicBP: z.number().min(50).max(300).optional(),
      diastolicBP: z.number().min(30).max(200).optional(),
      heartRate: z.number().min(30).max(250).optional(),
      oxygenSaturation: z.number().min(50).max(100).optional(),
      temperatureCelsius: z.number().min(30).max(45).optional(),
      painScore: z.number().int().min(0).max(10).default(0),
      respiratoryDistress: z.boolean().default(false),
      alteredMentalState: z.boolean().default(false),
    })
    .optional(),
});

export const callNextPatientSchema = z.object({
  doctorId: z.string().uuid('Valid doctor UUID required'),
});

export const completeConsultationSchema = z.object({
  queueEntryId: z.string().uuid('Valid queue entry UUID required'),
  chiefComplaint: z.string().optional(),
  clinicalNotes: z.string().min(5, 'Clinical notes required (min 5 characters)'),
  diagnosis: z.string().optional(),
  prescriptionSummary: z.string().optional(),
});

export const triageOverrideSchema = z.object({
  newTier: z.number().int().min(1).max(5),
  reason: z.string().min(10, 'Override reason must contain at least 10 characters detailing clinical rationale'),
});
