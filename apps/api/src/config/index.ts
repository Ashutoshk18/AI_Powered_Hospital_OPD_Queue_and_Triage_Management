import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  jwtSecret: process.env.JWT_SECRET || 'dev_super_secret_jwt_key_at_least_32_characters_long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  mlServiceTimeoutMs: parseInt(process.env.ML_SERVICE_TIMEOUT_MS || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL || 'admin@opd.org',
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD || 'AdminSecure123!',
};
