import path from 'path';

// In cloud/serverless platforms (like Vercel), environment variables are directly injected by the platform.
// In local development, load from the common root .env or backend/.env gracefully.
if (!process.env.VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    const existingNodeEnv = process.env.NODE_ENV;
    // 1. Try loading from common root .env
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    // 2. Fallback to local backend/.env
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    dotenv.config();

    // Preserve NODE_ENV if it was explicitly defined (e.g., 'test' during Jest runs)
    if (existingNodeEnv) {
      process.env.NODE_ENV = existingNodeEnv;
    }
  } catch (_err) {
    // dotenv is optional in production/serverless runtimes
  }
}
