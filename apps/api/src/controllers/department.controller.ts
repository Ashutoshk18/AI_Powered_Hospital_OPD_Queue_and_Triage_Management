import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { createDepartmentSchema } from '../validators/department.validator';
import { ConflictError } from '../utils/errors';

export class DepartmentController {
  public async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { doctors: true, appointments: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      res.status(200).json({ success: true, departments });
    } catch (error) {
      next(error);
    }
  }

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createDepartmentSchema.parse(req.body);
      const existing = await prisma.department.findUnique({
        where: { code: validated.code },
      });

      if (existing) {
        throw new ConflictError(`Department code ${validated.code} already exists.`);
      }

      const department = await prisma.department.create({
        data: validated,
      });

      res.status(201).json({ success: true, department });
    } catch (error) {
      next(error);
    }
  }
}
