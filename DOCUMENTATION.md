Payroll Management System
Documentation & Implementation Guide


Prepared by:
Jorell Abecia

Internship Project Documentation
2026
 
1. Introduction
This document serves as a handover and implementation guide for the Payroll Management System project.
Its goal is to help the company understand the project and guide them in deploying and continuing development.

2. Project Overview
The project is a modern full-stack web application for managing employee payroll, developed using React (Vite) for the frontend and Node.js (Express) for the backend.
•	Goals:
•	Streamline payroll management processes
•	Provide secure authentication and authorization
•	Enable efficient employee and payroll data management
•	Generate payroll slips and reports
•	Provide scalable architecture for future enhancements

3. Project Status
The system design and implementation have been reviewed and approved.
The system is deployed and live.
•	Live Website: https://managementtesting.netlify.app/dashboard
No major UI/UX revisions are required at this stage.

4. Technologies Used

Frontend:
•	React 18.2.0
•	Vite 4.4.5
•	Redux Toolkit (State Management)
•	React Router DOM (Navigation)
•	TailwindCSS (Styling)
•	Axios (HTTP Client)
•	jsPDF & jsPDF-AutoTable (PDF Generation)
•	Lucide React (Icons)
•	React Hot Toast (Notifications)

Backend:
•	Node.js
•	Express.js
•	MongoDB (Database)
•	Mongoose (ODM)
•	JWT (Authentication)
•	Bcryptjs (Password Hashing)
•	Winston (Logging)
•	Helmet.js (Security)
•	CORS (Cross-Origin Resource Sharing)
•	Express Rate Limiting

Development Tools:
•	Git (Version Control)
•	Nodemon (Development Server)
•	ESLint (Code Linting)
•	Docker (Containerization)

5. System Pages/Features
•	Login / Authentication
•	Dashboard
•	Employee Management
•	Payroll Management
•	Hourly Rates Configuration
•	Work Hours Tracking
•	Pay Slip Generation
•	Period Settings

6. Page/Feature Description
•	Login – Secure authentication system with role-based access (Admin, HR, Employee)
•	Dashboard – Overview of payroll statistics and quick access to features
•	Employee Management – Add, edit, view, and delete employee records
•	Payroll Management – Process and manage payroll calculations
•	Hourly Rates – Configure and manage employee hourly rates
•	Work Hours – Track and manage employee work hours
•	Pay Slips – Generate and download payroll slips in PDF format
•	Period Settings – Configure payroll period settings

7. Project Structure

Client/ (Frontend - React)
•	src/
•		api/ – API service layer and axios configuration
•		components/ – reusable UI components
•		context/ – authentication context providers
•		features/ – feature-based modules
•			auth/ – authentication pages and components
•			dashboard/ – dashboard components
•			payroll/ – payroll management features
•		hooks/ – custom React hooks
•		layouts/ – layout components (MainLayout, AuthLayout)
•		routes/ – route configurations
•		store/ – Redux store configuration
•		styles/ – global styles and Tailwind configuration
•		utils/ – utility functions
•	Main Files:
•		App.jsx – main app component
•		main.jsx – React entry point
•		index.html – HTML template
•		vite.config.js – Vite configuration
•		tailwind.config.js – TailwindCSS configuration

Server/ (Backend - Node.js)
•	src/
•		config/ – database and environment configuration
•		controllers/ – request handlers for each feature
•		middleware/ – authentication, validation, and error handling
•		models/ – MongoDB data models (schemas)
•		routes/ – API route definitions
•		services/ – business logic layer
•		utils/ – utility functions and helpers
•	Main Files:
•		server.js – Express server entry point
•		.env – environment variables
•		Dockerfile – Docker configuration

8. How to Update Content
•	Frontend Pages: /Client/src/features/
•	Components: /Client/src/components/
•	API Configuration: /Client/src/api/
•	Backend Logic: /Server/src/controllers/ and /Server/src/services/
•	Database Models: /Server/src/models/
•	API Routes: /Server/src/routes/
•	Environment Variables: /Client/.env and /Server/.env

9. Project Location (Local Environment)
C:\Users\MY PC\Downloads\Payrollsystem\ManagePayrollSystem
•	Copy entire folder if moving to another PC
•	Ensure Node.js (v18 or higher) is installed
•	Ensure MongoDB is installed (local or MongoDB Atlas)

10. How to Run the Project

Backend Setup:
•	navigate to Server/ directory
•	npm install
•	cp .env.example .env
•	Configure .env with your database credentials
•	npm run dev (development) or npm start (production)

Frontend Setup:
•	navigate to Client/ directory
•	npm install
•	cp .env.example .env
•	Configure VITE_API_URL to point to backend
•	npm run dev (development)
•	npm run build (production build)
•	npm run preview (preview production build)

