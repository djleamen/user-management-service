const jwt = require('jsonwebtoken');
const config = require('./server');

/**
 * JWT (JSON Web Token) Utility Module
 * 
 * Provides functions for generating and verifying JWT tokens used for authentication.
 * 
 * Token Types:
 * - Access Token: Short-lived token for API authentication (default: 24h)
 * - Refresh Token: Long-lived token for obtaining new access tokens (default: 7d)
 * 
 * All tokens are signed with the JWT secret and include an issuer claim
 * for additional validation.
 */
const jwtConfig = {
  /**
   * Generate access token
   * @param {Object} payload - Data to encode in the token
   * @returns {String} JWT token
   */
  generateAccessToken: (payload) => {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
      issuer: 'learning-platform',
    });
  },

  /**
   * Generate refresh token
   * @param {Object} payload - Data to encode in the token
   * @returns {String} JWT refresh token
   */
  generateRefreshToken: (payload) => {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiration,
      issuer: 'learning-platform',
    });
  },

  /**
   * Verify token
   * @param {String} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken: (token) => {
    try {
      return jwt.verify(token, config.jwtSecret, {
        issuer: 'learning-platform',
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  /**
   * Decode token without verification (use carefully)
   * @param {String} token - JWT token to decode
   * @returns {Object} Decoded token payload
   */
  decodeToken: (token) => {
    return jwt.decode(token);
  },
};

module.exports = jwtConfig;
