export * from './database';

// Environment configuration
export const APP_CONFIG = {
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    timeout: 10000,
  },
  sync: {
    enabled: process.env.EXPO_PUBLIC_SYNC_ENABLED === 'true',
    interval: 5 * 60 * 1000, // 5 minutes
  },
  features: {
    offline: true,
    analytics: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    crashReporting: process.env.EXPO_PUBLIC_CRASH_REPORTING_ENABLED === 'true',
  },
};