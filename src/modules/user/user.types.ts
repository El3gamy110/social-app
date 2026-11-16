import { Document, Types } from 'mongoose';

export type AuthProvider = 'local' | 'google';
export type ProfilePrivacy = 'public' | 'private';
export type FollowStatus = 'accepted' | 'pending';

export interface IAccountSettings {
  allowFollowRequests: boolean;
  showEmail: boolean;
  showPhone: boolean;
  searchable: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  fullName: string;
  email: string;
  password?: string;
  provider: AuthProvider;
  googleId?: string;

  isEmailVerified: boolean;
  emailVerificationOtp?: string;
  emailVerificationOtpExpires?: Date;

  passwordResetOtp?: string;
  passwordResetOtpExpires?: Date;
  passwordResetToken?: string;
  passwordResetTokenExpires?: Date;
  passwordChangedAt?: Date;

  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  website?: string;
  location?: string;

  privacy: ProfilePrivacy;
  accountSettings: IAccountSettings;
  isActive: boolean;

  followersCount: number;
  followingCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IFollow extends Document {
  _id: Types.ObjectId;
  follower: Types.ObjectId;
  following: Types.ObjectId;
  status: FollowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAccountSettingsInput {
  privacy?: ProfilePrivacy;
  allowFollowRequests?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  searchable?: boolean;
}

