import { Router } from 'express';
import { AuthController } from './auth.controller';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middlewares/validate.middleware';
import { authenticate } from '../../common/middlewares/auth.middleware';
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
  resetPasswordWithTokenSchema,
  googleAuthSchema,
} from './auth.validation';

const router = Router();

// User Registration & Email Verification
router.post('/register', validate(registerSchema), asyncHandler(AuthController.register));
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(AuthController.verifyEmail)
);
router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  asyncHandler(AuthController.resendVerification)
);

// Login & Session Generation
router.post('/login', validate(loginSchema), asyncHandler(AuthController.login));

// Token Refreshing & Revocation
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  asyncHandler(AuthController.refreshToken)
);
router.post('/logout', validate(refreshTokenSchema), asyncHandler(AuthController.logout));
router.post('/logout-all', authenticate, asyncHandler(AuthController.logoutAll));
router.get('/sessions', authenticate, asyncHandler(AuthController.getActiveSessions));
router.delete('/sessions/:jti', authenticate, asyncHandler(AuthController.revokeSession));

// Password Reset Flow (OTP / Secure Link)
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(AuthController.forgotPassword)
);
router.post(
  '/reset-password/otp',
  validate(resetPasswordWithOtpSchema),
  asyncHandler(AuthController.resetPasswordWithOtp)
);
router.post(
  '/reset-password/token/:token',
  validate(resetPasswordWithTokenSchema),
  asyncHandler(AuthController.resetPasswordWithToken)
);

// OAuth 2.0 Integration (Google Sign-In)
router.post('/google', validate(googleAuthSchema), asyncHandler(AuthController.googleSignIn));

export default router;

