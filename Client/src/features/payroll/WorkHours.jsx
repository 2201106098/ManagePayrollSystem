import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock } from 'lucide-react';
import workHoursAPI from '../../api/workHours.api';
import { employeeAPI } from '../../api/employee.api';
import ShimmerLoader from '../../components/ui/ShimmerLoader';
import { TableShimmer, CardShimmer } from '../../components/ui/ShimmerLoader';

/* ── constants ── */
const RED    = "#610000";
const NAVY   = "#132440";
const WHITE  = "#FFFFFF";
const BORDER = "#e5e7eb";

// API optimization constants
const DEBOUNCE_DELAY = 1000; // 1 second debounce
const BATCH_DELAY = 2000; // 2 seconds for batch operations
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests (increased from 500ms)
const INITIAL_LOAD_DELAY = 3000; // 3 seconds between initial loads


const DEF          = { timeIn:"08:30", breakTime:"12:00", resume:"13:00", timeOut:"17:30", overtime:"0.00" };
const DEF_HD_MORNING   = { timeIn:"08:30", breakTime:"", resume:"", timeOut:"12:30", overtime:"0.00" };
const DEF_HD_AFTERNOON = { timeIn:"13:00", breakTime:"", resume:"", timeOut:"17:30", overtime:"0.00" };

const PER_PAGE = 5;
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ── helpers ── */
const isoDate        = d => d.toISOString().slice(0,10);
const fmtDisplayDate = d => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const isWeekday      = ds => { const d = new Date(ds+"T00:00:00"); return d.getDay()!==0 && d.getDay()!==6; };

// API optimization utilities
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const rateLimit = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(null, args);
    } else {
      console.log('Rate limiting API call, skipping...');
      return Promise.resolve({ skipped: true });
    }
  };
};

// Create a simple cache
const createCache = (ttl = 30000) => { // 30 seconds TTL
  const cache = new Map();
  return {
    get: (key) => {
      const item = cache.get(key);
      if (item && Date.now() - item.timestamp < ttl) {
        return item.data;
      }
      cache.delete(key);
      return null;
    },
    set: (key, data) => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    delete: (key) => {
      cache.delete(key);
    },
    clear: () => cache.clear()
  };
};

function calcHrs(r) {
  if (!r?.timeIn || !r?.timeOut) return 0;
  const m = t => { const [H,M]=t.split(":").map(Number); return H*60+M; };
  let tot = m(r.timeOut) - m(r.timeIn);
  if (r.breakTime && r.resume) tot -= m(r.resume) - m(r.breakTime);
  return Math.max(0, tot/60);
}
const fmtH = h => h>0 ? h.toFixed(2) : "—";

const formatTime12 = t => {
  if (!t) return "";
  const p = t.split(":");
  if (p.length!==2) return "";
  const H=parseInt(p[0]), M=parseInt(p[1]);
  if (isNaN(H)||isNaN(M)) return "";
  return `${H%12||12}:${String(M).padStart(2,"0")} ${H>=12?"PM":"AM"}`;
};
const parseTime12 = s => {
  if (!s) return "";
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return "";
  let h=parseInt(m[1]);
  if (m[3].toUpperCase()==="PM"&&h!==12) h+=12;
  if (m[3].toUpperCase()==="AM"&&h===12) h=0;
  return `${String(h).padStart(2,"0")}:${m[2]}`;
};

/* generate future dates (weekdays only) from today for N days */
function futureDates(fromDs, count=60) {
  const result=[];
  const d = new Date(fromDs+"T00:00:00");
  for (let i=0; i<count; i++) {
    d.setDate(d.getDate()+1);
    const ds=isoDate(d);
    if (isWeekday(ds)) result.push(ds);
  }
  return result;
}


