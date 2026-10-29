import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import doctorRoutes from './routes/doctor.routes';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import queueRoutes from './routes/queue.routes';
import analyticsRoutes from './routes/analytics.routes';

export const prisma = new PrismaClient();
export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health Check Endpoint
app.get(`${config.apiPrefix}/health`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: 'hospital-opd-api',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'hospital-opd-api',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
});

// Mounted Routes
app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/departments`, departmentRoutes);
app.use(`${config.apiPrefix}/doctors`, doctorRoutes);
app.use(`${config.apiPrefix}/patients`, patientRoutes);
app.use(`${config.apiPrefix}/appointments`, appointmentRoutes);
app.use(`${config.apiPrefix}/queue`, queueRoutes);
app.use(`${config.apiPrefix}/analytics`, analyticsRoutes);

// Global error handler
app.use(errorHandler);
