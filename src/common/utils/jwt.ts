import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from './AppError';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  username: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export const generateJti = (): string => {
  return crypto.randomUUID();
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired access token', 401);
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