/* ── icons ── */
const IcoEdit   = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoChevL  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IcoChevR  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>;
const IcoUndo   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>;
const IcoHalf   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor"/></svg>;
const IcoAbsent = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoOutTown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoInfo   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function RecordWorkHours() {
  const today = new Date();
  const todayDs = isoDate(today);

  /* ── core state ── */
  const [logs,         setLogs]         = useState({});
  const [employees,   setEmployees]     = useState([]);
  const [loading,     setLoading]       = useState(false);
  const [error,       setError]         = useState('');
  const [statuses,     setStatuses]     = useState({}); // "E001-ds" => "absent"|"halfday_morning"|"halfday_afternoon"
  const [curDate,      setCurDate]      = useState(new Date(today));
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [clockStr,     setClockStr]     = useState("");
  const [clockDate,    setClockDate]    = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [editEmp,      setEditEmp]      = useState(null);
  const [editForm,     setEditForm]     = useState({...DEF});
  const [savedRows,    setSavedRows]    = useState({});
  const [modifiedRows, setModifiedRows] = useState({});
  const [hov,          setHov]          = useState(null);
  const [hovRow,       setHovRow]       = useState(null);
  const [modalTab,     setModalTab]     = useState("all");
  const selEmp = employees[0] || {}; // Update when employees are loaded
  const [confirmModal, setConfirmModal] = useState({open:false,emp:null,type:null,halfDayType:"morning"});
  const [toast,        setToast]        = useState(null); // { msg, type }

  /*
   * ── AUTO-FILL TEMPLATES ──
   *
   * globalTemplate  : { timeIn, breakTime, resume, timeOut }
   *   — applies to ALL employees on future dates unless overridden.
   *
   * individualTemplates : { [empId]: { timeIn, breakTime, resume, timeOut } }
   *   — per-employee override; takes priority over globalTemplate.
   *
   * When navigating to a future date, for each employee:
   *   1. If individualTemplates[empId] exists → use it
   *   2. Else if globalTemplate exists         → use it
   *   3. Else                                  → use DEF
   *
   * "Future" means ds > today's date.
   * Past/present dates are never auto-overwritten.
   */
  const [globalTemplate,      setGlobalTemplate]      = useState(null);
  const [individualTemplates, setIndividualTemplates] = useState({}); // { empId: template }
  const [templatesLoaded,     setTemplatesLoaded]     = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);

  // API optimization state
  const [apiCache] = useState(() => createCache(30000)); // 30 seconds cache
  const [pendingUpdates, setPendingUpdates] = useState(new Set()); // Track pending updates
  const [lastApiCall, setLastApiCall] = useState(0);

  const ds        = isoDate(curDate);
  const isWeekend = curDate.getDay()===0 || curDate.getDay()===6;
  const isFuture  = ds > todayDs;

  const statusKey = eid => `${eid}-${ds}`;
  const getStatus = eid => statuses[statusKey(eid)] || null;

  /* ── DATA FETCHING ── */
  const fetchEmployees = async () => {
    const cacheKey = 'employees';
    
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      console.log('Using cached employees data');
      setEmployees(cached);
      return;
    }

    // Retry logic with exponential backoff
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Fetching employees from API... (attempt ${attempt + 1}/${maxRetries})`);
        const response = await employeeAPI.getAllEmployees({ status: 'active', limit: 100 });
        if (response.success && response.data) {
          const employeesData = Array.isArray(response.data) ? response.data : response.data.employees || [];
          setEmployees(employeesData);
          apiCache.set(cacheKey, employeesData);
          console.log('Successfully fetched employees:', employeesData.length, 'employees');
          return;
        }
      } catch (err) {
        console.error(`Error fetching employees (attempt ${attempt + 1}):`, err);
        
        // Check if it's a rate limit error
        if (err.response?.status === 429) {
          if (attempt < maxRetries - 1) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // 1s, 2s, 4s max
            console.log(`Rate limit hit, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          } else {
            console.error('Max retries reached for employees fetch');
            setError('Failed to fetch employees due to rate limiting');
          }
        } else {
          // Non-rate-limit error, don't retry
          setError('Failed to fetch employees');
          return;
        }
      }
    }
  };

  const fetchWorkHours = async (date) => {
    const cacheKey = `workHours-${date}`;
    
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      console.log('Using cached work hours data for', date);
      setLogs(cached.logs);
      setStatuses(cached.statuses);
      return;
    }

    // Retry logic with exponential backoff
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Rate limiting
        const now = Date.now();
        if (now - lastApiCall < RATE_LIMIT_DELAY) {
          console.log('Rate limiting work hours fetch, delaying...');
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
        setLastApiCall(Date.now());

        console.log(`Fetching work hours for date: ${date} (attempt ${attempt + 1}/${maxRetries})`);
        const response = await workHoursAPI.getWorkHoursByDate(date);
        
        console.log('Work hours API response:', response);
        console.log('Response success:', response.success);
        console.log('Response data:', response.data);
        console.log('Response data type:', typeof response.data);
        console.log('Response data isArray:', Array.isArray(response.data));
        
        const logsData = {};
        const statusesData = {};
        
        // Handle different response formats
        let workHoursData = [];
        if (response.success && response.data && Array.isArray(response.data)) {
          // Standard format: {success: true, data: [...]}
          workHoursData = response.data;
          console.log('Using standard response format with', workHoursData.length, 'records');
        } else if (Array.isArray(response)) {
          // Direct array format: [...]
          workHoursData = response;
          console.log('Using direct array format with', workHoursData.length, 'records');
        } else if (response.data && Array.isArray(response.data)) {
          // Alternative format: {data: [...]} (without success field)
          workHoursData = response.data;
          console.log('Using alternative data format with', workHoursData.length, 'records');
        } else {
          console.log('No valid work hour data found in any response format');
          console.log('Full response structure:', JSON.stringify(response, null, 2));
        }
        
        if (workHoursData.length > 0) {
          console.log('Processing', workHoursData.length, 'work hour records');
          workHoursData.forEach((workHour, index) => {
            console.log(`Processing work hour ${index + 1}:`, workHour);
            
            // Extract employee ID - handle both string ID and employee object
            let employeeId;
            if (typeof workHour.employee === 'string') {
              employeeId = workHour.employee;
            } else if (workHour.employee && workHour.employee._id) {
              employeeId = workHour.employee._id;
            } else if (workHour.employee && workHour.employee.id) {
              employeeId = workHour.employee.id;
            } else {
              console.error('Cannot extract employee ID from:', workHour.employee);
              return; // Skip this record
            }
            
            const dateKey = workHour.date.split('T')[0];
            
            console.log(`- Employee ID: ${employeeId}, Date: ${dateKey}`);
            console.log(`- Employee field type: ${typeof workHour.employee}`);
            console.log(`- Employee field value:`, workHour.employee);
            
            if (!logsData[employeeId]) {
              logsData[employeeId] = {};
            }
            
            logsData[employeeId][dateKey] = {
              timeIn: workHour.timeIn || '',
              breakTime: workHour.breakTime || '',
              resume: workHour.resume || '',
              timeOut: workHour.timeOut || '',
              overtime: workHour.overtime || 0,
              totalHours: workHour.totalHours || 0,
              status: workHour.status || 'present'
            };
            
            // Set status if not present
            if (workHour.status && workHour.status !== 'present') {
              statusesData[`${employeeId}-${dateKey}`] = workHour.status;
            }
          });
          
          console.log('Final logsData:', logsData);
          console.log('Final statusesData:', statusesData);
        } else {
          console.log('No work hour data found or empty array');
        }
        
        setLogs(logsData);
        setStatuses(statusesData);
        apiCache.set(cacheKey, { logs: logsData, statuses: statusesData });
        console.log('Successfully fetched work hours for', date);
        return;
        
      } catch (err) {
        console.error(`Error fetching work hours (attempt ${attempt + 1}):`, err);
        
        // Check if it's a rate limit error
        if (err.response?.status === 429) {
          if (attempt < maxRetries - 1) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // 1s, 2s, 4s max
            console.log(`Rate limit hit, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          } else {
            console.error('Max retries reached for work hours fetch');
            setError(err.message || 'Failed to fetch work hours due to rate limiting');
          }
        } else {
          // Non-rate-limit error, don't retry
          setError(err.message || 'Failed to fetch work hours');
          return;
        }
      }
    }
  };

  // Apply templates separately (moved from fetchWorkHours)
  const applyTemplatesToDate = useCallback((targetDate, currentLogs) => {
    console.log('=== APPLYING TEMPLATES TO DATE ===');
    console.log('Target date:', targetDate);
    console.log('Current logs:', currentLogs);
    console.log('Templates loaded:', templatesLoaded);
    console.log('Show template warning:', showTemplateWarning);
    console.log('Global template:', globalTemplate);
    console.log('Individual templates:', individualTemplates);
    console.log('Employees:', employees.map(e => ({ id: e._id, name: e.name || `${e.firstName} ${e.lastName}` })));
    
    if (!templatesLoaded) {
      console.log('Templates not loaded yet - skipping template application');
      return currentLogs;
    }

    // Check if we have any templates to apply (global or individual)
    const hasGlobalTemplate = globalTemplate && Object.keys(globalTemplate).length > 0;
    const hasAnyIndividualTemplates = Object.keys(individualTemplates).length > 0;
    const hasTemplatesToApply = hasGlobalTemplate || hasAnyIndividualTemplates;
    
    console.log('Template availability check:');
    console.log('- Has global template:', hasGlobalTemplate);
    console.log('- Has individual templates:', hasAnyIndividualTemplates);
    console.log('- Has templates to apply:', hasTemplatesToApply);
    
    if (!hasTemplatesToApply) {
      console.log('No templates available to apply - skipping template application');
      return currentLogs;
    }

    const updatedLogs = { ...currentLogs };
    const newTemplateApplications = [];
    
    console.log('Processing employees for template application...');
    employees.forEach(emp => {
      const existingData = updatedLogs[emp._id]?.[targetDate];
      // Check if employee has any meaningful work hour data (not just empty/default values)
      const hasExistingData = existingData && (
        existingData.timeIn || 
        existingData.breakTime || 
        existingData.resume || 
        existingData.timeOut ||
        (existingData.overtime && existingData.overtime > 0) ||
        existingData.status !== 'present'
      );
      const employeeName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp._id;
      
      console.log(`Checking employee ${employeeName} (${emp._id}):`);
      console.log('- Existing data:', existingData);
      console.log('- Has existing data:', hasExistingData);
      console.log('- Has individual template:', !!individualTemplates[emp._id]);
      console.log('- Has global template:', !!globalTemplate);
      
      // Apply template ONLY if there's no existing data
      // Never overwrite existing work hours with templates
      const template = (individualTemplates[emp._id] ?? globalTemplate) ?? DEF;
      const shouldApplyTemplate = !hasExistingData;
      
      console.log('- Template to apply:', template);
      console.log('- Should apply template:', shouldApplyTemplate);
      
      if (hasExistingData) {
        console.log('- Decision: Existing data found, skipping template to avoid overwriting');
      } else {
        console.log('- Decision: No existing data, will apply template');
      }
      
      if (shouldApplyTemplate) {
        console.log(`Applying template for ${employeeName}:`, template);
        
        updatedLogs[emp._id] = {
          ...(updatedLogs[emp._id] || {}),
          [targetDate]: { ...template }
        };
        
        // Track for auto-save
        const workHourData = {
          employeeId: emp._id,
          date: targetDate,
          ...template
        };
        
        console.log('Tracking for auto-save:', workHourData);
        newTemplateApplications.push(workHourData);
        
        console.log('Template applied locally:', template);
      } else {
        console.log(`Skipping template for ${employeeName} - existing work hours found, preserving data:`, existingData);
      }
    });
    
    console.log('New template applications:', newTemplateApplications.length);
    
    // Auto-save newly applied templates
    if (newTemplateApplications.length > 0) {
      console.log('=== AUTO-SAVING TEMPLATES ===');
      
      // Process sequentially with delays to avoid rate limiting
      newTemplateApplications.forEach(async (workHourData, index) => {
        try {
          // Add delay before each save (except first one)
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
          
          console.log(`Auto-saving template application ${index + 1}/${newTemplateApplications.length}:`, workHourData);
          
          // Ensure proper payload structure for backend
          const payload = {
            employeeId: workHourData.employeeId,
            date: workHourData.date,
            timeIn: workHourData.timeIn,
            breakTime: workHourData.breakTime,
            resume: workHourData.resume,
            timeOut: workHourData.timeOut,
            overtime: workHourData.overtime || 0,
            status: 'present'
          };
          
          const result = await workHoursAPI.createOrUpdateWorkHour(payload);
          console.log(`Auto-saved template for employee ${workHourData.employeeId}:`, result);
          
          // Mark as saved
          setSavedRows(prev => ({
            ...prev,
            [`${workHourData.employeeId}-${workHourData.date}`]: true
          }));
          
        } catch (err) {
          console.error('Error auto-saving template:', err);
          console.error('Error details:', err.response?.data || err.message);
        }
      });
    }

    console.log('Returning updated logs:', updatedLogs);
    return updatedLogs;
  }, [templatesLoaded, showTemplateWarning, individualTemplates, globalTemplate, employees]);

  // Debounced update functions to reduce API calls
  const debouncedUpdateWorkHour = useCallback(
    debounce(async (employeeId, date, workHourData) => {
      const updateKey = `${employeeId}-${date}`;
      
      // Skip if already pending
      if (pendingUpdates.has(updateKey)) {
        console.log('Update already pending for', updateKey);
        return;
      }
      
      // Rate limiting
      const now = Date.now();
      if (now - lastApiCall < RATE_LIMIT_DELAY) {
        console.log('Rate limiting update, delaying...');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
      
      setPendingUpdates(prev => new Set(prev).add(updateKey));
      setLastApiCall(Date.now());
      
      try {
        console.log('Updating work hour:', { employeeId, date, workHourData });
        
        // Ensure proper payload structure for backend
        const payload = {
          employeeId: employeeId, // Backend expects 'employeeId'
          date: date,
          timeIn: workHourData.timeIn,
          breakTime: workHourData.breakTime,
          resume: workHourData.resume,
          timeOut: workHourData.timeOut,
          overtime: workHourData.overtime || 0,
          status: workHourData.status || 'present'
        };
        
        console.log('Sending payload to backend:', payload);
        await workHoursAPI.createOrUpdateWorkHour(payload);
        
        // Clear cache for this date
        apiCache.delete(`workHours-${date}`);
        
        // Mark as saved and clear modified state
        setSavedRows(p=>({...p,[updateKey]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[updateKey]; return n; });
        
        console.log('Work hour auto-saved successfully');
        showToast('✓ Auto-saved', 'success');
      } catch (err) {
        console.error('Error updating work hour:', err);
      } finally {
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateKey);
          return newSet;
        });
      }
    }, DEBOUNCE_DELAY),
    [lastApiCall, pendingUpdates, apiCache]
  );

  // Batch update for multiple changes
  const batchUpdateWorkHours = useCallback(
    debounce(async (updates) => {
      if (updates.length === 0) return;
      
      console.log('Batch updating', updates.length, 'work hours');
      
      // Rate limiting for batch
      const now = Date.now();
      if (now - lastApiCall < RATE_LIMIT_DELAY * 2) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * 2));
      }
      
      try {
        // Process updates sequentially to avoid overwhelming the server
        for (const update of updates) {
          // Ensure proper payload structure for backend
          const payload = {
            employeeId: update.employeeId, // Backend expects 'employeeId'
            date: update.date,
            timeIn: update.data.timeIn,
            breakTime: update.data.breakTime,
            resume: update.data.resume,
            timeOut: update.data.timeOut,
            overtime: update.data.overtime || 0,
            status: update.data.status || 'present'
          };
          
          console.log('Sending batch payload to backend:', payload);
          await workHoursAPI.createOrUpdateWorkHour(payload);
          
          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Clear relevant caches
        updates.forEach(update => {
          apiCache.delete(`workHours-${update.date}`);
        });
        
        console.log('Batch update completed');
      } catch (err) {
        console.error('Error in batch update:', err);
      }
    }, BATCH_DELAY),
    [lastApiCall, apiCache]
  );

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('=== STARTING INITIAL DATA LOAD ===');
        
        // Add longer delays between API calls to avoid rate limiting
        console.log('Fetching employees...');
        await fetchEmployees();
        await new Promise(resolve => setTimeout(resolve, INITIAL_LOAD_DELAY));
        
        console.log('Fetching work hours...');
        await fetchWorkHours(ds);
        await new Promise(resolve => setTimeout(resolve, INITIAL_LOAD_DELAY));
        
        console.log('Fetching templates...');
        await fetchTemplates();
        await new Promise(resolve => setTimeout(resolve, INITIAL_LOAD_DELAY));
        
        // Apply templates after they're loaded
        console.log('=== APPLYING TEMPLATES AFTER INITIAL LOAD ===');
        setLogs(prev => {
          const updated = applyTemplatesToDate(ds, prev);
          console.log('Updated logs after template application:', updated);
          return updated;
        });
        
        console.log('=== INITIAL DATA LOAD COMPLETED ===');
      } catch (err) {
        console.error('Error during initial data load:', err);
      }
    };
    loadData();
  }, []);

  // Apply templates when templates are loaded or updated
  useEffect(() => {
    if (templatesLoaded && !showTemplateWarning && (globalTemplate || Object.keys(individualTemplates).length > 0)) {
      console.log('=== APPLYING TEMPLATES AFTER TEMPLATE STATE CHANGE ===');
      setLogs(prev => {
        const updated = applyTemplatesToDate(ds, prev);
        console.log('Updated logs after template application (state change):', updated);
        return updated;
      });
    }
  }, [templatesLoaded, showTemplateWarning, globalTemplate, individualTemplates, ds, applyTemplatesToDate]);

  // Auto-save any modified rows before unmounting or date change
  useEffect(() => {
    return () => {
      // Save any pending changes when component unmounts
      const savePendingChanges = async () => {
        const modifiedEntries = Object.entries(modifiedRows);
        if (modifiedEntries.length > 0) {
          console.log('=== AUTO-SAVING PENDING CHANGES (UNMOUNT) ===');
          for (const [key, _] of modifiedEntries) {
            const [employeeId, date] = key.split('-');
            if (date === ds) { // Only save current date's changes
              await saveRow(employeeId);
            }
          }
        }
      };
      savePendingChanges();
    };
  }, [modifiedRows, ds]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const modifiedEntries = Object.entries(modifiedRows);
      if (modifiedEntries.length > 0) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modifiedRows]);

  // Auto-save when switching dates
  useEffect(() => {
    const savePendingChanges = async () => {
      const modifiedEntries = Object.entries(modifiedRows);
      if (modifiedEntries.length > 0) {
        console.log('=== AUTO-SAVING BEFORE DATE CHANGE ===');
        for (const [key, _] of modifiedEntries) {
          const [employeeId, date] = key.split('-');
          // Save all modified changes (both current and previous dates)
          await saveRow(employeeId);
        }
      }
    };
    
    // Save previous date's changes before loading new date
    savePendingChanges().then(() => {
      // Load new date data after saving
      if (employees.length > 0) {
        fetchWorkHours(ds);
      }
    });
  }, [ds, employees.length, globalTemplate, individualTemplates]);

  /* show toast */
  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3000);
  };

  /* ── TEMPLATE OPERATIONS ── */
  const fetchTemplates = async () => {
    // Retry logic with exponential backoff
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`=== FETCHING TEMPLATES (attempt ${attempt + 1}/${maxRetries}) ===`);
        
        // Add delay before retry (except first attempt)
        if (attempt > 0) {
          const retryDelay = Math.min(3000 * Math.pow(2, attempt - 1), 10000); // 3s, 6s, 10s max
          console.log(`Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        const response = await workHoursAPI.getTemplates();
        console.log('Templates API response:', response);
        
        // Handle different response structures
        let templatesData = [];
        if (response.data && Array.isArray(response.data)) {
          templatesData = response.data;
        } else if (response.data && response.data.templates && Array.isArray(response.data.templates)) {
          templatesData = response.data.templates;
        } else if (Array.isArray(response)) {
          templatesData = response;
        }
        
        console.log('Templates data after processing:', templatesData);
        console.log('Templates data length:', templatesData.length);

        // Separate global and individual templates
        const globalTpl = templatesData.find(t => t.isGlobal === true);
        const individualTpls = {};

        console.log('=== TEMPLATE PROCESSING ===');
        console.log('Total templates received:', templatesData.length);
        console.log('Global template found:', !!globalTpl);
        if (globalTpl) {
          console.log('Global template data:', globalTpl);
        }

        templatesData.forEach((tpl, index) => {
          console.log(`Processing template ${index + 1}:`, tpl);
          console.log('- isGlobal:', tpl.isGlobal);
          console.log('- employee reference:', tpl.employee || tpl.employeeId);
          
          // Check if it's not global and has an employee reference
          if (tpl.isGlobal !== true && (tpl.employee || tpl.employeeId)) {
            const employeeId = tpl.employee?.$oid || tpl.employee || tpl.employeeId;
            console.log('- Extracted employeeId:', employeeId);
            
            if (employeeId) {
              individualTpls[employeeId] = {
                _id: tpl._id?.$oid || tpl._id || tpl.id, // Handle $oid format with null checks
                timeIn: tpl.timeIn || DEF.timeIn,
                breakTime: tpl.breakTime || DEF.breakTime,
                resume: tpl.resume || DEF.resume,
                timeOut: tpl.timeOut || DEF.timeOut,
                overtime: tpl.overtime || 0
              };
              console.log('+ Added individual template for employee:', employeeId);
              console.log('Individual template _id extracted:', individualTpls[employeeId]._id);
            } else {
              console.log('- Could not extract valid employeeId from template');
            }
          } else if (tpl.isGlobal === true) {
            console.log('+ This is the global template');
          } else {
            console.log('- Template has no employee reference and is not global');
          }
        });

        console.log('=== TEMPLATE PROCESSING RESULTS ===');
        console.log('Global template found:', !!globalTpl);
        console.log('Individual templates count:', Object.keys(individualTpls).length);
        console.log('Individual template employee IDs:', Object.keys(individualTpls));

        if (globalTpl) {
          const globalTemplateData = {
            _id: globalTpl._id?.$oid || globalTpl._id || globalTpl.id, // Handle $oid format with null checks
            timeIn: globalTpl.timeIn || DEF.timeIn,
            breakTime: globalTpl.breakTime || DEF.breakTime,
            resume: globalTpl.resume || DEF.resume,
            timeOut: globalTpl.timeOut || DEF.timeOut,
            overtime: globalTpl.overtime || 0
          };
          console.log('Setting global template:', globalTemplateData);
          console.log('Global template _id extracted:', globalTemplateData._id);
          console.log('Original globalTpl structure:', globalTpl);
          setGlobalTemplate(globalTemplateData);
        } else {
          console.log('No global template found in fetched data');
        }

        console.log('Setting individual templates:', individualTpls);
        setIndividualTemplates(individualTpls);
        setTemplatesLoaded(true);
        
        // Check if no templates exist
        const hasNoTemplates = !globalTpl && Object.keys(individualTpls).length === 0;
        console.log('Has no templates:', hasNoTemplates);
        console.log('Global template exists:', !!globalTpl);
        console.log('Individual templates exist:', Object.keys(individualTpls).length > 0);
        
        if (hasNoTemplates) {
          console.log('SHOWING TEMPLATE WARNING - No templates found');
          setShowTemplateWarning(true);
        } else {
          console.log('HIDING TEMPLATE WARNING - Templates found');
          setShowTemplateWarning(false);
        }
        
        console.log('Successfully fetched templates');
        return;
        
      } catch (err) {
        console.error(`Error fetching templates (attempt ${attempt + 1}):`, err);
        
        // Check if it's a rate limit error
        if (err.response?.status === 429) {
          if (attempt < maxRetries - 1) {
            console.log('Rate limit hit, will retry...');
            continue;
          } else {
            console.error('Max retries reached for templates fetch - using fallback');
            // Use fallback strategy
            console.log('=== USING FALLBACK TEMPLATES ===');
            setGlobalTemplate(DEF); // Use default template as global fallback
            setIndividualTemplates({});
            setTemplatesLoaded(true);
            setShowTemplateWarning(false); // Don't show warning since we have fallback
            console.log('Fallback template applied:', DEF);
            return;
          }
        } else {
          // Non-rate-limit error, don't retry
          console.error('Error fetching templates:', err);
          break;
        }
      }
    }
    
    // Set templates loaded even if failed to prevent infinite loading
    setTemplatesLoaded(true);
  };

  const saveTemplateToBackend = async (templateData, isGlobal, employeeId = null) => {
    try {
      console.log('=== FRONTEND TEMPLATE SAVE DEBUG ===');
      console.log('Saving template:', { templateData, isGlobal, employeeId });
      
      // Check if template already exists to include ID for update
      let templateId = null;
      if (isGlobal && globalTemplate && globalTemplate._id) {
        templateId = globalTemplate._id;
        console.log('Found existing global template ID:', templateId);
      } else if (!isGlobal && employeeId && individualTemplates[employeeId]?._id) {
        templateId = individualTemplates[employeeId]._id;
        console.log('Found existing individual template ID:', templateId);
      }
      
      const templatePayload = {
        id: templateId, // Include ID if updating existing template
        name: isGlobal ? 'Global Template' : `${employees.find(e => e._id === employeeId)?.name} Template`,
        isGlobal,
        employeeId,
        ...templateData
      };
      
      console.log('Sending template payload:', templatePayload);
      
      // Backend now handles both create and update logic
      const result = await workHoursAPI.saveTemplate(templatePayload);
      
      console.log('Template save result:', result);
      
      // Refresh templates after saving to ensure the warning is hidden
      await fetchTemplates();
      
    } catch (err) {
      console.error('Error saving template:', err);
      // Don't block the UI for template saving errors
    }
  };

  /* clock */
  useEffect(()=>{
    const t=setInterval(()=>{
      const n=new Date();
      setClockStr(n.toLocaleTimeString("en-US",{hour12:true}));
      setClockDate(n.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}));
    },1000);
    return ()=>clearInterval(t);
  },[]);

  /* ── AUTO-FILL: apply to an individual employee on a date ── */
  const applyIndividualTemplateToDate = useCallback((empId, targetDs, template, currentLogs) => {
    if (targetDs <= todayDs) return currentLogs;
    return {
      ...currentLogs,
      [empId]: {
        ...(currentLogs[empId]||{}),
        [targetDs]: {...template},
      },
    };
  },[todayDs]);

  /* ── NAVIGATE TO DATE: auto-fill if future ── */
  const navigateToDate = useCallback((newDate) => {
    const newDs = isoDate(newDate);
    setCurDate(newDate);
    setPage(1);

    // Always fetch work hours for any date (past, present, or future)
    console.log('=== NAVIGATING TO DATE ===');
    console.log('New date:', newDs);
    console.log('Is past date:', newDs < todayDs);
    console.log('Current date (ds):', ds);
    console.log('Today date (todayDs):', todayDs);
    
    // Don't clear logs immediately to avoid table display issues
    // Let fetchWorkHours handle the data update
    setError(null);
    
    // Fetch work hours for the new date
    console.log('Fetching work hours for navigated date...');
    fetchWorkHours(newDs).then(() => {
      console.log('Work hours fetch completed for date:', newDs);
    }).catch(err => {
      console.error('Error fetching work hours for date:', newDs, err);
    });
    
    // Only apply templates for future dates or current day (not past dates)
    if (newDs >= todayDs) {
      console.log('Applying templates for future/current date');
      setLogs(prev => {
        const updated = applyTemplatesToDate(newDs, prev);
        return updated;
      });
    } else {
      console.log('Past date - not applying templates, using database data only');
    }
  }, [todayDs, applyTemplatesToDate, fetchWorkHours]);

  /* ── STATUS ACTIONS ── */
  const applyStatus = async (eid, type, halfDayType="morning") => {
    try {
      setError('');
      
      if (type === "out_of_town") {
        // Mark as out of town - keep normal work hours but add out-of-town flag
        const rec = logs[eid]?.[ds];
        if (rec) {
          const workHourData = {
            employeeId: eid,
            date: ds,
            timeIn: rec.timeIn || '',
            breakTime: rec.breakTime || '',
            resume: rec.resume || '',
            timeOut: rec.timeOut || '',
            overtime: rec.overtime || 0,
            status: 'out_of_town'
          };
          
          await workHoursAPI.createOrUpdateWorkHour(workHourData);
          setStatuses(p=>({...p,[statusKey(eid)]:'out_of_town'}));
          showToast('✓ Employee marked as out of town', 'success');
        }
        return;
      }
      
      if (type === "halfday") {
        await workHoursAPI.markHalfDay(eid, ds, halfDayType);
      } else if (type === "absent") {
        await workHoursAPI.markAbsent(eid, ds);
      }
      
      const statusValue = type==="halfday" ? `halfday_${halfDayType}` : type;
      setStatuses(p=>({...p,[statusKey(eid)]:statusValue}));
      
      const template = type==="halfday"
        ? (halfDayType==="morning" ? {...DEF_HD_MORNING} : {...DEF_HD_AFTERNOON})
        : (type==="absent" ? {...DEF_ABSENT} : null);
      
      if (template) {
        setLogs(p=>({...p,[eid]:{...p[eid],[ds]:template}}));
        setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
      }
      
      setConfirmModal({open:false,emp:null,type:null,halfDayType:"morning"});
      showToast(`✓ Employee marked as ${type === "halfday" ? "half day" : type === "out_of_town" ? "out of town" : "absent"}`, "success");
      
    } catch (err) {
      console.error('Error applying status:', err);
      setError(err.message || 'Failed to update status');
    }
  };

  const undoStatus = async (eid) => {
    try {
      setError('');
      // Create a present work hour entry to undo absent/halfday
      await workHoursAPI.createOrUpdateWorkHour({
        employeeId: eid,
        date: ds,
        status: 'present',
        timeIn: DEF.timeIn,
        breakTime: DEF.breakTime,
        resume: DEF.resume,
        timeOut: DEF.timeOut,
        overtime: 0
      });

      setStatuses(p=>{ const n={...p}; delete n[statusKey(eid)]; return n; });
      setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...DEF}}}));
      
      showToast('✓ Status reverted to present', 'success');
    } catch (err) {
      console.error('Error undoing status:', err);
      setError(err.message || 'Failed to undo status');
    }
  };

  /* ── INLINE FIELD UPDATE ── */
  const updateField = async (eid, field, val) => {
    if (getStatus(eid)) return;
    
    // Optimistic update with null safety
    setLogs(p=>({
      ...p,
      [eid]: {
        ...(p[eid] || {}),
        [ds]: {
          ...((p[eid] && p[eid][ds]) || { ...DEF }),
          [field]: val
        }
      }
    }));
    setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
    setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
    
    // For overtime field, don't save immediately - wait for blur
    if (field === 'overtime') {
      console.log('Overtime field updated locally, waiting for blur to save...');
      return;
    }
    
    // Use debounced auto-save instead of immediate save
    const currentData = logs[eid]?.[ds] || { ...DEF };
    const workHourData = {
      employeeId: eid,
      date: ds,
      ...currentData,
      [field]: val,
      status: getStatus(eid) || 'present'
    };
    
    console.log('=== DEBOUNCED AUTO-SAVE TRIGGERED ===');
    console.log('Field changed:', { eid, field, val });
    console.log('Will auto-save in 1 second:', workHourData);
    
    // Trigger debounced auto-save
    debouncedUpdateWorkHour(eid, ds, workHourData);
  };

  // Handle overtime field blur (when user clicks away)
  const handleOvertimeBlur = (eid, val) => {
    if (getStatus(eid)) return;
    
    const currentData = logs[eid]?.[ds] || { ...DEF };
    const workHourData = {
      employeeId: eid,
      date: ds,
      ...currentData,
      overtime: parseFloat(val) || 0,
      status: getStatus(eid) || 'present'
    };
    
    console.log('=== OVERTIME BLUR - AUTO-SAVE ===');
    console.log('Saving overtime:', workHourData);
    
    debouncedUpdateWorkHour(eid, ds, workHourData);
  };

  // Separate function for handling blur events (saves to database)
  const handleFieldBlur = async (eid, field) => {
    if (getStatus(eid)) return;
    
    // Only save if this row was modified
    if (!modifiedRows[`${eid}-${ds}`]) {
      console.log('Row not modified, skipping save on blur');
      return;
    }
    
    // Retry logic with exponential backoff for rate limiting
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setError('');
        // Get current data from logs state
        const currentData = logs[eid]?.[ds] || { ...DEF };
        const workHourData = {
          employeeId: eid,
          date: ds,
          ...currentData,
          status: 'present'
        };
        
        console.log(`=== FIELD BLUR DEBUG (attempt ${attempt + 1}/${maxRetries}) ===`);
        console.log('Saving field on blur:', { eid, field });
        console.log('Current work hour data:', workHourData);
        console.log('Overtime value being saved:', workHourData.overtime);
        
        // Add delay before retry (except first attempt)
        if (attempt > 0) {
          const retryDelay = Math.min(2000 * Math.pow(2, attempt - 1), 8000); // 2s, 4s, 8s max
          console.log(`Rate limit hit, waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        const result = await workHoursAPI.createOrUpdateWorkHour(workHourData);
        console.log('Backend save result:', result);
        
        // Mark as saved
        setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
        
        console.log('✅ Field saved successfully to backend on blur');
        
        // Show success feedback for overtime specifically
        if (field === 'overtime') {
          console.log('✅ Overtime saved to backend:', workHourData.overtime);
          showToast(`Overtime saved: ${workHourData.overtime} hours`, 'success');
        }
        
        // Success - exit retry loop
        return;
        
      } catch (err) {
        console.error(`❌ Error saving field on blur (attempt ${attempt + 1}):`, err);
        
        // Check if it's a rate limit error
        if (err.response?.status === 429) {
          if (attempt < maxRetries - 1) {
            console.log('Rate limit hit, will retry...');
            continue; // Retry with exponential backoff
          } else {
            console.error('Max retries reached for field blur save');
            setError('Failed to save due to rate limiting. Please try again in a few minutes.');
            
            // Show user-friendly message for overtime
            if (field === 'overtime') {
              showToast('Overtime save failed due to rate limiting. Changes will be saved when you navigate away.', 'warning');
            }
          }
        } else {
          // Non-rate-limit error, don't retry
          console.error('Backend error details:', err.response?.data || err.message);
          setError('Failed to save field to backend');
          
          if (field === 'overtime') {
            showToast('Failed to save overtime. Please try again.', 'error');
          }
          break; // Exit retry loop for non-rate-limit errors
        }
      }
    }
  };

  const updateTimeField = (eid, field, val) => {
    if (getStatus(eid)) return;
    updateField(eid, field, val);
    if (val.match(/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/)) {
      const t24=parseTime12(val);
      if (t24) updateField(eid, field, t24);
    }
  };

  const saveRow = async (eid) => {
    try {
      setError('');
      const workHourData = logs[eid]?.[ds] || { ...DEF };
      const status = getStatus(eid);
      
      const completeData = {
        employeeId: eid,
        date: ds,
        ...workHourData,
        status: status || 'present'
      };
      
      console.log('=== SAVE ROW DEBUG ===');
      console.log('Saving work hour for employee:', eid);
      console.log('Work hour data:', completeData);
      
      await workHoursAPI.createOrUpdateWorkHour(completeData);
      
      setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
      setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
      
      console.log('Work hour saved successfully');
      showToast('✓ Work hours saved', 'success');
    } catch (err) {
      console.error('Error saving row:', err);
      setError(err.message || 'Failed to save work hours');
    }
  };

  /* ── MODAL SAVE ── applies template and propagates to future dates ── */
  const handleModalSave = async () => {
    try {
      setError('');
      const savedTemplate = {...editForm};

      if (modalTab==="all") {
        /* ── Save to ALL: set global template, propagate to all future dates ── */
        const updates = employees.map(emp => ({
          employeeId: emp._id,
          timeIn: savedTemplate.timeIn,
          breakTime: savedTemplate.breakTime,
          resume: savedTemplate.resume,
          timeOut: savedTemplate.timeOut,
          overtime: parseFloat(savedTemplate.overtime) || 0,
          status: 'present'
        }));

        await workHoursAPI.bulkUpdateWorkHours(ds, updates);
        
        // Save template to backend
        await saveTemplateToBackend(savedTemplate, true);
        
        // Update local state
        setGlobalTemplate(savedTemplate);
        setShowTemplateWarning(false); // Hide warning when template is created
        
        const newSaved={};
        employees.forEach(emp=>{ 
          newSaved[`${emp._id}-${ds}`]=true;
          setLogs(p=>({
            ...p,[emp._id]:{...p[emp._id],[ds]:{...savedTemplate}}
          }));
        });
        
        setSavedRows(p=>({...p,...newSaved}));
        setModifiedRows(p=>{
          const n={...p};
          employees.forEach(emp=>{ delete n[`${emp._id}-${ds}`]; });
          return n;
        });

        showToast(`✓ Log saved for all employees. Future dates auto-filled.`, "success");

      } else {
        /* ── Save to INDIVIDUAL: set individual template, propagate to future dates ── */
        const empId = selEmp._id;
        
        await workHoursAPI.createOrUpdateWorkHour({
          employeeId: empId,
          date: ds,
          timeIn: savedTemplate.timeIn,
          breakTime: savedTemplate.breakTime,
          resume: savedTemplate.resume,
          timeOut: savedTemplate.timeOut,
          overtime: parseFloat(savedTemplate.overtime) || 0,
          status: 'present'
        });

        // Save template to backend
        await saveTemplateToBackend(savedTemplate, false, empId);

        setIndividualTemplates(p=>({...p,[empId]:savedTemplate}));
        setShowTemplateWarning(false); // Hide warning when template is created
        setLogs(p=>({...p,[empId]:{...p[empId],[ds]:{...savedTemplate}}}));
        setSavedRows(p=>({...p,[`${empId}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${empId}-${ds}`]; return n; });

        showToast(`✓ Log saved for ${selEmp.name}. Future dates auto-filled.`, "individual");
      }

      closeModal();
    } catch (err) {
      console.error('Error saving modal:', err);
      setError(err.message || 'Failed to save work hours');
    }
  };

  /* ── rows ── */
  const rows = useMemo(()=>
    employees.filter(e=>!search||e.name?.toLowerCase().includes(search.toLowerCase()) || 
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())),
  [search, employees]);

  const totalPages = Math.max(1,Math.ceil(rows.length/PER_PAGE));
  const safePage   = Math.min(page,totalPages);
  const pageRows   = rows.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE);

  const openModal = emp => {
    setEditEmp(emp);
    setEditForm({...(logs[emp._id]?.[ds]||{...DEF})});
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditEmp(null); };

  /* ── active template indicator ── */
  const getTemplateSource = eid => {
    if (individualTemplates[eid]) return "individual";
    if (globalTemplate) return "global";
    return null;
  };

  /* ── styles ── */
  const S = {
    wrap:{ width:"100%", fontFamily:"'DM Sans',sans-serif" },
    topRow:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"22px", gap:"16px" },
    clockCard:{ background:`linear-gradient(135deg,${NAVY} 0%,#1e3a5f 100%)`, borderRadius:"16px", padding:"24px 32px", boxShadow:"0 8px 32px rgba(19,36,64,.15)", minWidth:"280px", position:"relative", overflow:"hidden", border:"1px solid rgba(255,255,255,.1)" },
    clockTime:{ fontFamily:"'Playfair Display',serif", fontSize:"36px", fontWeight:"900", color:WHITE, letterSpacing:".02em", lineHeight:"1.2", position:"relative", zIndex:2 },
    clockDt:{ fontSize:"14px", color:"rgba(255,255,255,.8)", marginTop:"8px", fontWeight:"500", position:"relative", zIndex:2 },
    clockGlow:{ position:"absolute", top:"-50%", right:"-50%", width:"200%", height:"200%", background:"radial-gradient(circle,rgba(255,231,151,.1) 0%,transparent 70%)", pointerEvents:"none" },
    editBtn:{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"14px 26px", background:RED, color:WHITE, border:"none", borderRadius:"50px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"600", cursor:"pointer", boxShadow:"0 3px 12px rgba(97,0,0,.3)" },
    navRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", gap:"12px", flexWrap:"wrap" },
    prevBtn:{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"8px 16px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"20px 0 0 20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    datePill:{ padding:"8px 18px", background: isFuture?"#f0f7ff":WHITE, color: isFuture?"#1d4ed8":NAVY, fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", borderTop:`1px solid ${isFuture?"#bfdbfe":BORDER}`, borderBottom:`1px solid ${isFuture?"#bfdbfe":BORDER}`, borderLeft:"none", borderRight:"none", whiteSpace:"nowrap" },
    nextBtn:{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"8px 16px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"0 20px 20px 0", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    todayBtn:{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"8px 18px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    srchWrap:{ position:"relative", display:"flex", alignItems:"center" },
    srchIcon:{ position:"absolute", left:"10px", display:"flex", alignItems:"center", pointerEvents:"none" },
    srchInput:{ padding:"8px 12px 8px 34px", border:`1px solid ${BORDER}`, borderRadius:"20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", color:NAVY, background:WHITE, outline:"none", width:"220px" },
    tblWrap:{ background:WHITE, borderRadius:"12px", overflow:"hidden", border:`1px solid ${BORDER}`, boxShadow:"0 1px 4px rgba(0,0,0,.07)" },
    table:{ width:"100%", borderCollapse:"collapse" },
    th:{ padding:"13px 12px", textAlign:"center", fontSize:"12px", fontWeight:"700", color:WHITE, textTransform:"uppercase", letterSpacing:".08em", background:RED, whiteSpace:"nowrap" },
    thL:{ padding:"13px 16px", textAlign:"left", fontSize:"12px", fontWeight:"700", color:WHITE, textTransform:"uppercase", letterSpacing:".08em", background:RED, whiteSpace:"nowrap" },
    td:(eid,st)=>({ padding:"12px 10px", fontSize:"13px", color:st?"#9ca3af":"#111827", borderBottom:`1px solid ${BORDER}`, background: st==="absent"?"#fff5f5": (st&&st.startsWith("halfday"))?"#fffbea": st==="out_of_town"?"#eff6ff": hovRow===eid?"#fdf8f4":WHITE, textAlign:"center", verticalAlign:"middle" }),
    tdL:(eid,st)=>({ padding:"12px 16px", fontSize:"13px", color:st?"#9ca3af":"#111827", borderBottom:`1px solid ${BORDER}`, background: st==="absent"?"#fff5f5": (st&&st.startsWith("halfday"))?"#fffbea": st==="out_of_town"?"#eff6ff": hovRow===eid?"#fdf8f4":WHITE, textAlign:"left", verticalAlign:"middle" }),
    timeInput:()=>({ padding:"8px 12px", border:"2px solid #e0d8d0", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"500", color:NAVY, width:"95px", height:"36px", outline:"none", textAlign:"center", background:WHITE, cursor:"text" }),
    otInput:()=>({ padding:"8px 12px", border:"2px solid #e0d8d0", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"500", color:NAVY, width:"80px", height:"36px", outline:"none", textAlign:"center", background:WHITE, cursor:"text" }),
    saveBtn:(saved)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background: saved?"#10b981":"#f59e0b", color:WHITE, fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    absentBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background: hov===`abs-${eid}`?"#fee2e2":"#fff1f1", color:RED, fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    halfBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background: hov===`hd-${eid}`?"#fde68a":"#fffbea", color:"#92400e", fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    undoBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background: hov===`undo-${eid}`?"#d1fae5":"#ecfdf5", color:"#065f46", fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    foot:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px 4px" },
    pgRow:{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"16px 0 4px" },
    pgBtn:(active,k)=>({ width:"34px", height:"34px", display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", border:"none", background: active?RED: hov===k?"#f4ede6":"transparent", color: active?WHITE:NAVY, fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", fontWeight: active?"700":"400", cursor:"pointer" }),
    overlay:{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" },
    modal:{ background:WHITE, borderRadius:"14px", padding:"28px 30px", width:"100%", maxWidth:"500px", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 12px 48px rgba(0,0,0,.22)" },
    confirmModal:{ background:WHITE, borderRadius:"14px", padding:"28px 30px", width:"100%", maxWidth:"400px", boxShadow:"0 12px 48px rgba(0,0,0,.22)", textAlign:"center" },
    mLabel:{ fontSize:"11px", fontWeight:"600", color:NAVY, textTransform:"uppercase", letterSpacing:".07em" },
    mInput:{ padding:"9px 12px", border:"2px solid #e8dfd6", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", color:NAVY, background:WHITE, outline:"none", width:"100%" },
    weekendMsg:{ padding:"40px", textAlign:"center", color:"#9ca3af", fontSize:"14px", fontStyle:"italic", background:WHITE },
  };

  const badge = (type, hrs) => {
    if (type==="absent") return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fee2e2",color:"#991b1b"}}><IcoAbsent/> Absent</span>;
    if (type==="out_of_town") return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#dbeafe",color:"#1e40af"}}><IcoOutTown/> Out of Town</span>;
    if (type==="halfday_morning") return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fde68a",color:"#92400e"}}><IcoHalf/> Half Day (AM)</span>;
    if (type==="halfday_afternoon") return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fde68a",color:"#92400e"}}><IcoHalf/> Half Day (PM)</span>;
    if (hrs>=8) return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#d1fae5",color:"#065f46"}}>Present</span>;
    if (hrs>0)  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fef3c7",color:"#92400e"}}>Partial</span>;
    return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#f3f4f6",color:"#9ca3af"}}>—</span>;
  };

  const templateBadge = (src) => {
    if (!src) return null;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"3px",padding:"1px 6px",borderRadius:"8px",fontSize:"10px",fontWeight:"600",
        background: src==="individual"?"#ede9fe":"#e0f2fe",
        color: src==="individual"?"#5b21b6":"#0369a1",
        marginLeft:"4px",verticalAlign:"middle"}}>
        <IcoInfo/> {src==="individual"?"Personal":"Global"}
      </span>
    );
  };

  const pageNums = Array.from({length:totalPages},(_,i)=>i+1);

  return (
    <div style={S.wrap}>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}} @keyframes slideIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed", top:"20px", right:"20px", zIndex:9999,
          padding:"12px 20px", borderRadius:"10px",
          background: toast.type==="individual"?"#5b21b6":RED,
          color:WHITE, fontSize:"13.5px", fontWeight:"600",
          boxShadow:"0 8px 24px rgba(0,0,0,.2)",
          display:"flex", alignItems:"center", gap:"8px",
          animation:"slideIn .3s ease",
          maxWidth:"360px",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── TEMPLATE WARNING ── */}
      {showTemplateWarning && templatesLoaded && (
        <div style={{
          margin:"16px 20px",
          padding:"16px 20px",
          background:"#fef3c7",
          border:"2px solid #f59e0b",
          borderRadius:"12px",
          display:"flex",
          alignItems:"center",
          gap:"16px",
          animation:"slideIn .3s ease"
        }}>
          <div style={{
            width:"40px",
            height:"40px",
            background:"#f59e0b",
            borderRadius:"50%",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            flexShrink:0
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{
              fontSize:"15px",
              fontWeight:"700",
              color:"#92400e",
              marginBottom:"4px"
            }}>
              No Work Hour Templates Found
            </div>
            <div style={{
              fontSize:"13px",
              color:"#78350f",
              lineHeight:"1.4"
            }}>
              You must create a work hour template before you can auto-fill the table. 
              Click the "Edit Template" button below to create a template with your standard work hours.
            </div>
            <div style={{marginTop:"10px", display:"flex", gap:"8px"}}>
              <button
                style={{
                  padding:"6px 14px",
                  background:"#f59e0b",
                  color:"white",
                  border:"none",
                  borderRadius:"6px",
                  fontSize:"12px",
                  fontWeight:"600",
                  cursor:"pointer"
                }}
                onClick={() => {
                  setShowModal(true);
                  setModalTab('all');
                  setEditForm({...DEF});
                }}
              >
                Create Template Now
              </button>
              <button
                style={{
                  padding:"6px 14px",
                  background:"transparent",
                  color:"#92400e",
                  border:"1px solid #f59e0b",
                  borderRadius:"6px",
                  fontSize:"12px",
                  fontWeight:"600",
                  cursor:"pointer"
                }}
                onClick={() => setShowTemplateWarning(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP ROW ── */}
      <div style={S.topRow}>
        <div style={S.clockCard}>
          <div style={S.clockGlow}/>
          <Clock style={{position:"absolute",top:"16px",right:"16px",width:"24px",height:"24px",opacity:.6,color:WHITE}}/>
          <div style={S.clockTime}>{clockStr||"--:--:--"}</div>
          <div style={S.clockDt}>{clockDate||fmtDisplayDate(today)}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px",alignItems:"flex-end"}}>
          <button style={S.editBtn} onClick={()=>{ if(pageRows[0]&&!getStatus(pageRows[0].id)) openModal(pageRows[0]); }}>
            <IcoEdit/> Edit Log
          </button>
                  </div>
      </div>

      {/* ── ERROR MESSAGE ── */}
      {error && (
        <div style={{
          background:"#fee2e2", border:"1px solid #fecaca",
          borderRadius:"10px", padding:"12px 16px", marginBottom:"14px",
          display:"flex", alignItems:"center", gap:"10px",
          fontSize:"13px", color:"#991b1b",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{error}</span>
          <button 
            onClick={() => setError('')}
            style={{
              background:"none", border:"none", color:"#991b1b", 
              cursor:"pointer", fontSize:"16px", padding:"0", marginLeft:"auto"
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div style={{ marginBottom: '14px' }}>
          <ShimmerLoader type="title" width="200px" style={{ marginBottom: '16px' }} />
          <TableShimmer rows={5} columns={6} />
        </div>
      )}

      
      {/* ── NAV ROW ── */}
      <div style={S.navRow}>
        <div style={{display:"flex",alignItems:"center"}}>
          <button style={S.prevBtn} onClick={()=>{ const d=new Date(curDate); d.setDate(d.getDate()-1); navigateToDate(d); }}><IcoChevL/> Prev</button>
          <div style={S.datePill}>
            {isFuture && "📅 "}{fmtDisplayDate(curDate)}
          </div>
          <button style={S.nextBtn} onClick={()=>{ const d=new Date(curDate); d.setDate(d.getDate()+1); navigateToDate(d); }}>Next <IcoChevR/></button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button style={S.todayBtn} onClick={()=>navigateToDate(new Date(today))}>
            Today
          </button>
          <div style={S.srchWrap}>
            <span style={S.srchIcon}><IcoSearch/></span>
            <input type="text" placeholder="Search employee..." value={search}
              onChange={e=>{ setSearch(e.target.value); setPage(1); }} style={S.srchInput}/>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={S.tblWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.thL}>Names</th>
              <th style={S.th}>Time In</th>
              <th style={S.th}>Break</th>
              <th style={S.th}>Resume</th>
              <th style={S.th}>Time Out</th>
              <th style={S.th}>Total Hrs</th>
              <th style={S.th}>Overtime</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isWeekend ? (
              <tr><td colSpan="9" style={S.weekendMsg}>Weekend — no work entries for this day.</td></tr>
            ) : pageRows.length===0 ? (
              <tr><td colSpan="9" style={S.weekendMsg}>No employees found.</td></tr>
            ) : pageRows.map(emp=>{
              const st   = getStatus(emp._id);
              const rec  = logs[emp._id]?.[ds] || {timeIn:"",breakTime:"",resume:"",timeOut:""};
              const hrs  = st ? (st.startsWith("halfday") ? calcHrs(rec) : 0) : calcHrs(rec);
              const saved    = savedRows[`${emp._id}-${ds}`];
              const modified = modifiedRows[`${emp._id}-${ds}`];
              const disabled = !!st;
              const tplSrc   = isFuture ? getTemplateSource(emp._id) : null;

              return (
                <tr key={emp._id} onMouseEnter={()=>setHovRow(emp._id)} onMouseLeave={()=>setHovRow(null)}>
                  {/* Name */}
                  <td style={S.tdL(emp._id,st)}>
                    <div style={{fontWeight:"600",color:st?"#9ca3af":NAVY}}>
                      {emp.name || `${emp.firstName} ${emp.middleInitial ? emp.middleInitial + '. ' : ''}${emp.lastName}`}
                      {tplSrc && templateBadge(tplSrc)}
                    </div>
                    <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{emp.idNumber || emp._id}</div>
                  </td>

                  {/* Time fields */}
                  {["timeIn","breakTime","resume","timeOut"].map(field=>{
                    const raw=rec[field]||"";
                    const val=(raw&&raw.length===5&&raw.includes(":")) ? formatTime12(raw) : raw;
                    return (
                      <td key={field} style={S.td(emp._id,st)}>
                        {disabled ? (
                          <span style={{color:"#d1d5db",fontSize:"12px"}}>
                            {st.startsWith("halfday")&&val ? val : "—"}
                          </span>
                        ) : (
                          <input style={S.timeInput()} type="text" placeholder="HH:MM AM"
                            value={val} onChange={e=>updateTimeField(emp._id,field,e.target.value)}/>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Hrs */}
                  <td style={S.td(emp._id,st)}>
                    {st==="absent" ? <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span> : (
                      <span style={{fontWeight:"700",color:hrs>=8?"#065f46":hrs>=4?"#d97706":hrs>0?"#92400e":"#9ca3af"}}>
                        {fmtH(hrs)}
                      </span>
                    )}
                  </td>

                  {/* Overtime */}
                  <td style={S.td(emp._id,st)}>
                    {disabled ? <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span> : (
                      <input 
                        style={S.otInput()} 
                        type="number" 
                        step="0.25" 
                        min="0" 
                        max="24"
                        value={rec.overtime||"0.00"} 
                        onChange={e=>updateField(emp._id,"overtime",e.target.value)}
                        onBlur={()=>handleOvertimeBlur(emp._id, rec.overtime||"0.00")}
                      />
                    )}
                  </td>

                  {/* Status */}
                  <td style={S.td(emp._id,st)}>{badge(st,hrs)}</td>

                  {/* Actions */}
                  <td style={S.td(emp._id,st)}>
                    <div style={{display:"flex",justifyContent:"center",gap:"5px",flexWrap:"wrap"}}>
                      {st ? (
                        <button style={S.undoBtn(emp._id)}
                          onMouseEnter={()=>setHov(`undo-${emp._id}`)} onMouseLeave={()=>setHov(null)}
                          onClick={()=>undoStatus(emp._id)}>
                          <IcoUndo/> Undo
                        </button>
                      ) : (
                        <>
                          {/* Auto-save indicator */}
                          {modified && (
                            <span style={{fontSize:"11px",color:"#f59e0b",fontWeight:"600",padding:"2px 6px",background:"#fffbeb",borderRadius:"4px"}}>
                              Saving...
                            </span>
                          )}
                          <button style={S.halfBtn(emp._id)}
                            onMouseEnter={()=>setHov(`hd-${emp._id}`)} onMouseLeave={()=>setHov(null)}
                            onClick={()=>setConfirmModal({open:true,emp,type:"halfday",halfDayType:"morning"})}>
                            <IcoHalf/> Half Day
                          </button>
                          <button style={{...S.halfBtn(emp._id), background: hov===`out-${emp._id}`?"#dbeafe":"#eff6ff", color: "#1e40af"}}
                            onMouseEnter={()=>setHov(`out-${emp._id}`)} onMouseLeave={()=>setHov(null)}
                            onClick={()=>applyStatus(emp._id, "out_of_town")}>
                            <IcoOutTown/> Out of Town
                          </button>
                          <button style={S.absentBtn(emp._id)}
                            onMouseEnter={()=>setHov(`abs-${emp._id}`)} onMouseLeave={()=>setHov(null)}
                            onClick={()=>setConfirmModal({open:true,emp,type:"absent"})}>
                            <IcoAbsent/> Absent
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={S.foot}>
          <span style={{fontSize:"13px",color:"#6b7280"}}>
            Showing {rows.length===0?0:(safePage-1)*PER_PAGE+1}–{Math.min(safePage*PER_PAGE,rows.length)} out of {rows.length}
          </span>
          <div style={{display:"flex",gap:"12px"}}>
            {(()=>{
              const ac=employees.filter(e=>getStatus(e._id)==="absent").length;
              const hm=employees.filter(e=>getStatus(e._id)==="halfday_morning").length;
              const ha=employees.filter(e=>getStatus(e._id)==="halfday_afternoon").length;
              const ot=employees.filter(e=>getStatus(e._id)==="out_of_town").length;
              
              return (
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  {ac>0&&<span style={{fontSize:"12.5px",color:"#991b1b",fontWeight:"600"}}>{ac} absent today</span>}
                  {hm>0&&<span style={{fontSize:"12.5px",color:"#92400e",fontWeight:"600"}}>{hm} half day (AM)</span>}
                  {ha>0&&<span style={{fontSize:"12.5px",color:"#92400e",fontWeight:"600"}}>{ha} half day (PM)</span>}
                  {ot>0&&<span style={{fontSize:"12.5px",color:"#1e40af",fontWeight:"600"}}>{ot} out of town today</span>}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages>1&&(
        <div style={S.pgRow}>
          <button style={S.pgBtn(false,"pgprev")} onMouseEnter={()=>setHov("pgprev")} onMouseLeave={()=>setHov(null)}
            onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {pageNums.map(n=>(
            <button key={n} style={S.pgBtn(n===safePage,`pg-${n}`)}
              onMouseEnter={()=>setHov(`pg-${n}`)} onMouseLeave={()=>setHov(null)}
              onClick={()=>setPage(n)}>{n}</button>
          ))}
          <button style={S.pgBtn(false,"pgnext")} onMouseEnter={()=>setHov("pgnext")} onMouseLeave={()=>setHov(null)}
            onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
        </div>
      )}

      {/* ── EDIT LOG MODAL ── */}
      {showModal&&editEmp&&(
        <div style={S.overlay} onClick={e=>{ if(e.target===e.currentTarget) closeModal(); }}>
          <div style={S.modal}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:"700",color:NAVY}}>Edit Log</div>
              <button style={{background:"none",border:"none",fontSize:"22px",cursor:"pointer",color:"#8a8a8a"}} onClick={closeModal}>×</button>
            </div>
            <div style={{fontSize:"12.5px",color:"#6b7280",marginBottom:"4px"}}>{fmtDisplayDate(curDate)}</div>

            {/* auto-fill notice */}
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"8px",padding:"8px 12px",marginBottom:"16px",fontSize:"12px",color:"#15803d",display:"flex",gap:"6px",alignItems:"flex-start"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginTop:"1px",flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>
              <span>
                <strong>Auto-fill enabled:</strong> Saving will apply these times to all future weekday dates
                {modalTab==="individual" ? ` for ${selEmp.name}` : " for all employees"}.
                Individual settings override global ones.
              </span>
            </div>

            {/* tabs */}
            <div style={{display:"flex",marginBottom:"20px",borderBottom:`1px solid ${BORDER}`}}>
              {["all","individual"].map(tab=>(
                <button key={tab} onClick={()=>setModalTab(tab)} style={{
                  padding:"10px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",fontWeight:"600",
                  cursor:"pointer",border:"none",background:"none",
                  color:modalTab===tab?RED:"#6b7280",
                  borderBottom:modalTab===tab?`2px solid ${RED}`:"2px solid transparent",
                }}>
                  {tab==="all"?"All Employees":"Individual"}
                </button>
              ))}
            </div>

            {modalTab==="individual"&&(
              <select style={{width:"100%",padding:"10px 12px",border:"2px solid #e8dfd6",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",color:NAVY,background:WHITE,outline:"none",marginBottom:"16px"}}
                value={selEmp._id || ''}
                onChange={e=>{ const emp=employees.find(x=>x._id===e.target.value); setSelEmp(emp); setEditForm({...(logs[emp._id]?.[ds]||{...DEF})}); }}>
                <option value="">Select Employee</option>
                {employees.map(e=>(
                  <option key={e._id} value={e._id}>
                    {e.name || `${e.firstName} ${e.middleInitial ? e.middleInitial + '. ' : ''}${e.lastName}`}
                  </option>
                ))}
              </select>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
              {[["Time In","timeIn"],["Break","breakTime"],["Resume","resume"],["Time Out","timeOut"]].map(([lbl,field])=>(
                <div key={field} style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                  <label style={S.mLabel}>{lbl}</label>
                  <input style={S.mInput} type="text" placeholder="HH:MM AM/PM"
                    value={formatTime12(editForm[field]||"")}
                    onChange={e=>{ const t24=parseTime12(e.target.value); setEditForm(p=>({...p,[field]:t24||e.target.value})); }}/>
                </div>
              ))}
            </div>

            <div style={{marginTop:"14px",padding:"12px 14px",background:"#f9f4ef",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"12px",color:"#6b7280",fontWeight:"600",textTransform:"uppercase",letterSpacing:".07em"}}>Total Hours</span>
              <span style={{fontSize:"18px",fontWeight:"700",color:RED,fontFamily:"'Playfair Display',serif"}}>{fmtH(calcHrs(editForm))}</span>
            </div>

            <div style={{display:"flex",gap:"10px",marginTop:"22px",justifyContent:"space-between"}}>
              <button style={{padding:"9px 20px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"600",cursor:"pointer",border:`2px solid ${RED}`,background:"transparent",color:RED}} onClick={closeModal}>Cancel</button>
              <button style={{padding:"9px 20px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"600",cursor:"pointer",border:"none",background:RED,color:WHITE}} onClick={handleModalSave}>
                {modalTab==="all" ? "Save & Auto-fill All" : `Save & Auto-fill ${selEmp.name || `${selEmp.firstName} ${selEmp.lastName}`}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL (Absent / Half Day) ── */}
      {confirmModal.open&&confirmModal.emp&&confirmModal.type&&(()=>{
        const isHD=confirmModal.type==="halfday";
        const cfg={
          absent:{ color:RED, bg:"#fee2e2", title:"Mark as Absent?", btnLabel:"Yes, Mark Absent", note:"Their time log for this day will be cleared." },
          halfday:{ color:"#92400e", bg:"#fde68a", title:"Mark as Half Day?", btnLabel:"Yes, Mark Half Day", note:"Select morning or afternoon shift." },
        }[confirmModal.type];
        return (
          <div style={S.overlay} onClick={e=>{ if(e.target===e.currentTarget) setConfirmModal({open:false,emp:null,type:null}); }}>
            <div style={S.confirmModal}>
              <div style={{width:"56px",height:"56px",borderRadius:"50%",background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                {isHD
                  ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill={cfg.color}/></svg>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                }
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:"700",color:NAVY,marginBottom:"8px"}}>{cfg.title}</div>
              <div style={{fontSize:"13.5px",color:"#6b7280",marginBottom:"12px",lineHeight:1.6}}>
                Marking <strong>{confirmModal.emp.name || `${confirmModal.emp.firstName} ${confirmModal.emp.middleInitial ? confirmModal.emp.middleInitial + '. ' : ''}${confirmModal.emp.lastName}`}</strong> as <strong style={{color:cfg.color}}>{isHD?"Half Day":"Absent"}</strong> for <strong>{fmtDisplayDate(curDate)}</strong>.
              </div>
              {isHD&&(
                <div style={{marginBottom:"16px"}}>
                  <div style={{fontSize:"12px",fontWeight:"600",color:NAVY,marginBottom:"8px",textTransform:"uppercase",letterSpacing:".07em"}}>Select Shift:</div>
                  <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
                    {["morning","afternoon"].map(shift=>(
                      <button key={shift}
                        style={{padding:"8px 16px",border:`2px solid ${confirmModal.halfDayType===shift?"#92400e":BORDER}`,borderRadius:"8px",background:confirmModal.halfDayType===shift?"#fde68a":WHITE,color:confirmModal.halfDayType===shift?"#92400e":NAVY,fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",cursor:"pointer"}}
                        onClick={()=>setConfirmModal(p=>({...p,halfDayType:shift}))}>
                        {shift==="morning"?"Morning":"Afternoon"}
                        <div style={{fontSize:"11px",fontWeight:"400",marginTop:"2px",opacity:.8}}>
                          {shift==="morning"?"8:30 AM – 12:30 PM":"1:00 PM – 5:30 PM"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:"12.5px",color:"#9ca3af",marginBottom:"22px"}}>
                {isHD?(confirmModal.halfDayType==="morning"?"Morning shift (8:30 AM – 12:30 PM) will be applied.":"Afternoon shift (1:00 PM – 5:30 PM) will be applied."):cfg.note}
              </div>
              <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
                <button style={{padding:"9px 22px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"600",cursor:"pointer",border:`2px solid ${BORDER}`,background:WHITE,color:NAVY}}
                  onClick={()=>setConfirmModal({open:false,emp:null,type:null})}>Cancel</button>
                <button style={{padding:"9px 22px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"700",cursor:"pointer",border:"none",background:isHD?"#d97706":RED,color:WHITE}}
                  onClick={()=>applyStatus(confirmModal.emp._id,confirmModal.type,confirmModal.halfDayType)}>
                  {cfg.btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}