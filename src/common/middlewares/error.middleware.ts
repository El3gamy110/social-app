import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { env } from '../../config/env';

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

export const errorHandlerMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown>; message?: string; stack?: string };
  if (mongoErr && mongoErr.code === 11000) {
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue).join(', ') : 'field';
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
    return;
  }

  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: mongoErr?.message || 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: mongoErr?.stack }),
  });
};

