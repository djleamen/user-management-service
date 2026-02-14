const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const config = require('./config/server');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const userRoutes = require('./routes/userRoutes');

/**
 * Express Application Setup
 * 
 * Main entry point for the User Management Service.
 * Configures middleware, routes, and error handling in proper order.
 * 
 * Middleware Order (Important!):
 * 1. Security middleware (helmet, cors, mongoSanitize)
 * 2. Body parsers (json, urlencoded)
 * 3. Logging (morgan)
 * 4. Rate limiting
 * 5. Application routes
 * 6. 404 handler
 * 7. Global error handler (must be last)
 */

// Initialize Express application
const app = express();

// Establish database connection with retry logic
connectDB();

// ===== Application Configuration =====

// Trust proxy - Required when behind reverse proxies (Nginx, AWS ALB, etc.)
// Enables proper IP address detection for rate limiting and logging
app.set('trust proxy', 1);

// ===== Security Middleware =====
// Order matters: security middleware should be applied first

app.use(helmet()); // Sets various HTTP headers for security (XSS, clickjacking, etc.)
app.use(mongoSanitize()); // Prevents NoSQL injection attacks by sanitizing user input

// CORS (Cross-Origin Resource Sharing) configuration
// Allows frontend applications from specified origins to access the API
app.use(
  cors({
    origin: config.corsOrigin,        // Allowed origins (configure in production)
    credentials: true,                // Allow cookies and authorization headers
    optionsSuccessStatus: 200,        // For legacy browser support
  })
);

// ===== Body Parsing Middleware =====
// Parse incoming request bodies before handlers (must be before routes)

app.use(express.json({ limit: '10mb' }));                        // Parse JSON payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));  // Parse URL-encoded forms

// ===== HTTP Request Logging =====
// Different formats for development (readable) vs production (detailed)

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));  // Concise colored output
} else {
  app.use(morgan('combined', { stream: logger.stream }));  // Apache-style logs to Winston
}

// ===== Rate Limiting (DDoS Protection) =====
// Configure rate limiter to prevent abuse and DDoS attacks
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,        // Time window (default: 15 minutes)
  max: config.rateLimitMaxRequests,          // Max requests per window (default: 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,                     // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,                      // Disable X-RateLimit-* headers
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// ===== Application Routes =====

// Health check endpoint (not rate limited, useful for load balancers)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User Management Service is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/users', userRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to User Management Service API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// ===== Error Handling =====
// Must be registered after all routes and middleware

// Handle 404 errors for undefined routes
app.use(notFound);

// Global error handler - catches all errors and formats responses
// MUST be the last middleware registered
app.use(errorHandler);

// ===== Server Startup =====

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// ===== Process Error Handlers =====
// Handle errors that occur outside the Express error handling chain

/**
 * Unhandled Promise Rejections
 * Catches promises that reject without a .catch() handler
 */
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Gracefully close server before exit
  server.close(() => process.exit(1));
});

/**
 * Uncaught Exceptions
 * Catches synchronous errors not wrapped in try-catch
 * Process should exit as state may be inconsistent
 */
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

/**
 * Graceful Shutdown (SIGTERM)
 * Handles termination signal from container orchestrators
 * Gives time for in-flight requests to complete
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = app;
