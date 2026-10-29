import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../app';
import { createPatientSchema } from '../validators/patient.validator';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class PatientController {
  public async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createPatientSchema.parse(req.body);

      // Check duplicate phone
      const existingPhone = await prisma.patient.findFirst({
        where: { phone: validated.phone },
      });
      if (existingPhone) {
        throw new ConflictError(`Patient with phone ${validated.phone} already registered (MRN: ${existingPhone.medicalRecordNumber}).`);
      }

      // Generate sequential MRN
      const count = await prisma.patient.count();
      const currentYear = new Date().getFullYear();
      const mrn = `MRN-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      let userId: string | undefined = undefined;

      // Optionally create associated User account for patient portal
      if (validated.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: validated.email.toLowerCase() },
        });
        if (existingEmail) {
          throw new ConflictError(`User account with email ${validated.email} already exists.`);
        }

        const password = validated.password || 'Patient123!';
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
          data: {
            email: validated.email.toLowerCase(),
            fullName: validated.fullName,
            passwordHash,
            role: 'PATIENT',
          },
        });
        userId = newUser.id;
      }

      const patient = await prisma.patient.create({
        data: {
          userId,
          medicalRecordNumber: mrn,
          fullName: validated.fullName,
          gender: validated.gender,
          dateOfBirth: new Date(validated.dateOfBirth),
          phone: validated.phone,
          bloodGroup: validated.bloodGroup,
          emergencyContact: validated.emergencyContact,
        },
      });

      res.status(201).json({ success: true, patient });
    } catch (error) {
      next(error);
    }
  }

  public async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        res.status(200).json({ success: true, patients: [] });
        return;
      }

      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { medicalRecordNumber: { contains: query } },
            { phone: { contains: query } },
            { fullName: { contains: query } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, patients });
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          appointments: {
            include: {
              department: true,
              doctor: { include: { user: true } },
              queueEntry: true,
            },
            orderBy: { scheduledAt: 'desc' },
          },
        },
      });

      if (!patient) {
        throw new NotFoundError('Patient not found.');
      }

      // Privacy guard: PATIENT role can only view their own record
      if (req.user?.role === 'PATIENT' && patient.userId !== req.user.id) {
        throw new ForbiddenError('Access denied: You cannot view other patients records.');
      }

      res.status(200).json({ success: true, patient });
    } catch (error) {
      next(error);
    }
  }
}
