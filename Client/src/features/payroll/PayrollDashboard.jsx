import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../api/employee.api';
import paySlipAPI from '../../api/paySlip.api';
import employeeRateAPI from '../../api/employeeRate.api';
import ShimmerLoader from '../../components/ui/ShimmerLoader';
import { CardShimmer } from '../../components/ui/ShimmerLoader';
import { getRecentActivities } from '../../utils/activityLog';

const PAYSLIP_DOWNLOAD_COUNTER_KEY = 'payslipDownloadsByMonth';

const getDownloadedPaySlipsCount = (yearValue, monthValue) => {
  const storageKey = `${yearValue}-${monthValue}`;
  const raw = localStorage.getItem(PAYSLIP_DOWNLOAD_COUNTER_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Number(parsed?.[storageKey]) || 0;
  } catch {
    return 0;
  }
};

const PayrollDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [employeesRes, paySlipsRes, ratesRes] = await Promise.all([
        employeeAPI.getAllEmployees({ page: 1, limit: 1 }),
        paySlipAPI.getPaySlips({ limit: 100 }),
        employeeRateAPI.getAllEmployeeRates()
      ]);

      const employees = employeesRes?.data?.employees || [];
      const totalEmployees = employeesRes?.data?.pagination?.total ?? employees.length;
      const paySlips = paySlipsRes?.data?.paySlips || paySlipsRes?.data?.data || [];
      
      // Handle rates data - check different possible structures (same as HourlyRates)
      let rates = [];
      if (ratesRes.data?.rates) {
        rates = ratesRes.data.rates;
      } else if (ratesRes.data?.employeeRates) {
        rates = ratesRes.data.employeeRates;
      } else if (ratesRes.data) {
        rates = Array.isArray(ratesRes.data) ? ratesRes.data : [ratesRes.data];
      } else if (ratesRes.rates) {
        rates = ratesRes.rates;
      }

      console.log('Dashboard data:', { employees, paySlips, rates }); // Debug log

      // Calculate stats based on employee rates for full monthly salary
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Calculate total monthly payroll from all employee rates (full month salary)
      const totalMonthlyPayroll = (rates && Array.isArray(rates)) 
        ? rates.reduce((sum, rate) => {
            // Calculate monthly salary: billing rate × 22 working days × 8 hours = 176 hours per month
            const monthlySalary = (rate.billingRate || 0) * 176; // Standard full month work hours
            return sum + monthlySalary;
          }, 0)
        : 0;

      // Get current month payslips for payslip count
      const thisMonthPaySlips = (paySlips && Array.isArray(paySlips)) 
        ? paySlips.filter(ps => ps.month === currentMonth && ps.year === currentYear)
        : [];

      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const thisMonthDownloadedPaySlips = getDownloadedPaySlipsCount(currentYear, currentMonth);
      const lastMonthDownloadedPaySlips = getDownloadedPaySlipsCount(lastMonthYear, lastMonth);

      // Calculate last month payroll from employee rates (for growth comparison)
      const lastMonthPayroll = (rates && Array.isArray(rates)) 
        ? rates.reduce((sum, rate) => {
            const monthlySalary = (rate.billingRate || 0) * 176;
            return sum + monthlySalary;
          }, 0)
        : 0;

      // Calculate payroll growth (based on employee count/rate changes)
      const payrollGrowth = lastMonthPayroll > 0 
        ? ((totalMonthlyPayroll - lastMonthPayroll) / lastMonthPayroll * 100).toFixed(1)
        : 0;

      // Calculate actual paid payroll from generated payslips (for additional insight)
      const actualPaidPayroll = thisMonthPaySlips.reduce((sum, ps) => {
        if (ps.grossPay) {
          return sum + ps.grossPay;
        } else if (ps.basicPay) {
          return sum + ps.basicPay;
        } else if (ps.hourlyRate && ps.totalHours) {
          return sum + (ps.hourlyRate * ps.totalHours);
        }
        return sum;
      }, 0);

      const employeeGrowth = totalEmployees > 0 ? "+1" : "0";

      // Format stats
      const formattedStats = [
        { 
          icon: <PeopleIcon />, 
          lbl: "Total Employees", 
          val: totalEmployees.toString(), 
          grow: `${employeeGrowth} This month` 
        },
        { 
          icon: <MoneyIcon />, 
          lbl: "Monthly Payroll (Total)", 
          val: `₱${(totalMonthlyPayroll / 1000).toFixed(1)}k`, 
          grow: `${payrollGrowth > 0 ? '+' : ''}${payrollGrowth}% This month`
        },
        { 
          icon: <DocumentIcon />, 
          lbl: "Payslips Generated", 
          val: thisMonthDownloadedPaySlips.toString(), 
          grow: `+${Math.max(0, thisMonthDownloadedPaySlips - lastMonthDownloadedPaySlips)} This month` 
        },
      ];

      // Add additional info for display (optional, for future use)
      const payrollInfo = {
        totalMonthly: totalMonthlyPayroll,      // Total salary for all employees (full month)
        actualPaid: actualPaidPayroll,          // Actual paid from generated payslips
        employeeCount: totalEmployees
      };

      console.log('Payroll calculation:', { 
        totalMonthlyPayroll, 
        actualPaidPayroll, 
        employeeCount: employees ? employees.length : 0,
        thisMonthPaySlips: thisMonthPaySlips.length,
        thisMonthDownloadedPaySlips,
        rates: rates.length 
      });

      const activities = [];
      
      const recentPaySlips = (paySlips && Array.isArray(paySlips)) 
        ? paySlips.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 3)
        : [];

      recentPaySlips.forEach(ps => {
        activities.push({
          ts: new Date(ps.createdAt || Date.now()).getTime(),
          emp: ps.employee?.firstName && ps.employee?.lastName 
            ? `${ps.employee.firstName} ${ps.employee.lastName}`
            : 'Unknown Employee',
          date: new Date(ps.createdAt || Date.now()).toLocaleDateString('en-GB'),
          action: 'Pay Slip Generated',
          status: 'Done'
        });
      });

      const recentRates = (rates && Array.isArray(rates))
        ? rates.sort((a, b) => new Date(b.lastUpdated || b.updatedAt || b.createdAt || 0) - new Date(a.lastUpdated || a.updatedAt || a.createdAt || 0)).slice(0, 3)
        : [];

      recentRates.forEach(rate => {
        activities.push({
          ts: new Date(rate.lastUpdated || rate.updatedAt || rate.createdAt || Date.now()).getTime(),
          emp: rate.employee?.firstName && rate.employee?.lastName
            ? `${rate.employee.firstName} ${rate.employee.lastName}`
            : 'Unknown Employee',
          date: new Date(rate.lastUpdated || Date.now()).toLocaleDateString('en-GB'),
          action: 'Rate Updated',
          status: 'Done'
        });
      });

      const localActivities = getRecentActivities().map(a => ({
        ts: a.ts || Date.now(),
        emp: a.emp || 'System',
        date: new Date(a.ts || Date.now()).toLocaleDateString('en-GB'),
        action: a.action || 'Activity',
        status: a.status || 'Done'
      }));

      const merged = [...activities, ...localActivities];
      const sortedActivities = merged
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .slice(0, 5)
        .map(item => ({
          emp: item.emp,
          date: new Date(item.ts || Date.now()).toLocaleDateString('en-GB'),
          action: item.action,
          status: item.status
        }));

      setStats(formattedStats);
      setRecentActivity(sortedActivities);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // SVG Icon Components
  const PeopleIcon = () => (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );

  const MoneyIcon = () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );

  const DocumentIcon = () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );

  return (
    <div style={{ padding: '10px 36px 36px 36px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #671700 7%, #801C00 29%, #8D1F00 51%, #9A2200 75%)',
        borderRadius: '20px',
        padding: '20px 40px 36px 40px',
        color: '#FFFFFF',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Diagonal accent strip - centered but higher */}
        <div style={{
          content: '',
          position: 'absolute',
          top: '0%',
          left: '50%',
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,.08)',
          transform: 'translate(-50%, -50%) rotate(20deg)',
          pointerEvents: 'none'
        }}></div>
        
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '30px',
          fontWeight: 900,
          marginBottom: '6px'
        }}>
          Good day, <span style={{ color: '#FFE797', fontWeight: 700 }}>Administrator</span> 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '15px' }}>
          Here's a quick overview of your payroll system today.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ marginBottom: '20px' }}>
          <CardShimmer count={3} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={fetchDashboardData}
            style={{
              marginLeft: '12px',
              padding: '4px 12px',
              background: '#991b1b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid - Only show when not loading */}
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              borderLeft: '4px solid #610000',
              boxShadow: '0 2px 12px rgba(19,36,64,.07)',
              transition: 'transform .2s, box-shadow .2s',
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: '#f4ede6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '20px',
                color: '#A72703'
              }}>
                {stat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#8a8a8a',
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  marginBottom: '3px'
                }}>{stat.lbl}</div>
                <div style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#132440',
                  fontFamily: "'Playfair Display', serif",
                  lineHeight: '1'
                }}>{stat.val}</div>
                <div style={{
                  fontSize: '11.5px',
                  color: '#10b981',
                  marginTop: '4px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  <span style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderBottom: '6px solid #10b981',
                    display: 'inline-block'
                  }}></span>
                  {stat.grow}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Section - Only show when not loading */}
      {!loading && !error && (
        <>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#132440',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            marginBottom: '12px',
            marginTop: '4px'
          }}>Recent Activity</div>

          {/* Activity Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(19,36,64,.07)'
          }}>
            {recentActivity.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#A72703' }}>
                    <th style={{ 
                      padding: '11px 16px', 
                      textAlign: 'left', 
                      color: '#FFFFFF', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      letterSpacing: '.08em', 
                      textTransform: 'uppercase' 
                    }}>Employee</th>
                    <th style={{ 
                      padding: '11px 16px', 
                      textAlign: 'left', 
                      color: '#FFFFFF', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      letterSpacing: '.08em', 
                      textTransform: 'uppercase' 
                    }}>Date</th>
                    <th style={{ 
                      padding: '11px 16px', 
                      textAlign: 'left', 
                      color: '#FFFFFF', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      letterSpacing: '.08em', 
                      textTransform: 'uppercase' 
                    }}>Actions</th>
                    <th style={{ 
                      padding: '11px 16px', 
                      textAlign: 'left', 
                      color: '#FFFFFF', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      letterSpacing: '.08em', 
                      textTransform: 'uppercase' 
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity, index) => (
                    <tr key={index} style={{ 
                      borderBottom: '1px solid #f0ece7', 
                      transition: 'background .15s' 
                    }}>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontSize: '13.5px', 
                        color: '#132440' 
                      }}>{activity.emp}</td>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontSize: '13.5px', 
                        color: '#132440' 
                      }}>{activity.date}</td>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontSize: '13.5px', 
                        color: '#132440' 
                      }}>{activity.action}</td>
                      <td style={{ 
                        padding: '12px 16px', 
                        fontSize: '13.5px', 
                        color: '#132440' 
                      }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 16px',
                          borderRadius: '20px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#d1fae5',
                          color: '#065f46'
                        }}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                No recent activity to display
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PayrollDashboard;
