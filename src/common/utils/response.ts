import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, unknown>
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  });
};

