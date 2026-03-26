import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Users, 
  Clock, 
  DollarSign, 
  FileText,
  Calendar,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Modal } from '../../components';
import PayrollDashboard from './PayrollDashboard';
import ManageEmployees from './ManageEmployees';
import WorkHours from './WorkHours';
import HourlyRates from './HourlyRates';
import PaySlipGenerator from './PaySlipGenerator';
import PeriodSettings from './PeriodSettings';

const PayrollManagement = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Map paths to page IDs
  const getPageFromPath = () => {
    const path = location.pathname;
    console.log('Current pathname:', path); // Debug log
    if (path === '/ManageEmployees') return 'employees';
    if (path === '/WorkHours') return 'hours';
    if (path === '/HourlyRates') return 'rates';
    if (path === '/PeriodSettings') return 'periods';
    if (path === '/PaySlipGenerator') return 'payslip';
    return 'home';
  };

  const activePage = getPageFromPath();

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'employees', label: 'Manage Employees', icon: Users, path: '/ManageEmployees' },
    { id: 'rates', label: 'Manage Hourly Rates', icon: DollarSign, path: '/HourlyRates' },
    { id: 'hours', label: 'Record Work Hours', icon: Clock, path: '/WorkHours' },
    { id: 'periods', label: 'Period Settings', icon: Calendar, path: '/PeriodSettings' },
    { id: 'payslip', label: 'Generate Pay Slip', icon: FileText, path: '/PaySlipGenerator' },
  ];

  const pageTitles = {
    home: 'Dashboard',
    employees: 'Manage Employees',
    hours: 'Record Work Hours',
    rates: 'Manage Hourly Rates',
    periods: 'Period Settings',
    payslip: 'Generated Pay Slip',
  };

  const pageSubtitles = {
    home: 'Welcome back, Admin',
    employees: 'Add & manage employee records',
    hours: 'Track and log daily work hours',
    rates: 'Configure billing & hourly rates',
    periods: 'Configure 15-day work periods and paydays',
    payslip: 'Generate & export employee pay slips',
  };

  const renderActivePage = () => {
    console.log('Active page:', activePage); // Debug log
    console.log('Children provided:', !!children); // Debug log
    // If children are provided, use them (for direct URL routing)
    if (children) {
      console.log('Rendering children'); // Debug log
      return children;
    }
    
    // Otherwise, use the switch statement (for dashboard routing)
    console.log('Using switch statement for:', activePage); // Debug log
    switch (activePage) {
      case 'home':
        return <PayrollDashboard />;
      case 'employees':
        return <ManageEmployees />;
      case 'hours':
        return <WorkHours />;
      case 'rates':
        return <HourlyRates />;
      case 'periods':
        console.log('Rendering PeriodSettings'); // Debug log
        return <PeriodSettings />;
      case 'payslip':
        return (
          <div style={{ 
            margin: '-24px', 
            width: sidebarCollapsed ? 'calc(100vw - 44px)' : 'calc(100vw - 236px)', // Account for sidebar and padding
            marginLeft: '-24px',
            background: '#f5f5f5',
            padding: '20px',
            overflowX: 'auto',
            minHeight: 'calc(100vh - 80px)'
          }}>
            <PaySlipGenerator />
          </div>
        );
      default:
        console.log('Defaulting to PayrollDashboard'); // Debug log
        return <PayrollDashboard />;
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if logout API fails
      navigate('/login');
    }
    setShowLogoutModal(false);
  };

  return (
    <div style={{ 
      width: '100vw', 
      minHeight: '100vh', 
      background: '#fafafa',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Subtle grid background - same as login page */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0,50,153,.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,50,153,.08) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      {/* Sidebar - Original Design */}
      <aside style={{ 
        background: '#610000', 
        width: sidebarCollapsed ? '72px' : '260px', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 100, 
        transition: 'width .35s cubic-bezier(.77,0,.18,1)', 
        overflow: 'hidden', 
        boxShadow: '4px 0 32px rgba(167,39,3,.25)'
      }}>
        {/* Diagonal accent strip */}
        <div style={{
          content: '',
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '120px',
          height: '240px',
          background: 'rgba(255,255,255,.06)',
          transform: 'rotate(20deg)',
          pointerEvents: 'none'
        }}></div>
        
        {/* Bottom diagonal accent strip - opposite direction */}
        <div style={{
          content: '',
          position: 'absolute',
          bottom: '-60px',
          left: '-40px',
          width: '120px',
          height: '240px',
          background: 'rgba(255,255,255,.06)',
          transform: 'rotate(-20deg)',
          pointerEvents: 'none'
        }}></div>
        {/* Logo */}
        <div className="s-logo" style={{ 
          padding: '10px 20px 20px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          borderBottom: '1px solid rgba(255,231,151,.18)', 
          flexShrink: 0
        }}>
          <img 
            src="/logo.png" 
            alt="PayRoll Management System" 
            style={{ 
              width: sidebarCollapsed ? '50px' : '180px', 
              height: sidebarCollapsed ? '25px' : '50px',
              transition: 'width .35s cubic-bezier(.77,0,.18,1), height .35s cubic-bezier(.77,0,.18,1)',
              backgroundColor: '#ffffff',
              padding: '4px'
            }} 
          />
        </div>

        {/* Navigation */}
        <nav className="s-nav">
          {menuItems.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => {
                  console.log('Navigating to:', item.path); // Debug log
                  navigate(item.path);
                }}
                className={`s-item ${activePage === item.id ? 'active' : ''}`}
                data-tip={item.label}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '13px 20px',
                  cursor: 'pointer',
                  color: activePage === item.id ? '#FFE797' : 'rgba(255,255,255,.78)',
                  fontSize: '14px',
                  fontWeight: activePage === item.id ? '600' : '500',
                  textDecoration: 'none',
                  transition: 'background .2s, color .2s, padding .2s',
                  whiteSpace: 'nowrap',
                  borderLeft: activePage === item.id ? '3px solid #FFE797' : '3px solid transparent',
                  backgroundColor: activePage === item.id ? 'rgba(255,231,151,.15)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (sidebarCollapsed) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.1)';
                    const tooltip = e.currentTarget.querySelector('.sidebar-tooltip');
                    if (tooltip) {
                      tooltip.style.opacity = '1';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (sidebarCollapsed && activePage !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    const tooltip = e.currentTarget.querySelector('.sidebar-tooltip');
                    if (tooltip) {
                      tooltip.style.opacity = '0';
                    }
                  }
                }}
              >
                <span className="s-icon">
                  {item.id === 'home' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/>
                    </svg>
                  )}
                  {item.id === 'employees' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
                      <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
                    </svg>
                  )}
                  {item.id === 'hours' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>
                  )}
                  {item.id === 'rates' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4zm3 0a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3z"/>
                      <path d="M7 8a1 1 0 0 1 1-1h.01a1 1 0 0 1 1 1H8zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-6 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                    </svg>
                  )}
                  {item.id === 'periods' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                    </svg>
                  )}
                  {item.id === 'payslip' && (
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                      <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.28-.62.513-.99.639a1.4 1.4 0 0 1-.699.063z"/>
                    </svg>
                  )}
                </span>
                <span className="s-label" style={{ 
                  opacity: sidebarCollapsed ? 0 : 1, 
                  transition: 'opacity .2s ease',
                  pointerEvents: sidebarCollapsed ? 'none' : 'auto'
                }}>{item.label}</span>
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="sidebar-tooltip" style={{
                    position: 'absolute',
                    left: '72px',
                    background: '#132440',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity .15s',
                    zIndex: 999,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="s-divider"></div>
          
          <div
            onClick={handleLogout}
            className="s-item logout"
            data-tip="Log Out"
          >
            <span className="s-icon">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
            </span>
            <span className="s-label" style={{ 
              opacity: sidebarCollapsed ? 0 : 1, 
              transition: 'opacity .2s ease',
              pointerEvents: sidebarCollapsed ? 'none' : 'auto'
            }}>Log Out</span>
          </div>
        </nav>

        {/* Toggle Button */}
        <div className="s-footer" style={{ 
          padding: sidebarCollapsed ? '16px 8px' : '16px 20px', 
          borderTop: '1px solid rgba(255,231,151,.12)', 
          marginTop: 'auto' 
        }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="s-toggle"
            style={{
              width: '100%', 
              height: '36px',
              background: 'rgba(255,255,255,.1)',
              border: 'none', 
              borderRadius: '8px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background .2s',
              padding: sidebarCollapsed ? '0' : '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.1)';
            }}
          >
            <span className="toggle-arrow">
              {sidebarCollapsed ? '▶' : '◀'}
            </span>
            <span style={{ 
              opacity: sidebarCollapsed ? 0 : 1, 
              transition: 'opacity .2s ease',
              pointerEvents: sidebarCollapsed ? 'none' : 'auto',
              width: sidebarCollapsed ? '0' : 'auto',
              overflow: 'hidden'
            }}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`main ${sidebarCollapsed ? 'shifted' : ''}`}
        style={{
          marginLeft: sidebarCollapsed ? '68px' : '260px',
          width: `calc(100vw - ${sidebarCollapsed ? '68px' : '260px'})`,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Top Bar - Hide on payslip page */}
        {activePage !== 'payslip' && (
          <header 
            className="topbar no-print"
            style={{
              background: '#FFFFFF',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(167, 39, 3, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#132440',
              margin: 0 
            }}>
              {pageTitles[activePage]}
            </h1>
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              margin: '4px 0 0 0' 
            }}>
              {pageSubtitles[activePage]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#FFE797',
              color: '#A72703',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Admin
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              background: '#A72703',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              AD
            </div>
          </div>
          </header>
        )}

        {/* Page Content */}
        <div 
          className="page active"
          style={{
            flex: 1,
            padding: '24px',
            width: '100%',
            boxSizing: 'border-box',
            maxWidth: 'none', // Remove any max-width constraints
            display: 'block', // Ensure it's always visible
            opacity: 1 // Ensure it's not hidden
          }}
        >
          {renderActivePage()}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        size="sm"
        closeOnOverlayClick={true}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: '20px' }}>
            <LogOut size={48} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              Confirm Logout
            </h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
              Are you sure you want to log out of the system?
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setShowLogoutModal(false)}
              style={{
                padding: '10px 20px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f9fafb';
                e.target.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={confirmLogout}
              style={{
                padding: '10px 20px',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#b91c1c';
                e.target.style.borderColor = '#b91c1c';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.borderColor = '#dc2626';
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollManagement;
