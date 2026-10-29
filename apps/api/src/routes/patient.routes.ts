import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new PatientController();

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST'),
  (req, res, next) => controller.register(req, res, next)
);

router.get(
  '/search',
  authenticate,
  requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  (req, res, next) => controller.search(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  (req, res, next) => controller.getById(req, res, next)
);

export default router;
