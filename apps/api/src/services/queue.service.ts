import { prisma } from '../app';
import { TriageService } from './triage.service';
import { MLService } from './ml.service';
import { VitalSignsInput } from '../types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

export class QueueService {
  private triageService = new TriageService();
  private mlService = new MLService();

  public async checkIn(appointmentId: string, vitals?: VitalSignsInput, performedByUserId?: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        department: true,
        doctor: true,
        patient: true,
        queueEntry: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found.');
    }

    if (appointment.status !== 'SCHEDULED') {
      throw new ValidationError(`Cannot check in appointment with status '${appointment.status}'. Must be 'SCHEDULED'.`);
    }

    if (appointment.queueEntry) {
      throw new ConflictError(`Queue entry already issued for this appointment (Token: ${appointment.queueEntry.tokenDisplay}).`);
    }

    // 1. Evaluate vitals with Triage engine
    const triageResult = this.triageService.evaluateVitals(vitals);

    // 2. Compute date & daily sequential token
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Count existing tokens for this department on this date
    const existingCount = await prisma.queueEntry.count({
      where: {
        departmentId: appointment.departmentId,
        queueDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const tokenNumber = existingCount + 1;
    const tokenDisplay = `${appointment.department.code}-${String(tokenNumber).padStart(3, '0')}`;

    // 3. Count waiting patients ahead
    const waitingAhead = await prisma.queueEntry.count({
      where: {
        departmentId: appointment.departmentId,
        status: 'WAITING',
      },
    });

    // 4. Active consultations in department
    const activeConsultations = await prisma.queueEntry.count({
      where: {
        departmentId: appointment.departmentId,
        status: 'IN_CONSULTATION',
      },
    });

    // 5. Predict wait time via ML service
    const mlPrediction = await this.mlService.predictWaitTime(
      {
        queue_position: waitingAhead + 1,
        patients_ahead: waitingAhead,
        active_consultations_count: activeConsultations,
        department_code: appointment.department.code,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        doctor_experience_years: appointment.doctor.experienceYears,
        urgency_tier: triageResult.tier,
      },
      appointment.department.avgConsultationMinutes
    );

    const initialDynamicScore = this.triageService.calculateDynamicPriorityScore(
      triageResult.tier,
      now,
      now
    );

    // 6. Execute atomic transaction
    const [queueEntry] = await prisma.$transaction([
      prisma.queueEntry.create({
        data: {
          appointmentId: appointment.id,
          departmentId: appointment.departmentId,
          doctorId: appointment.doctorId,
          queueDate: today,
          tokenNumber,
          tokenDisplay,
          status: 'WAITING',
          initialTriageTier: triageResult.tier,
          currentTriageTier: triageResult.tier,
          dynamicPriorityScore: initialDynamicScore,
          checkInTime: now,
          estimatedWaitMinutes: mlPrediction.predicted_wait_minutes,
          waitTimePredictionSource: mlPrediction.source,
          triageAssessment: {
            create: {
              systolicBP: vitals?.systolicBP,
              diastolicBP: vitals?.diastolicBP,
              heartRate: vitals?.heartRate,
              oxygenSaturation: vitals?.oxygenSaturation,
              temperatureCelsius: vitals?.temperatureCelsius,
              painScore: vitals?.painScore ?? 0,
              respiratoryDistress: vitals?.respiratoryDistress ?? false,
              alteredMentalState: vitals?.alteredMentalState ?? false,
              calculatedTier: triageResult.tier,
              explanation: triageResult.explanation,
              assessedAt: now,
            },
          },
        },
        include: {
          triageAssessment: true,
          appointment: { include: { patient: true, doctor: { include: { user: true } }, department: true } },
        },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CHECKED_IN' },
      }),
      prisma.auditLog.create({
        data: {
          userId: performedByUserId,
          action: 'QUEUE_CHECK_IN',
          entityType: 'QueueEntry',
          entityId: appointment.id,
          metadata: JSON.stringify({
            tokenDisplay,
            tier: triageResult.tier,
            estimatedWaitMinutes: mlPrediction.predicted_wait_minutes,
            predictionSource: mlPrediction.source,
          }),
        },
      }),
    ]);

    return {
      queueEntry,
      triageResult,
      prediction: mlPrediction,
    };
  }

  public async getDepartmentQueue(departmentId: string) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      throw new NotFoundError('Department not found.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = await prisma.queueEntry.findMany({
      where: {
        departmentId,
        status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
      },
      include: {
        appointment: {
          include: { patient: true, doctor: { include: { user: true } } },
        },
        triageAssessment: true,
      },
    });

    const now = new Date();

    // Recalculate dynamic priority scores on the fly with anti-starvation aging
    const processedEntries = entries.map((entry) => {
      let currentScore = entry.dynamicPriorityScore;
      if (entry.status === 'WAITING') {
        currentScore = this.triageService.calculateDynamicPriorityScore(
          entry.currentTriageTier,
          entry.checkInTime,
          now
        );
      }
      return {
        ...entry,
        dynamicPriorityScore: currentScore,
        elapsedWaitMinutes: Math.max(0, Math.round((now.getTime() - entry.checkInTime.getTime()) / 60000)),
      };
    });

    // Partition: In Consultation vs Waiting
    const inConsultation = processedEntries.filter((e) => e.status === 'IN_CONSULTATION');
    const waitingQueue = processedEntries
      .filter((e) => e.status === 'WAITING' || e.status === 'CALLED')
      .sort((a, b) => {
        // Multi-tier deterministic tie-breaking
        if (b.dynamicPriorityScore !== a.dynamicPriorityScore) {
          return b.dynamicPriorityScore - a.dynamicPriorityScore; // Descending priority
        }
        if (a.checkInTime.getTime() !== b.checkInTime.getTime()) {
          return a.checkInTime.getTime() - b.checkInTime.getTime(); // Earliest arrival
        }
        return a.tokenNumber - b.tokenNumber; // Lowest token number
      });

    return {
      department,
      inConsultation,
      waitingQueue,
      totalWaiting: waitingQueue.length,
    };
  }

