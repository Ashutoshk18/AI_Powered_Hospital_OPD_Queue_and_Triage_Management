import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
const controller = new AnalyticsController();

router.get('/summary', authenticate, (req, res, next) => controller.getSummary(req, res, next));
router.get(
  '/audit-logs',
  authenticate,
  requireRole('ADMIN'),
  (req, res, next) => controller.getAuditLogs(req, res, next)
);

export default router;
