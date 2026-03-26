import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRouter from './routes/AppRouter';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PayrollManagement from './features/payroll/PayrollManagement';
import ManageEmployees from './features/payroll/ManageEmployees';
import WorkHours from './features/payroll/WorkHours';
import HourlyRates from './features/payroll/HourlyRates';
import PeriodSettings from './features/payroll/PeriodSettings';
import PaySlipGenerator from './features/payroll/PaySlipGenerator';
import './styles/payroll-original.css';

// Add Google Fonts
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

function App() {
  return (
    <AppRouter />
  );
}

export default App;
