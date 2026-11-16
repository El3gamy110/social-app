import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserModel, IUser } from '../../modules/user/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await UserModel.findById(payload.sub).select('+passwordChangedAt');
    if (!user) {
      throw new AppError('User belonging to this token no longer exists', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 403);
    }

    if (user.passwordChangedAt && payload.iat) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedTimestamp) {
        throw new AppError('Password was recently changed. Please log in again.', 401);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};

