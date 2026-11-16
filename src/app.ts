import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import {
  notFoundMiddleware,
  errorHandlerMiddleware,
} from './common/middlewares/error.middleware';

const app: Application = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Modules Routes (Auth & User Modules)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error Handling Middlewares
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;

