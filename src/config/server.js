require('dotenv').config();

/**
 * Server configuration
 * Centralizes all environment variables and server settings
 */
const config = {
  // Server settings
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-platform',
  dbMaxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
  dbMinPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,
  dbServerSelectionTimeoutMs: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS) || 30000,
  dbSocketTimeoutMs: parseInt(process.env.DB_SOCKET_TIMEOUT_MS) || 45000,
  dbMaxRetries: parseInt(process.env.DB_MAX_RETRIES) || 5,
  dbRetryDelayMs: parseInt(process.env.DB_RETRY_DELAY_MS) || 5000,
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  
  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required configuration
const validateConfig = () => {
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

validateConfig();

module.exports = config;
