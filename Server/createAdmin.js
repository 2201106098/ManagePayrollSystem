const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User.model');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

// Admin credentials
const ADMIN_EMAIL = 'admindatalogix@datalogix.com';
const ADMIN_PASSWORD = 'Adminpayroll67';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'Datalogix';

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('Admin user already exists:', ADMIN_EMAIL);
      console.log('Admin details:', {
        email: existingAdmin.email,
        role: existingAdmin.role,
        isActive: existingAdmin.isActive,
        createdAt: existingAdmin.createdAt
      });
      return;
    }

    // Create admin user
    const admin = new User({
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Password:', ADMIN_PASSWORD);
    console.log('👤 Role: admin');
    console.log('✅ Status: Active');
    console.log('📅 Created:', new Date().toISOString());

    // Verify the admin was created
    const createdAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (createdAdmin) {
      console.log('✅ Verification: Admin user exists in database');
      console.log('🆔 Admin ID:', createdAdmin._id);
    } else {
      console.log('❌ Verification failed: Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.log('💡 Admin user already exists (duplicate key error)');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Test admin login functionality
const testAdminLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('\n🔐 Testing admin login...');

    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      console.log('❌ Admin user not found for login test');
      return;
    }

    const isPasswordValid = await admin.comparePassword(ADMIN_PASSWORD);
    if (isPasswordValid) {
      console.log('✅ Admin login test successful');
      console.log('🔑 Password verification: PASSED');
      console.log('👤 User role:', admin.role);
      console.log('✅ Account status:', admin.isActive ? 'Active' : 'Inactive');
    } else {
      console.log('❌ Admin login test failed');
      console.log('🔑 Password verification: FAILED');
    }

  } catch (error) {
    console.error('❌ Error testing admin login:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting admin generation process...');
  console.log('📊 Database:', process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll');
  
  await createAdmin();
  await testAdminLogin();
  
  console.log('\n🎉 Admin generation process completed!');
  console.log('📝 You can now use these credentials to login:');
  console.log('   📧 Email: admindatalogix@datalogix.com');
  console.log('   🔑 Password: Adminpayroll67');
  console.log('   🌐 URL: http://localhost:5174/login');
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createAdmin, testAdminLogin };
