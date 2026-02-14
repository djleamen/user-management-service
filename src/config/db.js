const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./server');

/**
 * Database Connection Module
 * 
 * Handles MongoDB connection with production-ready features:
 * - Automatic retry logic with exponential backoff
 * - Connection pooling for optimal performance
 * - Event listeners for monitoring connection health
 * - Graceful shutdown handling for both SIGINT and SIGTERM
 * - Prevents duplicate event listeners through module-level registration
 * 
 * Configuration is pulled from environment variables via config/server.js
 * Defaults provide sensible values for development environments
 */

// Flag to prevent connection close attempts during shutdown
let isShuttingDown = false;

/**
 * Connection Event Listeners
 * 
 * Registered once at module level to prevent duplicate listeners.
 * These handle various connection states throughout the application lifecycle.
 */

// Log connection errors (network issues, authentication failures, etc.)
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

// Log disconnections (only when not shutting down intentionally)
mongoose.connection.on('disconnected', () => {
  if (!isShuttingDown) {
    logger.warn('MongoDB disconnected. Mongoose will attempt to reconnect automatically.');
  }
});

// Log successful reconnections after temporary disconnects
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

// Log initial successful connection
mongoose.connection.on('connected', () => {
  logger.info(`MongoDB connected to ${mongoose.connection.host}`);
});

/**
 * Sleep Utility
 * 
 * Simple promise-based delay function for retry logic.
 * 
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Resolves after the specified delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with Retry Logic
 * 
 * Attempts to establish a connection to MongoDB with the following features:
 * - Connection pooling (min/max pool size)
 * - Configurable timeouts for server selection and socket operations
 * - Exponential backoff retry logic (delays increase: 5s, 10s, 15s, 20s, 25s)
 * - Exits process if all retry attempts fail
 * 
 * Connection options:
 * - maxPoolSize: Maximum number of connections in the pool
 * - minPoolSize: Minimum number of connections maintained
 * - serverSelectionTimeoutMS: Time to wait for server selection
 * - socketTimeoutMS: Time to wait for socket operations
 * 
 * @returns {Promise<Connection>} MongoDB connection object
 * @throws {Error} Exits process if connection fails after max retries
 */
const connectDB = async () => {
  // Configure connection options from environment variables
  const options = {
    maxPoolSize: config.dbMaxPoolSize,           // Default: 10 connections
    minPoolSize: config.dbMinPoolSize,           // Default: 5 connections
    serverSelectionTimeoutMS: config.dbServerSelectionTimeoutMs, // Default: 30 seconds
    socketTimeoutMS: config.dbSocketTimeoutMs,   // Default: 45 seconds
  };

  let retries = 0;
  const maxRetries = config.dbMaxRetries;       // Default: 5 attempts
  const retryDelay = config.dbRetryDelayMs;     // Default: 5000ms base delay

  // Retry loop with exponential backoff
  while (retries < maxRetries) {
    try {
      // Attempt connection
      const conn = await mongoose.connect(config.mongodbUri, options);
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      
      // Exit if max retries reached
      if (retries >= maxRetries) {
        logger.error('Max retries reached. Could not connect to MongoDB.');
        process.exit(1);
      }
      
      // Calculate exponential backoff delay: 5s, 10s, 15s, 20s, 25s
      const delay = retryDelay * retries;
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      await sleep(delay);
    }
  }
};

/**
 * Graceful Shutdown Handler
 * 
 * Ensures MongoDB connections are properly closed before process termination.
 * Prevents race conditions with the isShuttingDown flag.
 * 
 * @param {string} signal - The signal that triggered the shutdown (SIGINT/SIGTERM)
 */
const gracefulShutdown = async (signal) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received. Closing MongoDB connection gracefully...`);
  
  try {
    // Close all active connections in the pool
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

/**
 * Signal Handlers
 * 
 * Register shutdown handlers for both SIGINT and SIGTERM:
 * - SIGINT: Ctrl+C in terminal
 * - SIGTERM: Kubernetes/Docker container termination signal
 * 
 * Using process.once() ensures handlers are called only once,
 * preventing duplicate shutdown attempts.
 */
process.once('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(0);
});

module.exports = connectDB;
