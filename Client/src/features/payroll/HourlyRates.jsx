import React, { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, Users } from 'lucide-react';
import employeeRateAPI from '../../api/employeeRate.api';
import { employeeAPI } from '../../api/employee.api';
import ShimmerLoader from '../../components/ui/ShimmerLoader';
import { TableShimmer } from '../../components/ui/ShimmerLoader';

const HourlyRates = () => {
  const [rates, setRates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employee: '',
    billingRate: '',
    overtimeRate: '',
    outOfTownRate: '',
    cashAdvanceLimit: '',
  });

  // Fetch employees and rates
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [employeesResponse, ratesResponse] = await Promise.all([
        employeeAPI.getAllEmployees({ status: 'active', limit: 100 }),
        employeeRateAPI.getAllEmployeeRates({ limit: 100 })
      ]);
      
      // Handle employee data
      const employeesData = employeesResponse.data?.employees || employeesResponse.data || [];
      setEmployees(employeesData);
      
      // Handle rates data - check different possible structures
      let ratesData = [];
      if (ratesResponse.data?.rates) {
        ratesData = ratesResponse.data.rates;
      } else if (ratesResponse.data) {
        ratesData = Array.isArray(ratesResponse.data) ? ratesResponse.data : [ratesResponse.data];
      } else if (ratesResponse.rates) {
        ratesData = ratesResponse.rates;
      }
      
      setRates(ratesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding new rate
  const openAddModal = () => {
    setFormData({
      employee: '',
      billingRate: '',
      overtimeRate: '',
      outOfTownRate: '',
      cashAdvanceLimit: '',
    });
    setEditingId(null);
    setShowModal(true);
  };

  // Open modal for editing rate
  const openEditModal = (rate) => {
    setFormData({
      employee: rate.employee._id,
      billingRate: rate.billingRate.toString(),
      overtimeRate: rate.overtimeRate.toString(),
      outOfTownRate: rate.outOfTownRate.toString(),
      cashAdvanceLimit: rate.cashAdvanceLimit.toString(),
    });
    setEditingId(rate._id);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      employee: '',
      billingRate: '',
      overtimeRate: '',
      outOfTownRate: '',
      cashAdvanceLimit: '',
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      
      await employeeRateAPI.createOrUpdateEmployeeRate(formData);
      
      // Refresh data
      await fetchData();
      closeModal();
    } catch (err) {
      console.error('Error saving rate:', err);
      setError(err.response?.data?.message || 'Failed to save rate');
    }
  };

  
  const handleBulkUpdate = () => {
    alert('Bulk update feature coming soon!');
  };

  const handleClear = () => {
    setFormData({
      employee: 'Alvina S. Cudo',
      billingRate: '',
      overtimeRate: '',
      outOfTownRate: '',
      cashAdvanceLimit: '',
      effectiveDate: '',
    });
    setEditingId(null);
  };

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div style={{ padding: '0', width: '100%' }}>
      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
        <button
          onClick={openAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 26px',
            background: '#610000',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '50px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: 'normal',
            boxShadow: '0 3px 12px rgba(167,39,3,.3)',
            transition: 'all .2s'
          }}
        >
          <DollarSign size={18} />
          Set / Update Rate
        </button>
      </div>

      {/* Current Rates Header */}
      <div className="sec-head" style={{ fontFamily: "Playfair Display, serif", fontSize: '17px', fontWeight: '700', color: 'var(--navy)', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        Current Rates
        <div style={{ flex: 1, height: '2px', background: 'linear-gradient(to right,#e0d4c8,transparent)', minWidth: '50px' }}></div>
      </div>

      {/* Rates Table */}
      <div>
        <div className="tbl-wrap" style={{ background: 'var(--white)', borderRadius: '13px', overflow: 'hidden', boxShadow: '0 2px 14px rgba(19,36,64,.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#610000' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Employee</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Designation</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Billing Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Overtime Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Out-of-Town Rate</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Cash Advance Limit</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Last Updated</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '2px solid #e8dfd6' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '20px' }}>
                    <TableShimmer rows={3} columns={6} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#ef4444', fontSize: '13.5px' }}>
                    {error}
                  </td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13.5px' }}>
                    No employee rates found. Click "Add New Rate" to get started.
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                <tr key={rate._id} style={{ borderBottom: '1px solid #e8dfd6' }}>
                  <td style={{ padding: '12px', fontSize: '13.5px', color: 'var(--navy)' }}>
                    {rate.employee.name || `${rate.employee.firstName} ${rate.employee.middleInitial ? rate.employee.middleInitial + '. ' : ''}${rate.employee.lastName}`}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13.5px', color: 'var(--navy)' }}>{rate.employee.designation}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{rate.billingRate.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{rate.overtimeRate.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{rate.outOfTownRate.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{rate.cashAdvanceLimit.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13.5px', color: 'var(--navy)' }}>
                    {new Date(rate.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => openEditModal(rate)} 
                      className="btn btn-out btn-sm"
                      style={{ 
                        padding: '4px 11px', 
                        fontSize: '11.5px', 
                        borderRadius: '7px', 
                        fontFamily: "'DM Sans', sans-serif", 
                        fontWeight: '600', 
                        cursor: 'pointer', 
                        border: 'none', 
                        background: 'var(--red)', 
                        color: 'var(--white)' 
                      }}
                    >
                      <Edit size={12} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Update Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--white)',
            borderRadius: '13px',
            padding: '22px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: '17px', fontWeight: '700', color: 'var(--navy)', margin: 0 }}>
                {editingId ? 'Update Rate' : 'Set Rate'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Employee</label>
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={handleInputChange}
                    required
                    style={{ padding: '9px 12px', border: '2px solid #e8dfd6', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: 'var(--navy)', background: 'var(--white)', outline: 'none', transition: 'border-color .2s' }}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name || `${emp.firstName} ${emp.middleInitial ? emp.middleInitial + '. ' : ''}${emp.lastName}`} - {emp.designation}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Billing Rate (₱/hr)</label>
                  <input
                    type="number"
                    name="billingRate"
                    value={formData.billingRate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{ padding: '9px 12px', border: '2px solid #e8dfd6', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: 'var(--navy)', background: 'var(--white)', outline: 'none', transition: 'border-color .2s' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Overtime Rate (₱/hr)</label>
                  <input
                    type="number"
                    name="overtimeRate"
                    value={formData.overtimeRate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{ padding: '9px 12px', border: '2px solid #e8dfd6', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: 'var(--navy)', background: 'var(--white)', outline: 'none', transition: 'border-color .2s' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Out-of-Town Rate</label>
                  <input
                    type="number"
                    name="outOfTownRate"
                    value={formData.outOfTownRate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{ padding: '9px 12px', border: '2px solid #e8dfd6', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: 'var(--navy)', background: 'var(--white)', outline: 'none', transition: 'border-color .2s' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Cash Advance Limit (₱)</label>
                  <input
                    type="number"
                    name="cashAdvanceLimit"
                    value={formData.cashAdvanceLimit}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{ padding: '9px 12px', border: '2px solid #e8dfd6', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', color: 'var(--navy)', background: 'var(--white)', outline: 'none', transition: 'border-color .2s' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '7px', 
                    padding: '9px 20px', 
                    borderRadius: '8px', 
                    fontFamily: "'DM Sans', sans-serif", 
                    fontSize: '13.5px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    border: 'none', 
                    transition: 'all .2s', 
                    background: 'transparent', 
                    color: 'var(--red)', 
                    border: '2px solid var(--red)' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '7px', 
                    padding: '9px 20px', 
                    borderRadius: '8px', 
                    fontFamily: "'DM Sans', sans-serif", 
                    fontSize: '13.5px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    border: 'none', 
                    transition: 'all .2s', 
                    background: 'var(--red)', 
                    color: 'var(--white)' 
                  }}
                >
                  {editingId ? 'Update Rate' : 'Set Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourlyRates;
