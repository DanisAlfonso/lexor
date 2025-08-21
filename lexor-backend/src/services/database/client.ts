import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from '@/models';

class DatabaseClient {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const connectionConfig = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'danny',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'lexor',
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };

    this.pool = new Pool({
      ...connectionConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.db = drizzle(this.pool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.pool.on('connect', (client) => {
      console.log('New database client connected');
    });

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });

    this.pool.on('remove', (client) => {
      console.log('Database client removed from pool');
    });
  }

  get database() {
    return this.db;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

export const databaseClient = new DatabaseClient();
export const db = databaseClient.database;