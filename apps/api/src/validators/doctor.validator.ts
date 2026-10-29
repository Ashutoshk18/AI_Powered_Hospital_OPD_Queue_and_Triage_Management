import { z } from 'zod';

export const updateDoctorAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
