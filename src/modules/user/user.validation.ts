import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const updateProfileSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .optional(),
    fullName: z.string().min(2).max(80).optional(),
    bio: z.string().max(300).optional(),
    avatarUrl: z.string().url('Invalid avatar URL').or(z.literal('')).optional(),
    coverUrl: z.string().url('Invalid cover URL').or(z.literal('')).optional(),
    phone: z.string().max(25).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.coerce.date().optional(),
    website: z.string().url('Invalid website URL').or(z.literal('')).optional(),
    location: z.string().max(100).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePrivacySchema = z.object({
  body: z.object({
    privacy: z.enum(['public', 'private']),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateAccountSettingsSchema = z.object({
  body: z.object({
    privacy: z.enum(['public', 'private']).optional(),
    allowFollowRequests: z.boolean().optional(),
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    searchable: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
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

export const targetUserParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    targetUserId: z.string().regex(objectIdRegex, 'Invalid user ID'),
  }),
});

export const handleFollowRequestSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'reject']),
  }),
  query: z.object({}).optional(),
  params: z.object({
    followerId: z.string().regex(objectIdRegex, 'Invalid follower user ID'),
  }),
});

export const userIdListSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
  params: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid user ID'),
  }),
});

export const searchUsersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    q: z.string().min(1, 'Search query is required').trim(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
  params: z.object({}).optional(),
});

export const suggestionsQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  params: z.object({}).optional(),
});

