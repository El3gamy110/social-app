import mongoose, { Document, Schema } from 'mongoose';
import { IRefreshTokenSession } from './auth.types';

export type IRefreshTokenSessionDocument = IRefreshTokenSession & Document;

const tokenSessionSchema = new Schema<IRefreshTokenSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

tokenSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenSessionModel = mongoose.model<IRefreshTokenSessionDocument>(
  'TokenSession',
  tokenSessionSchema
);

