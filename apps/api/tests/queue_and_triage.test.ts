import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';
import { TriageService } from '../src/services/triage.service';

describe('Phase 3 & 4: Appointments, Queue & Triage Aging Engine', () => {
  let receptionistToken = '';
  let doctorToken = '';
  let doctorId = '';
  let departmentId = '';
  let patientId = '';
  let appointmentId = '';
  let queueEntryId = '';

  beforeAll(async () => {
    // Login Receptionist
    const recRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reception@opd.org', password: 'Password123!' });
    receptionistToken = recRes.body.token;

    // Login Doctor (Cardiology)
    const docRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dr.sharma@opd.org', password: 'Password123!' });
    doctorToken = docRes.body.token;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${doctorToken}`);
    doctorId = meRes.body.user.doctor.id;
    departmentId = meRes.body.user.doctor.departmentId;

    // Find a patient
    const pat = await prisma.patient.findFirst({
      where: { medicalRecordNumber: 'MRN-2026-0004' },
    });
    patientId = pat!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Unit: TriageService accurately classifies vitals and detects hypoxia/respiratory emergencies', () => {
    const service = new TriageService();

    // Normal vitals -> Tier 4
    const normal = service.evaluateVitals({
      systolicBP: 120,
      diastolicBP: 80,
      heartRate: 72,
      oxygenSaturation: 98,
      temperatureCelsius: 36.6,
      painScore: 2,
    });
    expect(normal.tier).toBe(4);
    expect(normal.isEmergency).toBe(false);

    // Severe desaturation (SpO2 89%) -> Tier 2 Emergent
    const emergent = service.evaluateVitals({
      systolicBP: 130,
      heartRate: 95,
      oxygenSaturation: 89,
      painScore: 4,
    });
    expect(emergent.tier).toBe(2);

    // Critical hypoxia (<85%) -> Tier 1 Resuscitation
    const critical = service.evaluateVitals({
      oxygenSaturation: 82,
      respiratoryDistress: true,
      alteredMentalState: true,
    });
    expect(critical.tier).toBe(1);
    expect(critical.isEmergency).toBe(true);
  });

  it('Unit: Anti-starvation aging ensures routine patient surpasses new urgent patient after threshold', () => {
    const service = new TriageService();
    const now = new Date();
    const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);

    // Tier 4 patient checked in 90 minutes ago
    const tier4Score = service.calculateDynamicPriorityScore(4, ninetyMinutesAgo, now, 1.0);
    // Base 35 + (1.0 * 90) = 125

    // Tier 2 patient checked in right now
    const tier2Score = service.calculateDynamicPriorityScore(2, now, now, 1.0);
    // Base 120 + 0 = 120

    expect(tier4Score).toBe(125);
    expect(tier2Score).toBe(120);
    expect(tier4Score).toBeGreaterThan(tier2Score); // Starvation prevented!
  });

  it('creates an appointment for a patient', async () => {
    // Generate unique time slot to prevent collision with prior runs
    const randomOffsetMinutes = Math.floor(200 + Math.random() * 5000);
    const uniqueSlot = new Date(Date.now() + randomOffsetMinutes * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        patientId,
        doctorId,
        departmentId,
        scheduledAt: uniqueSlot,
        reason: 'Acute palpitations and lightheadedness',
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe('SCHEDULED');
    appointmentId = res.body.appointment.id;
  });

  it('checks in patient, allocates daily token, and evaluates vitals', async () => {
    const res = await request(app)
      .post('/api/v1/queue/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        appointmentId,
        vitals: {
          systolicBP: 155,
          diastolicBP: 95,
          heartRate: 114,
          oxygenSaturation: 95,
          painScore: 6,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.queueEntry.tokenDisplay).toMatch(/^CARD-\d{3}$/);
    expect(res.body.triageResult.tier).toBe(3); // Moderate urgency (HR 114, pain 6)
    expect(res.body.queueEntry.estimatedWaitMinutes).toBeGreaterThan(0);
    expect(res.body.queueEntry.status).toBe('WAITING');
    queueEntryId = res.body.queueEntry.id;
  });

  it('retrieves department queue ordered by dynamic priority score', async () => {
    const res = await request(app)
      .get(`/api/v1/queue/department/${departmentId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.waitingQueue.length).toBeGreaterThan(0);
    // Verify sorting order: descending dynamicPriorityScore
    const scores = res.body.waitingQueue.map((e: any) => e.dynamicPriorityScore);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('allows doctor to override triage urgency tier with recorded clinical reason', async () => {
    const res = await request(app)
      .post(`/api/v1/queue/${queueEntryId}/triage-override`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        newTier: 2,
        reason: 'Patient showed sudden onset diaphoresis and dizziness in waiting area.',
      });

    expect(res.status).toBe(200);
    expect(res.body.updatedEntry.currentTriageTier).toBe(2);
    expect(res.body.overrideRecord.previousTier).toBe(3);
    expect(res.body.overrideRecord.newTier).toBe(2);
  });

  it('doctor calls next patient and consultation starts atomically', async () => {
    const res = await request(app)
      .post('/api/v1/queue/consultation/call-next')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ doctorId });

    expect(res.status).toBe(200);
    expect(res.body.queueEntry.status).toBe('IN_CONSULTATION');
    expect(res.body.queueEntry.consultationStartTime).toBeDefined();
  });

  it('doctor completes consultation and records clinical diagnosis', async () => {
    // Get active in-consultation entry
    const activeRes = await request(app)
      .get(`/api/v1/queue/department/${departmentId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    const activeEntry = activeRes.body.inConsultation[0];
    expect(activeEntry).toBeDefined();

    const res = await request(app)
      .post('/api/v1/queue/consultation/complete')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        queueEntryId: activeEntry.id,
        chiefComplaint: 'Chest tightness with palpitations',
        clinicalNotes: 'ECG performed; shows sinus tachycardia without ST elevation.',
        diagnosis: 'Sinus Tachycardia (R00.0)',
        prescriptionSummary: 'Beta-blocker 25mg daily, follow-up in 1 week.',
      });

    expect(res.status).toBe(200);
    expect(res.body.updatedEntry.status).toBe('COMPLETED');
    expect(res.body.consultationRecord.diagnosis).toBe('Sinus Tachycardia (R00.0)');
    expect(res.body.consultationRecord.actualDurationMinutes).toBeGreaterThanOrEqual(1);
  });
});
