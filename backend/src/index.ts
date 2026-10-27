import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { connectDB } from './config/database';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Certificate Backend Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
