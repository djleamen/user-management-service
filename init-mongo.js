// ===================================
// MongoDB Initialization Script
// ===================================
//
// This script runs when the MongoDB container is first created.
// It sets up the database, creates users, and configures indexes.
//
// Execution: Automatically run by MongoDB container on first startup
// Location: Mounted to /docker-entrypoint-initdb.d/ in container
// ===================================

// Switch to the application database
db = db.getSiblingDB('learning-platform');

// Create application user with read/write permissions
db.createUser({
  user: 'appuser',
  pwd: 'apppassword123',
  roles: [
    {
      role: 'readWrite',
      db: 'learning-platform',
    },
  ],
});

// Create indexes for better query performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: -1 });

// Log initialization completion
print('MongoDB initialization completed successfully!');
print('Database: learning-platform');
print('Application user created: appuser');
print('Indexes created on users collection');
