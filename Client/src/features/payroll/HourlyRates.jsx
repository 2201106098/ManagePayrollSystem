import React, { useState, useEffect } from 'react';
import { Edit, Save, Users } from 'lucide-react';
import employeeRateAPI from '../../api/employeeRate.api';
import { employeeAPI } from '../../api/employee.api';
import ShimmerLoader from '../../components/ui/ShimmerLoader';
import { TableShimmer } from '../../components/ui/ShimmerLoader';
import { addActivity } from '../../utils/activityLog';

const HourlyRates = () => {
  const [rates, setRates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showZeroModal, setShowZeroModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [formData, setFormData] = useState({
    employee: '',
    billingRate: '',
    overtimeRate: '',
    outOfTownRate: '',
    cashAdvanceLimit: '',
  });
  const isFormIncomplete = !formData.employee;

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
  const proceedSave = async (payload) => {
    try {
      setIsSaving(true);
      setError('');
      if (editingId) {
        await employeeRateAPI.updateEmployeeRate(editingId, payload);
      } else {
        await employeeRateAPI.createOrUpdateEmployeeRate(payload);
      }
      const target = employees.find(e => e._id === (payload.employee || formData.employee));
      const empName = target ? `${target.firstName||''} ${target.middleInitial?target.middleInitial+'. ':''}${target.lastName||''}`.trim() : 'Employee';
      addActivity({ emp: empName || 'Employee', action: 'Rate Updated', status: 'Done' });
      await fetchData();
      setShowZeroModal(false);
      setPendingPayload(null);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save rate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const payload = {
      employee: formData.employee,
      billingRate: parseFloat(formData.billingRate) || 0,
      overtimeRate: parseFloat(formData.overtimeRate) || 0,
      outOfTownRate: parseFloat(formData.outOfTownRate) || 0,
      cashAdvanceLimit: parseFloat(formData.cashAdvanceLimit) || 0
    };
    const allZeroRates = payload.billingRate === 0 && payload.overtimeRate === 0 && payload.outOfTownRate === 0;
    if (allZeroRates) {
      setPendingPayload(payload);
      setShowZeroModal(true);
      return;
    }
    await proceedSave(payload);
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
          <i className="fa-solid fa-peso-sign" style={{ fontSize: '16px' }}></i>
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
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{Number(rate.billingRate).toFixed(3)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{Number(rate.overtimeRate).toFixed(3)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{Number(rate.outOfTownRate).toFixed(3)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>₱{rate.cashAdvanceLimit.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13.5px', color: 'var(--navy)' }}>
                    {new Date(rate.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      title="Edit"
                      onClick={() => openEditModal(rate)} 
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#610000',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
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
          inset: 0,
          background: 'rgba(0,0,0,.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '28px 30px',
            width: '90%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 12px 48px rgba(0,0,0,.22)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '18px',
                fontWeight: '600',
                color: '#610000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {editingId ? 'Update Rate' : 'Set Rate'}
              </div>
              <button
                onClick={closeModal}
                disabled={isSaving}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  color: '#8a8a8a',
                  lineHeight: 1,
                  padding: '2px 6px',
                  opacity: isSaving ? 0.5 : 1
                }}
              >
                ×
              </button>
            </div>
            {error && (
              <div style={{ marginBottom: '12px', color: '#ef4444', fontSize: '13px' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#610000', textTransform: 'uppercase', letterSpacing: '.07em' }}>Employee</label>
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    required
                    style={{
                      padding: '9px 12px',
                      border: '2px solid #e8dfd6',
                      borderRadius: '8px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13.5px',
                      color: '#111827',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
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
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#610000', textTransform: 'uppercase', letterSpacing: '.07em' }}>Billing Rate (₱/hr)</label>
                  <input
                    type="number"
                    name="billingRate"
                    value={formData.billingRate}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    placeholder="0.000"
                    step="0.001"
                    min="0"
                    style={{
                      padding: '9px 12px',
                      border: '2px solid #e8dfd6',
                      borderRadius: '8px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13.5px',
                      color: '#111827',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#610000', textTransform: 'uppercase', letterSpacing: '.07em' }}>Overtime Rate (₱/hr)</label>
                  <input
                    type="number"
                    name="overtimeRate"
                    value={formData.overtimeRate}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    placeholder="0.000"
                    step="0.001"
                    min="0"
                    style={{
                      padding: '9px 12px',
                      border: '2px solid #e8dfd6',
                      borderRadius: '8px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13.5px',
                      color: '#111827',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#610000', textTransform: 'uppercase', letterSpacing: '.07em' }}>Out-of-Town Rate</label>
                  <input
                    type="number"
                    name="outOfTownRate"
                    value={formData.outOfTownRate}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    placeholder="0.000"
                    step="0.001"
                    min="0"
                    style={{
                      padding: '9px 12px',
                      border: '2px solid #e8dfd6',
                      borderRadius: '8px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13.5px',
                      color: '#111827',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#610000', textTransform: 'uppercase', letterSpacing: '.07em' }}>Cash Advance Limit</label>
                  <input
                    type="number"
                    name="cashAdvanceLimit"
                    value={formData.cashAdvanceLimit}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    style={{
                      padding: '9px 12px',
                      border: '2px solid #e8dfd6',
                      borderRadius: '8px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13.5px',
                      color: '#111827',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '22px',
                justifyContent: 'flex-end'
              }}>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  disabled={isSaving}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '2px solid #610000',
                    background: 'transparent',
                    color: '#610000',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || isFormIncomplete}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: (isSaving || isFormIncomplete) ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: (isSaving || isFormIncomplete) ? '#ccc' : '#610000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSaving && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                  )}
                  {isSaving ? 'Saving rate...' : (editingId ? 'Update Rate' : 'Set Rate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showZeroModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '22px',
            width: '92%',
            maxWidth: '460px',
            boxShadow: '0 16px 48px rgba(0,0,0,.25)'
          }}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',fontWeight:700,color:'#132440',marginBottom:'6px'}}>
              Zero Pay Detected
            </div>
            <div style={{fontSize:'13.5px',color:'#4b5563',lineHeight:1.6,marginBottom:'2px'}}>
              This payslip results in a total pay of 0.
            </div>
            <div style={{fontSize:'13.5px',color:'#4b5563',lineHeight:1.6,marginBottom:'14px'}}>
              Do you want to continue?
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
              <button
                onClick={()=>{ setShowZeroModal(false); setPendingPayload(null); }}
                style={{padding:'9px 16px',borderRadius:'8px',border:'2px solid #610000',background:'transparent',color:'#610000',fontWeight:700}}
              >
                Cancel
              </button>
              <button
                onClick={()=> pendingPayload && proceedSave(pendingPayload)}
                disabled={isSaving}
                style={{padding:'9px 16px',borderRadius:'8px',border:'none',background:'#610000',color:'#fff',fontWeight:700,opacity:isSaving?0.6:1,cursor:isSaving?'not-allowed':'pointer'}}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourlyRates;
