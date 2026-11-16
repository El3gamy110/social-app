import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

startServer();

