import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../../config/env';

export const hashPassword = async (plainText: string): Promise<string> => {
  return bcrypt.hash(plainText, env.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (
  plainText: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(plainText, hash);
};

export const sha256Hash = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