  public async callNextPatient(doctorId: string, callerUserId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { department: true },
    });
    if (!doctor) {
      throw new NotFoundError('Doctor not found.');
    }

    // Check if doctor already has an active consultation
    const existingActive = await prisma.queueEntry.findFirst({
      where: {
        doctorId,
        status: 'IN_CONSULTATION',
      },
      include: {
        appointment: { include: { patient: true } },
      },
    });

    if (existingActive) {
      throw new ConflictError(
        `Doctor already has an active consultation with patient ${existingActive.appointment.patient.fullName} (Token ${existingActive.tokenDisplay}). Please complete it first.`
      );
    }

    // Retrieve department waiting queue sorted by dynamic priority
    const queueData = await this.getDepartmentQueue(doctor.departmentId);
    if (queueData.waitingQueue.length === 0) {
      throw new NotFoundError('No patients currently waiting in this department queue.');
    }

    const nextPatientEntry = queueData.waitingQueue[0];
    const now = new Date();

    const [updatedEntry] = await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: nextPatientEntry.id },
        data: {
          doctorId: doctor.id,
          status: 'IN_CONSULTATION',
          consultationStartTime: now,
        },
        include: {
          appointment: { include: { patient: true, doctor: { include: { user: true } }, department: true } },
          triageAssessment: true,
        },
      }),
      prisma.appointment.update({
        where: { id: nextPatientEntry.appointmentId },
        data: { status: 'IN_CONSULTATION' },
      }),
      prisma.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CONSULTATION_STARTED',
          entityType: 'QueueEntry',
          entityId: nextPatientEntry.id,
          metadata: JSON.stringify({ doctorId, tokenDisplay: nextPatientEntry.tokenDisplay }),
        },
      }),
    ]);

    return updatedEntry;
  }

  public async completeConsultation(
    queueEntryId: string,
    notes: {
      chiefComplaint?: string;
      clinicalNotes: string;
      diagnosis?: string;
      prescriptionSummary?: string;
    },
    doctorId: string,
    callerUserId: string
  ) {
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
      include: { appointment: true },
    });

    if (!queueEntry) {
      throw new NotFoundError('Queue entry not found.');
    }

    if (queueEntry.status !== 'IN_CONSULTATION') {
      throw new ValidationError(`Cannot complete consultation for entry with status '${queueEntry.status}'. Must be 'IN_CONSULTATION'.`);
    }

    const now = new Date();
    const startTime = queueEntry.consultationStartTime || queueEntry.checkInTime;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000));

    const [updatedEntry, consultationRecord] = await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: {
          status: 'COMPLETED',
          consultationEndTime: now,
        },
      }),
      prisma.consultationRecord.create({
        data: {
          queueEntryId,
          chiefComplaint: notes.chiefComplaint,
          clinicalNotes: notes.clinicalNotes,
          diagnosis: notes.diagnosis,
          prescriptionSummary: notes.prescriptionSummary,
          actualDurationMinutes: durationMinutes,
          completedAt: now,
        },
      }),
      prisma.appointment.update({
        where: { id: queueEntry.appointmentId },
        data: { status: 'COMPLETED' },
      }),
      prisma.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CONSULTATION_COMPLETED',
          entityType: 'QueueEntry',
          entityId: queueEntryId,
          metadata: JSON.stringify({ doctorId, durationMinutes, diagnosis: notes.diagnosis }),
        },
      }),
    ]);

    return { updatedEntry, consultationRecord };
  }

  public async overrideTriage(
    queueEntryId: string,
    newTier: number,
    reason: string,
    overriddenByUserId: string
  ) {
    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId },
    });

    if (!queueEntry) {
      throw new NotFoundError('Queue entry not found.');
    }

    const previousTier = queueEntry.currentTriageTier;
    const now = new Date();
    const newScore = this.triageService.calculateDynamicPriorityScore(
      newTier,
      queueEntry.checkInTime,
      now
    );

    const [updatedEntry, overrideRecord] = await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: {
          currentTriageTier: newTier,
          dynamicPriorityScore: newScore,
        },
      }),
      prisma.triageOverride.create({
        data: {
          queueEntryId,
          overriddenByUserId,
          previousTier,
          newTier,
          reason,
          overriddenAt: now,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: overriddenByUserId,
          action: 'TRIAGE_PRIORITY_OVERRIDE',
          entityType: 'QueueEntry',
          entityId: queueEntryId,
          metadata: JSON.stringify({ previousTier, newTier, reason }),
        },
      }),
    ]);

    return { updatedEntry, overrideRecord };
  }
}
