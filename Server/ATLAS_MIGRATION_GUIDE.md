# Atlas Migration Guide

## 🎯 Admin Generation Status: ✅ COMPLETE

### Admin Credentials
- **Email**: `admindatalogix@datalogix.com`
- **Password**: `Adminpayroll67`
- **Role**: `admin`
- **Status**: `Active`
- **Created**: `2026-03-19T07:51:06.946Z`

## 📊 Current System Status (Before Migration)

### ✅ Verified Components
1. **Admin User**: Fully functional and tested
2. **Authentication**: Login working correctly
3. **Permissions**: Admin role confirmed
4. **Security**: Password hashing implemented
5. **Token Management**: 25 valid refresh tokens
6. **Database Collections**: 8 collections ready

### 📋 Database Collections
- `users` (2 users - 2 admins)
- `employees` (1 employee - 1 archived)
- `payslips`
- `workhours`
- `workhourtemplates`
- `employeerates`
- `periodsettings`
- `attendances`

## 🚀 Atlas Migration Steps

### 1. Prepare Atlas Cluster
```bash
# Create MongoDB Atlas cluster
# Choose: M0 Sandbox (Free) or higher
# Region: Choose closest to your location
# Cluster name: manage-payroll-prod
```

### 2. Get Atlas Connection String
```bash
# Format: mongodb+srv://<username>:<password>@cluster.mongodb.net/manage_payroll?retryWrites=true&w=majority
# Update .env file:
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/manage_payroll?retryWrites=true&w=majority
```

### 3. Update Environment Variables
```bash
# In Server/.env
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/manage_payroll?retryWrites=true&w=majority

# Keep other variables:
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=production
PORT=5000
```

### 4. Network Access Configuration
```bash
# In Atlas Dashboard:
# 1. Go to Network Access
# 2. Add IP Address: 0.0.0.0/0 (allows all access - for development)
# 3. Or add your specific IP for production
```

### 5. Database User Creation
```bash
# In Atlas Dashboard:
# 1. Go to Database Access
# 2. Create new user:
#    - Username: payroll_admin
#    - Password: [strong_password]
#    - Permissions: Read and write to any database
```

### 6. Test Connection
```bash
# Run admin test to verify Atlas connection
npm run test-admin
```

### 7. Data Migration (Optional)
```bash
# If you want to migrate existing data:
# 1. Export from local MongoDB
mongodump --db manage_payroll --out ./backup

# 2. Import to Atlas
mongorestore "mongodb+srv://username:password@cluster.mongodb.net/manage_payroll" ./backup/manage_payroll

# 3. Or use Atlas Data Import UI
```

## 🔧 Post-Migration Verification

### 1. Run Admin Test
```bash
cd Server
npm run test-admin
```

### 2. Test Login
```bash
# Start server
npm run dev

# Test login at: http://localhost:5000/api/auth/login
# Email: admindatalogix@datalogix.com
# Password: Adminpayroll67
```

### 3. Verify Collections
```bash
# Check if all collections exist in Atlas
# Users: 2 (should include admin)
# Employees: 1 (existing data)
```

## 🛡️ Security Considerations

### 1. Environment Variables
```bash
# Never commit .env to version control
# Use strong passwords for Atlas
# Rotate JWT secret key
```

### 2. Network Access
```bash
# Production: Whitelist specific IPs only
# Development: Can use 0.0.0.0/0 temporarily
```

### 3. Database User
```bash
# Use dedicated database user (not root)
# Minimum required permissions only
# Enable authentication
```

## 📝 Migration Commands

### Quick Migration Script
```bash
# 1. Backup current data
npm run backup-data

# 2. Update .env with Atlas connection string
# 3. Test connection
npm run test-admin

# 4. Start server with Atlas
npm run dev

# 5. Verify functionality
npm run test-admin
```

### Rollback Plan
```bash
# If migration fails, rollback to local:
# 1. Update .env to local MongoDB
MONGODB_URI=mongodb://localhost:27017/manage_payroll

# 2. Restart server
npm run dev

# 3. Verify admin still works
npm run test-admin
```

## ✅ Migration Checklist

- [ ] Atlas cluster created
- [ ] Connection string obtained
- [ ] Database user created
- [ ] Network access configured
- [ ] .env file updated
- [ ] Connection tested
- [ ] Admin functionality verified
- [ ] All collections present
- [ ] Login working
- [ ] Security measures in place

## 🎉 Migration Complete!

After successful migration:
1. Admin user will work exactly the same
2. All existing functionality preserved
3. Better scalability and performance
4. Automatic backups and monitoring

## 🆘 Troubleshooting

### Common Issues
1. **Connection timeout**: Check IP whitelist
2. **Authentication failed**: Verify username/password
3. **Database not found**: Ensure database name matches
4. **Admin not found**: Run `npm run create-admin`

### Support Commands
```bash
# Test admin functionality
npm run test-admin

# Recreate admin if needed
npm run create-admin

# Check server logs
npm run dev
```

---

**Status**: ✅ Ready for Atlas Migration  
**Admin**: Fully Functional  
**Last Tested**: 2026-03-26  
**Migration Risk**: LOW (admin user verified)
