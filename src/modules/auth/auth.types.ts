import { Types } from 'mongoose';

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface RegisterInput {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

export interface IRefreshTokenSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jti: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  revokedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

