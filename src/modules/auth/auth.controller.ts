import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendResponse } from '../../common/utils/response';

export class AuthController {
  static async register(req: Request, res: Response) {
    const result = await AuthService.register(req.body);
    return sendResponse(
      res,
      201,
      'User registered successfully. Please check your email for the verification OTP.',
      result
    );
  }

  static async verifyEmail(req: Request, res: Response) {
    const { email, otp } = req.body;
    const result = await AuthService.verifyEmail(email, otp);
    return sendResponse(res, 200, 'Email verified successfully', result);
  }

  static async resendVerification(req: Request, res: Response) {
    const { email } = req.body;
    await AuthService.resendVerificationOtp(email);
    return sendResponse(res, 200, 'Verification OTP resent successfully');
  }

  static async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    const result = await AuthService.login(identifier, password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return sendResponse(res, 200, 'Logged in successfully', result);
  }

  static async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshTokens(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return sendResponse(res, 200, 'Token refreshed successfully', result);
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    await AuthService.revokeRefreshToken(refreshToken);
    return sendResponse(res, 200, 'Logged out successfully');
  }

  static async logoutAll(req: Request, res: Response) {
    await AuthService.revokeAllSessions(req.user!._id.toString());
    return sendResponse(res, 200, 'All active sessions have been revoked');
  }

  static async getActiveSessions(req: Request, res: Response) {
    const sessions = await AuthService.listActiveSessions(req.user!._id.toString());
    return sendResponse(res, 200, 'Active sessions retrieved successfully', { sessions });
  }

  static async revokeSession(req: Request, res: Response) {
    const jti = String(req.params.jti);
    await AuthService.revokeSessionByJti(req.user!._id.toString(), jti);
    return sendResponse(res, 200, 'Session revoked successfully');
  }

  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    await AuthService.forgotPassword(email);
    return sendResponse(
      res,
      200,
      'If an account with that email exists, a password reset OTP and link have been sent.'
    );
  }

  static async resetPasswordWithOtp(req: Request, res: Response) {
    const { email, otp, newPassword } = req.body;
    await AuthService.resetPasswordWithOtp(email, otp, newPassword);
    return sendResponse(res, 200, 'Password has been reset successfully using OTP');
  }

  static async resetPasswordWithToken(req: Request, res: Response) {
    const token = String(req.params.token);
    const { newPassword } = req.body;
    await AuthService.resetPasswordWithToken(token, newPassword);
    return sendResponse(res, 200, 'Password has been reset successfully using reset link');
  }

  static async googleSignIn(req: Request, res: Response) {
    const { idToken } = req.body;
    const result = await AuthService.googleSignIn(idToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return sendResponse(res, 200, 'Google sign-in successful', result);
  }
}

