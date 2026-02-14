const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/server');

/**
 * User Model
 * 
 * Defines the complete structure, validation, and behavior for user documents.
 * 
 * Features:
 * - Built-in validation for all fields
 * - Password hashing using bcrypt (automatic on save)
 * - Virtual properties for computed fields
 * - Instance methods for password comparison and JSON serialization
 * - Static methods for user authentication
 * - Indexes for query performance
 * - Security: sensitive fields excluded from queries by default
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    profileImage: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        return ret;
      },
    },
  }
);

/**
 * Database Indexes
 * 
 * Improves query performance for frequently searched fields.
 * Indexes are created automatically by MongoDB when the application starts.
 */
userSchema.index({ email: 1 });      // For login and user lookup
userSchema.index({ username: 1 });   // For profile lookup
userSchema.index({ role: 1 });       // For role-based queries
userSchema.index({ isActive: 1 });   // For filtering active/inactive users

/**
 * Virtual Properties
 * 
 * Computed properties that don't persist to the database but are
 * included in JSON/object representations when virtuals are enabled.
 */

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

/**
 * Pre-Save Middleware: Password Hashing
 * 
 * Automatically hashes passwords before saving to the database.
 * Uses bcrypt with configurable salt rounds (default: 12).
 * 
 * Only hashes when password is new or modified to avoid re-hashing
 * on every save operation.
 */
userSchema.pre('save', async function (next) {
  // Skip hashing if password hasn't changed
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with configured rounds (higher = more secure but slower)
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    // Hash password with generated salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Methods
 * 
 * Methods available on individual user document instances.
 */

/**
 * Compare Password
 * 
 * Securely compares a plain text password with the hashed password.
 * Uses bcrypt's constant-time comparison to prevent timing attacks.
 * 
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

/**
 * Generate Authentication JSON
 * 
 * Returns a sanitized user object safe for client consumption.
 * Excludes all sensitive fields (passwords, tokens, etc.)
 * 
 * @returns {Object} User data safe for authentication responses
 */
userSchema.methods.toAuthJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    profileImage: this.profileImage,
    isEmailVerified: this.isEmailVerified,
  };
};

/**
 * Static Methods
 * 
 * Methods available on the User model (class methods).
 */

/**
 * Find User by Credentials
 * 
 * Authenticates a user by email and password.
 * Only considers active users for security.
 * 
 * Security features:
 * - Generic error message to prevent user enumeration
 * - Only searches active users
 * - Uses secure password comparison
 * 
 * @param {string} email - User's email address
 * @param {string} password - Plain text password to verify
 * @returns {Promise<User>} User document if credentials are valid
 * @throws {Error} Generic error message if authentication fails
 */
userSchema.statics.findByCredentials = async function (email, password) {
  // Find user by email and include password field (normally excluded)
  const user = await this.findOne({ email, isActive: true }).select('+password');
  
  // Generic error message prevents account enumeration attacks
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password using bcrypt
  const isPasswordMatch = await user.comparePassword(password);
  
  // Same generic error message for consistency
  if (!isPasswordMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
