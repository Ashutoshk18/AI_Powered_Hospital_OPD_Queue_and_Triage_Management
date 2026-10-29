import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new QueueController();

router.post(
  '/check-in',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST'),
  (req, res, next) => controller.checkIn(req, res, next)
);

router.get(
  '/department/:departmentId',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  (req, res, next) => controller.getDepartmentQueue(req, res, next)
);

router.post(
  '/consultation/call-next',
  authenticate,
  requireRole('DOCTOR'),
  (req, res, next) => controller.callNext(req, res, next)
);

router.post(
  '/consultation/complete',
  authenticate,
  requireRole('DOCTOR'),
  (req, res, next) => controller.complete(req, res, next)
);

router.post(
  '/:id/triage-override',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  (req, res, next) => controller.overrideTriage(req, res, next)
);

router.get(
  '/my-token',
  authenticate,
  (req, res, next) => controller.getMyTokenStatus(req, res, next)
);

export default router;
