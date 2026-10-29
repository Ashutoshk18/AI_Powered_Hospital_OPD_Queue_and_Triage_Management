import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';

describe('API Foundation & Health Probes', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/v1/health returns 200 and confirms database connectivity', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('hospital-opd-api');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });
});
