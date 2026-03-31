const mongoose = require('mongoose');
const env = require('./src/config/env');
const User = require('./src/models/User.model');
const Employee = require('./src/models/Employee.model');

const SEED_EMPLOYEES = [
  { firstName: 'Alvina', middleInitial: 'S', lastName: 'Cudo', designation: 'Developer', email: 'alvina@datalogix.com.ph', idNumber: '223232323' },
  { firstName: 'Maria', middleInitial: '', lastName: 'Santos', designation: 'Cashier', email: 'maria@datalogix.com.ph', idNumber: '32334344' },
  { firstName: 'Juan', middleInitial: '', lastName: 'Dela Cruz', designation: 'Supervisor', email: 'juan@datalogix.com.ph', idNumber: '44512312' },
  { firstName: 'Ana', middleInitial: '', lastName: 'Reyes', designation: 'Accountant', email: 'ana@datalogix.com.ph', idNumber: '55671234' },
  { firstName: 'Carlos', middleInitial: '', lastName: 'Gomez', designation: 'IT Specialist', email: 'carlos@datalogix.com.ph', idNumber: '66789012' },
  { firstName: 'Liza', middleInitial: '', lastName: 'Mendoza', designation: 'HR Officer', email: 'liza@datalogix.com.ph', idNumber: '77890123' },
  { firstName: 'Mark', middleInitial: '', lastName: 'Johnson', designation: 'Developer', email: 'mark@datalogix.com.ph', idNumber: '88901234' },
  { firstName: 'Sarah', middleInitial: '', lastName: 'Lee', designation: 'Designer', email: 'sarah@datalogix.com.ph', idNumber: '99012345' },
  { firstName: 'David', middleInitial: '', lastName: 'Kim', designation: 'Analyst', email: 'david@datalogix.com.ph', idNumber: '10123456' },
  { firstName: 'Emily', middleInitial: '', lastName: 'Chen', designation: 'Manager', email: 'emily@datalogix.com.ph', idNumber: '11234567' },
  { firstName: 'Robert', middleInitial: '', lastName: 'Wilson', designation: 'Developer', email: 'robert@datalogix.com.ph', idNumber: '12345678' },
  { firstName: 'Lisa', middleInitial: '', lastName: 'Anderson', designation: 'Accountant', email: 'lisa@datalogix.com.ph', idNumber: '13456789' },
  { firstName: 'James', middleInitial: '', lastName: 'Taylor', designation: 'Sales Rep', email: 'james@datalogix.com.ph', idNumber: '14567890' },
  { firstName: 'Patricia', middleInitial: '', lastName: 'Brown', designation: 'Marketing', email: 'patricia@datalogix.com.ph', idNumber: '15678901' },
  { firstName: 'Michael', middleInitial: '', lastName: 'Davis', designation: 'Developer', email: 'michael@datalogix.com.ph', idNumber: '16789012' },
  { firstName: 'Olivia', middleInitial: '', lastName: 'Garcia', designation: 'Payroll Specialist', email: 'olivia@datalogix.com.ph', idNumber: '17890123' },
  { firstName: 'Ethan', middleInitial: '', lastName: 'Martinez', designation: 'Support Engineer', email: 'ethan@datalogix.com.ph', idNumber: '18901234' },
  { firstName: 'Sophia', middleInitial: '', lastName: 'Lopez', designation: 'QA Engineer', email: 'sophia@datalogix.com.ph', idNumber: '19012345' },
  { firstName: 'Noah', middleInitial: '', lastName: 'Hernandez', designation: 'Operations Officer', email: 'noah@datalogix.com.ph', idNumber: '20123456' },
  { firstName: 'Mia', middleInitial: '', lastName: 'Clark', designation: 'Finance Officer', email: 'mia@datalogix.com.ph', idNumber: '21234567' }
];

const seedEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_payroll', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const adminUser = await User.findOne({ role: 'admin', isActive: true }).sort({ createdAt: 1 });
    if (!adminUser) {
      throw new Error('No active admin user found. Run npm run create-admin first.');
    }

    await Employee.deleteMany({});

    const employeesToInsert = SEED_EMPLOYEES.map((employee) => ({
      ...employee,
      status: 'active',
      isActive: true,
      isArchived: false,
      createdBy: adminUser._id
    }));

    await Employee.insertMany(employeesToInsert, { ordered: true });

    const total = await Employee.countDocuments();
    console.log(`Seed complete. Total employees in database: ${total}`);
  } catch (error) {
    console.error('Employee seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedEmployees();
}

module.exports = { seedEmployees };
