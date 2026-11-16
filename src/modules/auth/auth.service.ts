import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../user/user.model';
import { TokenSessionModel } from './token.model';
import { SessionMeta, RegisterInput } from './auth.types';
import { AppError } from '../../common/utils/AppError';
import { hashPassword, comparePassword, sha256Hash } from '../../common/utils/hash';
import { generateNumericOtp, generateSecureToken } from '../../common/utils/otp';
import {
  generateJti,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../common/utils/email';
import { env } from '../../config/env';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export class AuthService {
  private static async createSessionTokens(user: IUser, meta?: SessionMeta) {
    const jti = generateJti();
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    });
    const refreshToken = signRefreshToken({
      sub: user._id.toString(),
      jti,
    });

    const decodedRefresh = jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decodedRefresh?.exp
      ? new Date(decodedRefresh.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await TokenSessionModel.create({
      userId: user._id,
      jti,
      tokenHash: sha256Hash(refreshToken),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private static sanitizeUser(user: IUser) {
    return {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      avatarUrl: user.avatarUrl,
      privacy: user.privacy,
      createdAt: user.createdAt,
    };
  }

  /**
   * 1. User Registration & Email Verification
   */
  static async register(input: RegisterInput) {
    const existingUser = await UserModel.findOne({
      $or: [
        { email: input.email.toLowerCase() },
        { username: input.username.toLowerCase() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === input.email.toLowerCase()) {
        throw new AppError('Email is already registered', 409);
      }
      throw new AppError('Username is already taken', 409);
    }

    const hashedPassword = await hashPassword(input.password);
    const otp = generateNumericOtp(6);
    const otpExpires = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

    const user = await UserModel.create({
      username: input.username.toLowerCase(),
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      provider: 'local',
      isEmailVerified: false,
      emailVerificationOtp: sha256Hash(otp),
      emailVerificationOtpExpires: otpExpires,
    });

    await sendVerificationEmail(user.email, user.fullName, otp);

    return {
      user: this.sanitizeUser(user),
    };
  }

  static async verifyEmail(email: string, otp: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      '+emailVerificationOtp +emailVerificationOtpExpires'
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    if (
      !user.emailVerificationOtp ||
      !user.emailVerificationOtpExpires ||
      user.emailVerificationOtpExpires < new Date()
    ) {
      throw new AppError('Verification OTP has expired. Please request a new one.', 400);
    }

    if (user.emailVerificationOtp !== sha256Hash(otp)) {
      throw new AppError('Invalid verification OTP', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save();

    return {
      user: this.sanitizeUser(user),
    };
  }

  static async resendVerificationOtp(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    const otp = generateNumericOtp(6);
    user.emailVerificationOtp = sha256Hash(otp);
    user.emailVerificationOtpExpires = new Date(
      Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000
    );
    await user.save();

    await sendVerificationEmail(user.email, user.fullName, otp);
  }

  /**
   * 2. Login & Session Generation (Access Token + Refresh Token pattern)
   */
  static async login(
    identifier: string,
    password: string,
    meta?: SessionMeta
  ) {
    const normalized = identifier.toLowerCase().trim();
    const user = await UserModel.findOne({
      $or: [{ email: normalized }, { username: normalized }],
    }).select('+password');

    if (!user || !user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    const tokens = await this.createSessionTokens(user, meta);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * 3. Token Refreshing & Revocation
   */
  static async refreshTokens(refreshToken: string, meta?: SessionMeta) {
    const payload = verifyRefreshToken(refreshToken);

    const session = await TokenSessionModel.findOne({ jti: payload.jti });
    if (!session) {
      throw new AppError('Refresh token session not found', 401);
    }

    if (session.isRevoked) {
      // Token reuse detection: revoke all user sessions
      await TokenSessionModel.updateMany(
        { userId: session.userId, isRevoked: false },
        { $set: { isRevoked: true, revokedAt: new Date() } }
      );
      throw new AppError('Refresh token has been revoked. All sessions terminated.', 401);
    }

    if (session.expiresAt < new Date()) {
      throw new AppError('Refresh token has expired', 401);
    }

    if (session.tokenHash !== sha256Hash(refreshToken)) {
      throw new AppError('Invalid refresh token signature', 401);
    }

    const user = await UserModel.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Rotate refresh token: revoke current session and issue a new pair
    session.isRevoked = true;
    session.revokedAt = new Date();
    await session.save();

    const tokens = await this.createSessionTokens(user, meta);
    return tokens;
  }

  static async revokeRefreshToken(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const session = await TokenSessionModel.findOne({ jti: payload.jti });

    if (!session || session.isRevoked) {
      return;
    }

    session.isRevoked = true;
    session.revokedAt = new Date();
    await session.save();
  }

  static async revokeAllSessions(userId: string) {
    await TokenSessionModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  static async listActiveSessions(userId: string) {
    return TokenSessionModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .select('jti userAgent ipAddress createdAt expiresAt')
      .sort({ createdAt: -1 });
  }

  static async revokeSessionByJti(userId: string, jti: string) {
    const session = await TokenSessionModel.findOne({ userId, jti, isRevoked: false });
    if (!session) {
      throw new AppError('Active session not found', 404);
    }
    session.isRevoked = true;
    session.revokedAt = new Date();
    await session.save();
  }

  /**
   * 4. Password Reset Flow (OTP / Secure Link)
   */
  static async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return silently to prevent email enumeration
      return;
    }

    const otp = generateNumericOtp(6);
    const rawToken = generateSecureToken(32);

    user.passwordResetOtp = sha256Hash(otp);
    user.passwordResetOtpExpires = new Date(
      Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000
    );

    user.passwordResetToken = sha256Hash(rawToken);
    user.passwordResetTokenExpires = new Date(
      Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000
    );

    await user.save();

    const resetLink = `${env.CLIENT_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(user.email, user.fullName, otp, resetLink);
  }

  static async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string
  ) {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
      '+passwordResetOtp +passwordResetOtpExpires'
    );

    if (
      !user ||
      !user.passwordResetOtp ||
      !user.passwordResetOtpExpires ||
      user.passwordResetOtpExpires < new Date()
    ) {
      throw new AppError('Invalid or expired password reset OTP', 400);
    }

    if (user.passwordResetOtp !== sha256Hash(otp)) {
      throw new AppError('Invalid password reset OTP', 400);
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    await this.revokeAllSessions(user._id.toString());
  }

  static async resetPasswordWithToken(rawToken: string, newPassword: string) {
    const hashedToken = sha256Hash(rawToken);
    const user = await UserModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetTokenExpires');

    if (!user) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    await this.revokeAllSessions(user._id.toString());
  }

  /**
   * 5. OAuth 2.0 Integration (Google sign-in)
   */
  static async googleSignIn(idToken: string, meta?: SessionMeta) {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth is not configured on the server', 500);
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError('Invalid Google ID token', 401);
    }

    if (!payload || !payload.email) {
      throw new AppError('Unable to extract email from Google account', 400);
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const fullName = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || '';

    let user = await UserModel.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      const baseUsername = email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20) || 'user';
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await UserModel.exists({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      user = await UserModel.create({
        username: uniqueUsername,
        fullName,
        email,
        provider: 'google',
        googleId,
        isEmailVerified: true,
        avatarUrl,
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
      }
      if (!user.isActive) {
        user.isActive = true;
      }
      await user.save();
    }

    const tokens = await this.createSessionTokens(user, meta);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
}

