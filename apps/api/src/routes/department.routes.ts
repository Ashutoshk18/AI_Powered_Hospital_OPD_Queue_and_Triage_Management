import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new DepartmentController();

router.get('/', (req, res, next) => controller.list(req, res, next));
router.post('/', authenticate, requireRole('ADMIN'), (req, res, next) => controller.create(req, res, next));

export default router;
