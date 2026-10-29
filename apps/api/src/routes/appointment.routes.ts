import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new AppointmentController();

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST', 'PATIENT'),
  (req, res, next) => controller.create(req, res, next)
);

router.get(
  '/',
  authenticate,
  (req, res, next) => controller.list(req, res, next)
);

router.patch(
  '/:id/cancel',
  authenticate,
  (req, res, next) => controller.cancel(req, res, next)
);

export default router;
