import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema } from '../validators/auth.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const result = await authService.login(validated.email, validated.password, ip);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
}
