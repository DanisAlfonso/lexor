import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { getDatabaseConfig, getEnvironment } from '@/config/database';
import { MigrationManager } from './migrations';

let database: SQLiteDatabase | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;
let migrationManager: MigrationManager | null = null;

export const getDatabase = (): SQLiteDatabase => {
  if (!database) {
    const config = getDatabaseConfig();
    const env = getEnvironment();
    
    console.log(`Initializing database for ${env} environment: ${config.name}`);
    
    database = openDatabaseSync(config.name, {
      enableChangeListener: true,
    });

    // Enable WAL mode for better performance
    if (config.enableWAL) {
      database.execSync('PRAGMA journal_mode = WAL');
    }
    
    // Enable foreign key constraints
    database.execSync('PRAGMA foreign_keys = ON');
    
    // Performance optimizations
    database.execSync('PRAGMA synchronous = NORMAL');
    database.execSync('PRAGMA cache_size = 10000');
    database.execSync('PRAGMA temp_store = MEMORY');
  }
  
  return database;
};

export const getDrizzleDb = () => {
  if (!drizzleDb) {
    const db = getDatabase();
    drizzleDb = drizzle(db, {
      logger: getDatabaseConfig().enableLogging,
    });
  }
  return drizzleDb;
};

export const getMigrationManager = (): MigrationManager => {
  if (!migrationManager) {
    const db = getDatabase();
    migrationManager = new MigrationManager(db);
  }
  return migrationManager;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const config = getDatabaseConfig();
    const env = getEnvironment();
    
    console.log(`Initializing database for ${env} environment...`);
    
    // Get database instance
    const db = getDatabase();
    
    // Initialize migration manager
    const migrationMgr = getMigrationManager();
    await migrationMgr.init();
    
    // Run pending migrations
    await migrationMgr.runPendingMigrations();
    
    console.log('Database initialized successfully');
    
    if (config.enableLogging) {
      // Log database info in development
      const result = await db.getFirstAsync<{ version: string }>(
        'SELECT sqlite_version() as version'
      );
      console.log(`SQLite version: ${result?.version}`);
      
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      console.log('Available tables:', tables.map(t => t.name));
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.closeAsync();
    database = null;
    drizzleDb = null;
    migrationManager = null;
    console.log('Database connection closed');
  }
};

// Export the drizzle instance as default
export const db = getDrizzleDb();