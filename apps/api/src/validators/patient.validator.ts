import { z } from 'zod';

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid date required (YYYY-MM-DD)',
  }),
  phone: z.string().min(7, 'Valid phone number required'),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});
