import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT']).default('PATIENT'),
});
