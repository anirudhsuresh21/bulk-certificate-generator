import path from 'path';
import dotenv from 'dotenv';

// 1. Try loading from common root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// 2. Fallback to local backend/.env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();
