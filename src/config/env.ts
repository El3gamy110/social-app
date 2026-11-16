import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social-app',

  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  OTP_EXPIRES_MINUTES: Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  RESET_TOKEN_EXPIRES_MINUTES: Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 15,

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Social App <no-reply@socialapp.com>',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
};