11. Implementation Process
•	Set up MongoDB (local or Atlas)
•	Configure environment variables for both frontend and backend
•	Run backend server (npm run dev in Server/)
•	Run frontend development server (npm run dev in Client/)
•	Test all features locally
•	Create admin user using: npm run create-admin (in Server/)
•	Build frontend for production: npm run build (in Client/)
•	Deploy backend to Render (or preferred hosting)
•	Deploy frontend to Netlify/Vercel (or preferred hosting)
•	Configure CORS and environment variables for production
•	Test all features in production environment
•	Go live

12. Database Configuration
The system uses MongoDB as the database.
•	Local MongoDB: mongodb://localhost:27017/manage_payroll
•	MongoDB Atlas (Production): Already configured with connection string
•	Database Name: manage_payroll
•	Use MongoDB Compass for database management and monitoring

13. Authentication System
The system uses JWT (JSON Web Tokens) for authentication.
•	HTTP-only cookies for secure token storage
•	Role-based access control (Admin, HR, Employee)
•	Token refresh mechanism for extended sessions
•	Default Admin Credentials:
•	Email: admindatalogix@datalogix.com
•	Password: (created during setup using createAdmin.js script)

14. Environment Variables Setup

Backend (.env):
•	PORT=5000
•	NODE_ENV=development
•	MONGODB_URI=mongodb://localhost:27017/manage_payroll
•	JWT_SECRET=your-secret-key
•	JWT_EXPIRE=7d
•	EMAIL_HOST=smtp.gmail.com
•	EMAIL_PORT=587
•	EMAIL_USER=your-email@gmail.com
•	EMAIL_PASS=your-app-password
•	CLIENT_URL=http://localhost:5173

Frontend (.env):
•	VITE_API_URL=http://localhost:5000/api

15. Deployment Options

Option 1: Render (Backend) + Netlify (Frontend)
•	Backend: Deploy to Render with environment variables
•	Frontend: Deploy to Netlify with VITE_API_URL pointing to Render backend
•	Configure CORS in backend to allow Netlify domain

Option 2: Vercel (Full Stack)
•	Deploy both frontend and backend using Vercel
•	Configure serverless functions for backend

Option 3: Self-Hosting
•	Deploy backend to VPS or cloud server
•	Deploy frontend to web server (Apache/Nginx)
•	Configure reverse proxy and SSL

16. After Deployment
•	Monitor server logs and performance
•	Test all authentication flows
•	Verify database connections
•	Check email functionality (if configured)
•	Update content and features as needed
•	Regularly backup database
•	Monitor API usage and rate limits

17. Security Features Implemented
•	JWT authentication with HTTP-only cookies
•	Password hashing with bcryptjs
•	CORS protection
•	Rate limiting to prevent abuse
•	Helmet.js for security headers
•	Input validation with Joi
•	Role-based access control
•	Environment variable protection

18. Notes for Developers
•	Never commit .env files to version control
•	Use .env.example as template for environment variables
•	Run npm install after moving project to new environment
•	Test thoroughly before deploying changes
• Follow the existing project structure and naming conventions
•	Reuse components from /Client/src/components/
•	Keep backend logic in /Server/src/services/ for maintainability
•	Use MongoDB Compass to monitor database during development
•	Check logs in /Server/logs/ for debugging
•	Create admin user using npm run create-admin script
•	Seed test employees using npm run seed-employees script

19. Troubleshooting

Backend Issues:
•	Check if MongoDB is running
•	Verify MONGODB_URI in .env file
•	Check if port 5000 is available
•	Review logs in /Server/logs/

Frontend Issues:
•	Verify VITE_API_URL in .env file
•	Check if backend server is running
• Clear browser cache and localStorage
•	Check browser console for errors

Database Issues:
•	Ensure MongoDB service is active
•	Verify connection string format
•	Check MongoDB Atlas whitelist (if using cloud)
•	Use MongoDB Compass to verify connection

20. Additional Resources
•	PRODUCTION_DEPLOYMENT_GUIDE.md – Detailed deployment instructions
•	Server/README.md – Backend-specific documentation
•	ATLAS_MIGRATION_GUIDE.md – MongoDB Atlas migration guide
•	render.yaml – Render deployment configuration

21. Conclusion
This Payroll Management System is ready for implementation and can serve as the company's official payroll management solution. The system is scalable, secure, and built with modern technologies to ensure reliability and ease of maintenance.
•	Live Application: https://managementtesting.netlify.app/dashboard

---
*Document Version: 1.0*
*Last Updated: April 2026*
*Status: ✅ Ready for Deployment*
