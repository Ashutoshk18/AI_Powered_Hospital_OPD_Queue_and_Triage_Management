import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../app';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { AuthUser, Role } from '../types';

export class AuthService {
  public async login(email: string, password: string, ipAddress?: string): Promise<{ token: string; user: AuthUser }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { doctor: true, patient: true },
    });

    if (!user || !user.isActive) {
      // Record failed attempt in audit log
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'User',
          entityId: email,
          metadata: JSON.stringify({ reason: 'User not found or inactive' }),
          ipAddress,
        },
      });
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await prisma.auditLog.create({
        data: {
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'User',
          entityId: user.id,
          metadata: JSON.stringify({ email: user.email, reason: 'Password mismatch' }),
          ipAddress,
        },
      });
      throw new UnauthorizedError('Invalid email or password.');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
    };

    const token = jwt.sign(authUser, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
      },
    });

    return { token, user: authUser };
  }

  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        doctor: {
          include: { department: true },
        },
        patient: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User session expired or user no longer exists.');
    }

    return user;
  }
}
