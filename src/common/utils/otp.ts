import crypto from 'crypto';

export const generateNumericOtp = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  return otp;
};

export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

