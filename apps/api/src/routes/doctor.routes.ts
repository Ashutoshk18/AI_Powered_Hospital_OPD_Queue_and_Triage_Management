import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new DoctorController();

router.get('/', (req, res, next) => controller.list(req, res, next));
router.patch(
  '/:id/availability',
  authenticate,
  requireRole('ADMIN', 'DOCTOR'),
  (req, res, next) => controller.updateAvailability(req, res, next)
);

export default router;
