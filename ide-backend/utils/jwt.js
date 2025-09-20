const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const config = require('../config');
const logger = require('./logger');

/**
 * JWT utility functions for token generation and validation
 */
class JWTUtils {
  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (usually user ID)
   * @returns {string} JWT token
   */
  static generateAccessToken(payload) {
    try {
      return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'ide-backend',
        audience: 'ide-frontend'
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (usually user ID)
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: 'ide-backend',
        audience: 'ide-frontend'
      });
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - Token payload (usually user ID)
   * @returns {Object} Object containing both tokens
   */
  static generateTokens(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Decoded token payload
   */
  static async verifyToken(token) {
    try {
      const verify = promisify(jwt.verify);
      return await verify(token, config.jwt.secret, {
        issuer: 'ide-backend',
        audience: 'ide-frontend'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active');
      } else {
        logger.error('Error verifying token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token:', error);
      throw new Error('Token decoding failed');
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Check if token is expired
   * @param {Object} decodedToken - Decoded JWT token
   * @returns {boolean} True if token is expired
   */
  static isTokenExpired(decodedToken) {
    if (!decodedToken.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  }

  /**
   * Get token expiration time
   * @param {Object} decodedToken - Decoded JWT token
   * @returns {Date|null} Expiration date or null
   */
  static getTokenExpiration(decodedToken) {
    if (!decodedToken.exp) return null;
    return new Date(decodedToken.exp * 1000);
  }

  /**
   * Get time until token expires
   * @param {Object} decodedToken - Decoded JWT token
   * @returns {number} Seconds until expiration, or 0 if expired
   */
  static getTimeUntilExpiration(decodedToken) {
    if (!decodedToken.exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExp = decodedToken.exp - currentTime;
    
    return Math.max(0, timeUntilExp);
  }
}

module.exports = JWTUtils;