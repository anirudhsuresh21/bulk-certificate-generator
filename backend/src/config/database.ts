import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(uri?: string): Promise<string> {
  if (mongoose.connection.readyState === 1) {
    return 'Already connected';
  }
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bulk-certi';

  try {
    // Attempt standard connection with a short timeout to fail fast if mongod is absent
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`Connected to MongoDB at ${mongoUri}`);
    return mongoUri;
  } catch (err) {
    console.warn(`Could not connect to external MongoDB at ${mongoUri}. Starting in-memory MongoDB...`);
    try {
      memoryServer = await MongoMemoryServer.create();
      const inMemoryUri = memoryServer.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`Connected to in-memory MongoDB at ${inMemoryUri}`);
      return inMemoryUri;
    } catch (memErr) {
      console.error('Failed to initialize in-memory MongoDB:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
