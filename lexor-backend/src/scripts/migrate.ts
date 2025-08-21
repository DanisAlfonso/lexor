import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, databaseClient } from '@/services/database/client';
import { logger } from '@/utils/logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Test connection first
    const isConnected = await databaseClient.testConnection();
    if (!isConnected) {
      logger.error('Database connection failed - check your .env configuration');
      logger.error('Current config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      });
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    await migrate(db, { migrationsFolder: './database/migrations' });
    
    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();