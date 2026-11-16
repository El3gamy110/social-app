import { z } from 'zod';

export const registerSchema = z.object({
  body: z
    .object({
      username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username cannot exceed 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
      fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80),
      email: z.string().email('Invalid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordWithOtpSchema = z.object({
  body: z
    .object({
      email: z.string().email('Invalid email address'),
      otp: z.string().length(6, 'OTP must be 6 digits'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordWithTokenSchema = z.object({
  body: z
    .object({
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
  query: z.object({}).optional(),
  params: z.object({
    token: z.string().min(10, 'Invalid reset token'),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

