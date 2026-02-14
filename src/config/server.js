require('dotenv').config();

/**
 * Server Configuration Module
 * 
 * Centralizes all environment variables and application settings.
 * Provides sensible defaults for development while requiring
 * explicit configuration in production.
 * 
 * Environment variables can be set in a .env file or through
 * system environment variables.
 */
const config = {
  // ===== Server Settings =====
  port: process.env.PORT || 3000,                    // HTTP server port
  nodeEnv: process.env.NODE_ENV || 'development',    // Environment: development/production/test
  
  // ===== Database Configuration =====
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-platform',
  // Connection pool settings for optimal performance
  dbMaxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,        // Max connections in pool
  dbMinPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,         // Min maintained connections
  // Timeout configurations (increased from defaults for containerized deployments)
  dbServerSelectionTimeoutMs: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS) || 30000,  // 30 seconds
  dbSocketTimeoutMs: parseInt(process.env.DB_SOCKET_TIMEOUT_MS) || 45000,                     // 45 seconds
  // Retry logic for connection resilience
  dbMaxRetries: parseInt(process.env.DB_MAX_RETRIES) || 5,            // Max connection retry attempts
  dbRetryDelayMs: parseInt(process.env.DB_RETRY_DELAY_MS) || 5000,    // Base delay for exponential backoff
  
  // ===== JWT (JSON Web Token) Settings =====
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',  // Secret key for signing tokens
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',                           // Access token lifetime
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',             // Refresh token lifetime
  
  // ===== Security Configuration =====
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,  // Higher = more secure but slower
  
  // ===== Rate Limiting (DDoS protection) =====
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,  // Time window: 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,       // Max requests per window
  
  // ===== CORS (Cross-Origin Resource Sharing) =====
  corsOrigin: process.env.CORS_ORIGIN || '*',  // Allowed origins (* = all, specify domains in production)
  
  // ===== Logging Configuration =====
  logLevel: process.env.LOG_LEVEL || 'info',  // Levels: error, warn, info, verbose, debug
};

/**
 * Configuration Validation
 * 
 * Ensures critical environment variables are set in production.
 * Development environment uses fallback defaults, but production
 * requires explicit configuration for security.
 */
const validateConfig = () => {
  // List of environment variables required in production
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
  
  // Check which required variables are missing
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  // Fail fast in production if required variables are not set
  if (missingVars.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Run validation on module load
validateConfig();

module.exports = config;
