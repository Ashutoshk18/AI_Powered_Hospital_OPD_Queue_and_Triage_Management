import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';

export class AnalyticsController {
  public async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalPatients = await prisma.patient.count();
      const totalDoctors = await prisma.doctor.count();
      const totalAppointments = await prisma.appointment.count();

      const activeQueueCount = await prisma.queueEntry.count({
        where: { status: 'WAITING' },
      });

      const completedToday = await prisma.queueEntry.count({
        where: { status: 'COMPLETED' },
      });

      // Group wait times by tier
      const completedEntries = await prisma.queueEntry.findMany({
        where: { status: 'COMPLETED' },
        include: { consultationRecord: true },
      });

      let totalWaitMins = 0;
      let totalConsultMins = 0;
      for (const entry of completedEntries) {
        if (entry.consultationStartTime && entry.checkInTime) {
          totalWaitMins += Math.max(
            1,
            Math.round((entry.consultationStartTime.getTime() - entry.checkInTime.getTime()) / 60000)
          );
        }
        if (entry.consultationRecord) {
          totalConsultMins += entry.consultationRecord.actualDurationMinutes;
        }
      }

      const avgWaitMinutes = completedEntries.length > 0 ? Math.round(totalWaitMins / completedEntries.length) : 18;
      const avgConsultMinutes = completedEntries.length > 0 ? Math.round(totalConsultMins / completedEntries.length) : 15;

      // Department breakdown
      const departments = await prisma.department.findMany({
        include: {
          _count: {
            select: { queueEntries: true, doctors: true },
          },
        },
      });

      const departmentStats = departments.map((d) => ({
        code: d.code,
        name: d.name,
        activePatients: d._count.queueEntries,
        doctorCount: d._count.doctors,
      }));

      // Triage Tier distribution
      const tierCounts = await prisma.queueEntry.groupBy({
        by: ['currentTriageTier'],
        _count: { id: true },
      });

      const tierDistribution = [1, 2, 3, 4, 5].map((tier) => {
        const found = tierCounts.find((tc) => tc.currentTriageTier === tier);
        return {
          tier: `Tier ${tier}`,
          count: found ? found._count.id : 0,
        };
      });

      res.status(200).json({
        success: true,
        summary: {
          totalPatients,
          totalDoctors,
          totalAppointments,
          activeQueueCount,
          completedToday,
          avgWaitMinutes,
          avgConsultMinutes,
          departmentStats,
          tierDistribution,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 50,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
      });
      res.status(200).json({ success: true, logs });
    } catch (error) {
      next(error);
    }
  }
}
