const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./server');

/**
 * Database connection configuration
 * Establishes connection to MongoDB with recommended settings and retry logic
 */

let isShuttingDown = false;

// Register connection event listeners once at module level
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  if (!isShuttingDown) {
    logger.warn('MongoDB disconnected. Mongoose will attempt to reconnect automatically.');
  }
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

mongoose.connection.on('connected', () => {
  logger.info(`MongoDB connected to ${mongoose.connection.host}`);
});

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  const options = {
    maxPoolSize: config.dbMaxPoolSize,
    minPoolSize: config.dbMinPoolSize,
    serverSelectionTimeoutMS: config.dbServerSelectionTimeoutMs,
    socketTimeoutMS: config.dbSocketTimeoutMs,
  };

  let retries = 0;
  const maxRetries = config.dbMaxRetries;
  const retryDelay = config.dbRetryDelayMs;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(config.mongodbUri, options);
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`);
      
      if (retries >= maxRetries) {
        logger.error('Max retries reached. Could not connect to MongoDB.');
        process.exit(1);
      }
      
      const delay = retryDelay * retries; // Exponential backoff
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      await sleep(delay);
    }
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received. Closing MongoDB connection gracefully...`);
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

// Register graceful shutdown handlers once at module level
process.once('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(0);
});

module.exports = connectDB;
