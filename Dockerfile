# ===================================
# Multi-stage Dockerfile for Node.js Application
# ===================================
# 
# This Dockerfile uses multi-stage builds to create an optimized production image:
# - Stage 1 (builder): Installs all dependencies including devDependencies
# - Stage 2 (production): Creates minimal runtime image with only production dependencies
#
# Benefits:
# - Smaller final image size
# - Improved security (fewer packages)
# - Faster deployment
# ===================================

# ===== Stage 1: Build Stage =====
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
# If package.json hasn't changed, Docker will use cached layer
COPY package*.json ./

# Install all dependencies (including devDependencies for potential builds)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source code
COPY . .

# ===== Stage 2: Production Stage =====
FROM node:20-alpine AS production

# Set Node environment to production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling in containers
# dumb-init ensures proper PID 1 behavior and signal forwarding
RUN apk add --no-cache dumb-init

# Create non-root user for security
# Running as non-root prevents potential security vulnerabilities
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check - verifies container is healthy
# Docker will automatically restart unhealthy containers
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
# Ensures graceful shutdown with SIGTERM/SIGINT
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/app.js"]
