import { Response, NextFunction } from 'express';
import { QueueService } from '../services/queue.service';
import {
  checkInSchema,
  callNextPatientSchema,
  completeConsultationSchema,
  triageOverrideSchema,
} from '../validators/queue.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../app';

const queueService = new QueueService();

export class QueueController {
  public async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = checkInSchema.parse(req.body);
      const result = await queueService.checkIn(
        validated.appointmentId,
        validated.vitals,
        req.user?.id
      );
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public async getDepartmentQueue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.params.departmentId as string;
      const data = await queueService.getDepartmentQueue(departmentId);
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }

  public async callNext(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = callNextPatientSchema.parse(req.body);
      const entry = await queueService.callNextPatient(validated.doctorId, req.user!.id);
      res.status(200).json({ success: true, queueEntry: entry });
    } catch (error) {
      next(error);
    }
  }

  public async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = completeConsultationSchema.parse(req.body);
      const doctor = await prisma.doctor.findFirst({
        where: { userId: req.user!.id },
      });
      const doctorId = doctor ? doctor.id : '';

      const result = await queueService.completeConsultation(
        validated.queueEntryId,
        {
          chiefComplaint: validated.chiefComplaint,
          clinicalNotes: validated.clinicalNotes,
          diagnosis: validated.diagnosis,
          prescriptionSummary: validated.prescriptionSummary,
        },
        doctorId,
        req.user!.id
      );

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public async overrideTriage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = triageOverrideSchema.parse(req.body);
      const result = await queueService.overrideTriage(
        id,
        validated.newTier,
        validated.reason,
        req.user!.id
      );
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public async getMyTokenStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await prisma.patient.findFirst({
        where: { userId: req.user!.id },
      });

      if (!patient) {
        res.status(200).json({ success: true, activeToken: null });
        return;
      }

      const activeEntry = await prisma.queueEntry.findFirst({
        where: {
          appointment: { patientId: patient.id },
          status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
        },
        include: {
          department: true,
          doctor: { include: { user: true } },
          triageAssessment: true,
        },
        orderBy: { checkInTime: 'desc' },
      });

      if (!activeEntry) {
        res.status(200).json({ success: true, activeToken: null });
        return;
      }

      // Compute how many patients ahead
      const patientsAhead = await prisma.queueEntry.count({
        where: {
          departmentId: activeEntry.departmentId,
          status: 'WAITING',
          dynamicPriorityScore: { gt: activeEntry.dynamicPriorityScore },
        },
      });

      res.status(200).json({
        success: true,
        activeToken: {
          ...activeEntry,
          patientsAhead,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
