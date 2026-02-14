const mongoose = require('mongoose');
const User = require('../src/models/userModel');
const config = require('../src/config/server');
const sampleUsers = require('./sample-users.json');

/**
 * Script to populate the database with sample users for testing
 */

const populateDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Create sample users
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [{ email: userData.email }, { username: userData.username }] 
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.username} already exists, skipping...`);
          continue;
        }

        // Create new user
        const user = new User(userData);
        await user.save();
        createdUsers.push(user);
        console.log(`✓ Created user: ${userData.username} (${userData.role})`);
      } catch (error) {
        console.error(`✗ Failed to create user ${userData.username}:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log(`Successfully created ${createdUsers.length} users`);
    console.log('========================================\n');

    // Display created users
    console.log('Created Users:');
    console.log('----------------------------------------');
    createdUsers.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: SecurePass123! (or AdminPass123! for admin)`);
      console.log(`Role: ${user.role}`);
      console.log('----------------------------------------');
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
};

// Run the script
populateDatabase();
