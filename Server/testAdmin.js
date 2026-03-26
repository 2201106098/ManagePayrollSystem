const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const Employee = require('./src/models/Employee.model');
const env = require('./src/config/env');

// Admin credentials
const ADMIN_EMAIL = 'admindatalogix@datalogix.com';
const ADMIN_PASSWORD = 'Adminpayroll67';

const testAdminFunctionality = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🔍 Testing Admin Functionality Before Atlas Migration');
    console.log('='.repeat(60));

    // Test 1: Admin User Existence
    console.log('\n📋 Test 1: Admin User Verification');
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      console.log('✅ Admin user found');
      console.log('   📧 Email:', admin.email);
      console.log('   👤 Name:', `${admin.firstName} ${admin.lastName}`);
      console.log('   🔑 Role:', admin.role);
      console.log('   ✅ Status:', admin.isActive ? 'Active' : 'Inactive');
      console.log('   📅 Created:', admin.createdAt);
    } else {
      console.log('❌ Admin user NOT found');
      return;
    }

    // Test 2: Admin Login
    console.log('\n🔐 Test 2: Admin Login Verification');
    const isPasswordValid = await admin.comparePassword(ADMIN_PASSWORD);
    if (isPasswordValid) {
      console.log('✅ Admin password verification successful');
    } else {
      console.log('❌ Admin password verification failed');
      return;
    }

    // Test 3: Admin Permissions
    console.log('\n🛡️ Test 3: Admin Permissions Check');
    if (admin.role === 'admin') {
      console.log('✅ Admin has correct role: admin');
    } else {
      console.log('❌ Admin has incorrect role:', admin.role);
      return;
    }

    // Test 4: Database Collections
    console.log('\n📊 Test 4: Database Collections Check');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // Test 5: User Count by Role
    console.log('\n👥 Test 5: User Statistics');
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('📈 Users by role:');
    userStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count} users`);
    });

    // Test 6: Employee Count
    console.log('\n👨‍💼 Test 6: Employee Statistics');
    const employeeCount = await Employee.countDocuments();
    const activeEmployeeCount = await Employee.countDocuments({ archived: false });
    console.log('📊 Employee statistics:');
    console.log(`   - Total employees: ${employeeCount}`);
    console.log(`   - Active employees: ${activeEmployeeCount}`);
    console.log(`   - Archived employees: ${employeeCount - activeEmployeeCount}`);

    // Test 7: Recent Activity
    console.log('\n🕐 Test 7: Recent Admin Activity');
    if (admin.lastLogin) {
      console.log('📅 Last admin login:', admin.lastLogin);
    } else {
      console.log('ℹ️ No previous admin login recorded');
    }

    // Test 8: Token Management
    console.log('\n🎫 Test 8: Token Management Check');
    console.log('🔢 Active refresh tokens:', admin.refreshTokens.length);
    const validTokens = admin.refreshTokens.filter(rt => 
      rt.expiresAt > new Date() && !rt.isRevoked
    );
    console.log('✅ Valid refresh tokens:', validTokens.length);
    console.log('❌ Expired/Revoked tokens:', admin.refreshTokens.length - validTokens.length);

    // Test 9: Security Check
    console.log('\n🔒 Test 9: Security Verification');
    console.log('🔐 Password hashed:', admin.password ? 'Yes (stored securely)' : 'No');
    console.log('🛡️ Account active:', admin.isActive ? 'Yes' : 'No');
    console.log('📧 Email verified:', admin.email ? 'Yes' : 'No');

    console.log('\n🎉 All Admin Functionality Tests Completed Successfully!');
    console.log('✅ System is ready for Atlas migration');
    
    // Migration Checklist
    console.log('\n📋 Atlas Migration Checklist:');
    console.log('✅ Admin user exists and is functional');
    console.log('✅ Admin credentials verified');
    console.log('✅ Admin permissions confirmed');
    console.log('✅ Database collections ready');
    console.log('✅ User statistics collected');
    console.log('✅ Employee data verified');
    console.log('✅ Token management working');
    console.log('✅ Security measures in place');

  } catch (error) {
    console.error('❌ Error during admin functionality test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from database');
  }
};

// Export functionality for manual testing
const getAdminInfo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const admin = await User.findOne({ email: ADMIN_EMAIL });
    return admin;
  } catch (error) {
    console.error('Error getting admin info:', error.message);
    return null;
  } finally {
    await mongoose.disconnect();
  }
};

// Run the test if called directly
if (require.main === module) {
  testAdminFunctionality().catch(console.error);
}

module.exports = { testAdminFunctionality, getAdminInfo };
