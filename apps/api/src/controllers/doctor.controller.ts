import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { updateDoctorAvailabilitySchema } from '../validators/doctor.validator';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DoctorController {
  public async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, available } = req.query;
      const where: any = {};

      if (departmentId) {
        where.departmentId = departmentId as string;
      }
      if (available !== undefined) {
        where.isAvailable = available === 'true';
      }

      const doctors = await prisma.doctor.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true, isActive: true },
          },
          department: true,
        },
        orderBy: { experienceYears: 'desc' },
      });

      res.status(200).json({ success: true, doctors });
    } catch (error) {
      next(error);
    }
  }

  public async updateAvailability(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const validated = updateDoctorAvailabilitySchema.parse(req.body);

      const doctor = await prisma.doctor.findUnique({
        where: { id },
      });

      if (!doctor) {
        throw new NotFoundError('Doctor record not found.');
      }

      // Authorization guard: Admin or the doctor themselves
      if (req.user?.role === 'DOCTOR' && doctor.userId !== req.user.id) {
        throw new ForbiddenError('You can only update your own availability.');
      }

      const updated = await prisma.doctor.update({
        where: { id },
        data: { isAvailable: validated.isAvailable },
      });

      res.status(200).json({ success: true, doctor: updated });
    } catch (error) {
      next(error);
    }
  }
}
