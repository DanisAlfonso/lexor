import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

export interface DatabaseConfig {
  name: string;
  version: number;
  enableLogging: boolean;
  enableWAL: boolean;
  migrationsPath: string;
}

// Get environment from Expo Constants or NODE_ENV
export const getEnvironment = (): Environment => {
  const env = Constants.expoConfig?.extra?.environment || 
              process.env.NODE_ENV || 
              'development';
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
};

export const DATABASE_CONFIGS: Record<Environment, DatabaseConfig> = {
  development: {
    name: 'lexor_dev.db',
    version: 1,
    enableLogging: true,
    enableWAL: true,
    migrationsPath: './database/migrations',
  },
  staging: {
    name: 'lexor_staging.db',
    version: 1,
    enableLogging: false,
    enableWAL: true,
    migrationsPath: './database/migrations',
  },
  production: {
    name: 'lexor.db',
    version: 1,
    enableLogging: false,
    enableWAL: true,
    migrationsPath: './database/migrations',
  },
};

export const getDatabaseConfig = (): DatabaseConfig => {
  const env = getEnvironment();
  return DATABASE_CONFIGS[env];
};