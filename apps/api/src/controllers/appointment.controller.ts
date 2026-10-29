import { Response, NextFunction } from 'express';
import { prisma } from '../app';
import { createAppointmentSchema, cancelAppointmentSchema } from '../validators/appointment.validator';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AppointmentController {
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createAppointmentSchema.parse(req.body);
      const scheduledDate = new Date(validated.scheduledAt);

      // Verify doctor and department exist
      const doctor = await prisma.doctor.findUnique({
        where: { id: validated.doctorId },
      });
      if (!doctor) {
        throw new NotFoundError('Selected doctor does not exist.');
      }

      // If user is a PATIENT, ensure they can only book for themselves
      if (req.user?.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
          where: { id: validated.patientId },
        });
        if (!patient || patient.userId !== req.user.id) {
          throw new ForbiddenError('You can only book appointments for yourself.');
        }
      }

      // Check for double booking within 15 minutes for the same doctor
      const slotStart = new Date(scheduledDate.getTime() - 10 * 60 * 1000);
      const slotEnd = new Date(scheduledDate.getTime() + 10 * 60 * 1000);

      const existingSlot = await prisma.appointment.findFirst({
        where: {
          doctorId: validated.doctorId,
          scheduledAt: { gte: slotStart, lte: slotEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      });

      if (existingSlot) {
        throw new ValidationError('The selected doctor already has a booked appointment near this time slot.');
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId: validated.patientId,
          doctorId: validated.doctorId,
          departmentId: validated.departmentId,
          scheduledAt: scheduledDate,
          reason: validated.reason,
          status: 'SCHEDULED',
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          department: true,
        },
      });

      res.status(201).json({ success: true, appointment });
    } catch (error) {
      next(error);
    }
  }

  public async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, doctorId, departmentId, status, date } = req.query;
      const where: any = {};

      if (patientId) where.patientId = patientId as string;
      if (doctorId) where.doctorId = doctorId as string;
      if (departmentId) where.departmentId = departmentId as string;
      if (status) where.status = status as string;

      if (date) {
        const dayStart = new Date(date as string);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        where.scheduledAt = { gte: dayStart, lt: dayEnd };
      }

      // Patient privacy: Patients only see their own appointments
      if (req.user?.role === 'PATIENT') {
        const patient = await prisma.patient.findFirst({
          where: { userId: req.user.id },
        });
        if (patient) {
          where.patientId = patient.id;
        }
      }

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          doctor: { include: { user: true } },
          department: true,
          queueEntry: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });

      res.status(200).json({ success: true, appointments });
    } catch (error) {
      next(error);
    }
  }

  public async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = cancelAppointmentSchema.parse(req.body);

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { patient: true },
      });

      if (!appointment) {
        throw new NotFoundError('Appointment not found.');
      }

      if (appointment.status === 'COMPLETED' || appointment.status === 'IN_CONSULTATION') {
        throw new ValidationError(`Cannot cancel appointment with status '${appointment.status}'.`);
      }

      // If patient, ensure ownership
      if (req.user?.role === 'PATIENT' && appointment.patient.userId !== req.user.id) {
        throw new ForbiddenError('You can only cancel your own appointments.');
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          reason: appointment.reason ? `${appointment.reason} [Cancelled: ${validated.reason}]` : `Cancelled: ${validated.reason}`,
        },
      });

      res.status(200).json({ success: true, appointment: updated });
    } catch (error) {
      next(error);
    }
  }
}
