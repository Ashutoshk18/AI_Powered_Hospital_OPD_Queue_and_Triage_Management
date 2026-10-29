import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', (req, res, next) => controller.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => controller.getMe(req, res, next));

export default router;
