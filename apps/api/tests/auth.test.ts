import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';

describe('Phase 2: Authentication & Core Entities RBAC', () => {
  let adminToken = '';
  let receptionistToken = '';
  let patientToken = '';
  let doctorToken = '';

  beforeAll(async () => {
    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@opd.org', password: 'Password123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    // Authenticate Receptionist
    const recRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reception@opd.org', password: 'Password123!' });
    expect(recRes.status).toBe(200);
    receptionistToken = recRes.body.token;

    // Authenticate Patient
    const patRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patient.john@opd.org', password: 'Password123!' });
    expect(patRes.status).toBe(200);
    patientToken = patRes.body.token;

    // Authenticate Doctor
    const docRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dr.sharma@opd.org', password: 'Password123!' });
    expect(docRes.status).toBe(200);
    doctorToken = docRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@opd.org', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('allows authenticated user to fetch their own profile via GET /auth/me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dr.sharma@opd.org');
    expect(res.body.user.role).toBe('DOCTOR');
    expect(res.body.user.doctor).toBeDefined();
  });

  it('rejects patient attempting to create a department with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ code: 'NEUR', name: 'Neurology' });
    expect(res.status).toBe(403);
  });

  it('allows administrator to create a new department', async () => {
    const uniqueCode = 'N' + Math.floor(100 + Math.random() * 900);
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: uniqueCode, name: 'Neurology Lab', avgConsultationMinutes: 25 });
    expect(res.status).toBe(201);
    expect(res.body.department.code).toBe(uniqueCode);
  });

  it('allows receptionist to register a new patient and auto-generates MRN', async () => {
    const uniquePhone = '+1-555-' + Math.floor(1000 + Math.random() * 9000);
    const res = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        fullName: 'Emily Thorne',
        gender: 'FEMALE',
        dateOfBirth: '1990-05-15',
        phone: uniquePhone,
        bloodGroup: 'B-',
      });
    expect(res.status).toBe(201);
    expect(res.body.patient.medicalRecordNumber).toMatch(/^MRN-\d{4}-\d{4}$/);
  });
});
