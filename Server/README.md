# Payroll Management System - Server

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- MongoDB Compass (for database management)

### Environment Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your .env file:**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database (MongoDB)
   MONGODB_URI=mongodb://localhost:27017/manage_payroll
   DB_HOST=localhost
   DB_PORT=27017
   DB_NAME=manage_payroll

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # Email (optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### MongoDB Compass Setup

1. **Open MongoDB Compass**

2. **Create a new connection:**
   - Connection String: `mongodb://localhost:27017/`
   - Click "Connect"

3. **Create the database:**
   - Once connected, click "Create Database"
   - Database Name: `manage_payroll`
   - Collection Name: `users` (this will be created automatically)

4. **Verify connection:**
   - You should see the `manage_payroll` database in the left sidebar
   - The `users` collection will be created when you register your first user

### Running the Server

1. **Development mode:**
   ```bash
   npm run dev
   ```
   This will start the server with nodemon for auto-restart on changes.

2. **Production mode:**
   ```bash
   npm start
   ```

3. **Server will be available at:** `http://localhost:5000`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

#### Users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin/hr only)

#### Health Check
- `GET /api/health` - Server health status

### Database Schema

#### Users Collection
```javascript
{
  _id: ObjectId,
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['admin', 'hr', 'employee'], default: 'employee'),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Docker Support

```bash
# Build and run with Docker
docker build -t payroll-server .
docker run -p 5000:5000 payroll-server
```

### Development Tips

1. **MongoDB Compass Monitoring:**
   - Use Compass to monitor database changes in real-time
   - Check the `users` collection when testing registration
   - Verify data integrity and relationships

2. **Environment Variables:**
   - Never commit `.env` file to version control
   - Use different values for production
   - Keep JWT secret secure and random

3. **Logging:**
   - Check `logs/combined.log` for general logs
   - Check `logs/error.log` for errors only
   - Logs are automatically created on first run

### Troubleshooting

**MongoDB Connection Issues:**
- Ensure MongoDB service is running
- Check if port 27017 is available
- Verify connection string in `.env` file

**Server Won't Start:**
- Check if port 5000 is already in use
- Verify all dependencies are installed
- Check logs for specific error messages

**Registration/Login Issues:**
- Verify database connection in MongoDB Compass
- Check if `users` collection exists
- Ensure JWT secret is set in `.env` file
