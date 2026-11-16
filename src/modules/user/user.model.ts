import mongoose, { Schema } from 'mongoose';
import { IUser } from './user.types';

export { IUser, AuthProvider, ProfilePrivacy, IAccountSettings } from './user.types';

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOtp: {
      type: String,
      select: false,
    },
    emailVerificationOtpExpires: {
      type: Date,
      select: false,
    },

    passwordResetOtp: {
      type: String,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    coverUrl: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    dateOfBirth: {
      type: Date,
    },
    website: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    accountSettings: {
      allowFollowRequests: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      searchable: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 'text', fullName: 'text', bio: 'text' });

export const UserModel = mongoose.model<IUser>('User', userSchema);

