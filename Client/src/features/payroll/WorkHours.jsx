import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock } from 'lucide-react';
import workHoursAPI from '../../api/workHours.api';
import { employeeAPI } from '../../api/employee.api';
import ShimmerLoader from '../../components/ui/ShimmerLoader';
import { TableShimmer, CardShimmer } from '../../components/ui/ShimmerLoader';
import { addActivity } from '../../utils/activityLog';

/* ── constants ── */
const RED    = "#610000";
const NAVY   = "#132440";
const WHITE  = "#FFFFFF";
const BORDER = "#e5e7eb";

const DEBOUNCE_DELAY    = 500;
const BATCH_DELAY       = 600;
const RATE_LIMIT_DELAY  = 500;
const INITIAL_LOAD_DELAY = 0;
const MONTH_FETCH_CONCURRENCY = 3;

const DEF              = { timeIn:"08:30", breakTime:"12:00", resume:"13:00", timeOut:"17:30", overtime:"0.00" };
const DEF_HD_MORNING   = { timeIn:"08:30", breakTime:"", resume:"", timeOut:"12:30", overtime:"0.00" };
const DEF_HD_AFTERNOON = { timeIn:"13:00", breakTime:"", resume:"", timeOut:"17:30", overtime:"0.00" };

const PER_PAGE = 5;
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── helpers ── */
const isoDate        = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtDisplayDate = d => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const isWeekday      = ds => { const d = new Date(ds+"T00:00:00"); return d.getDay()!==0 && d.getDay()!==6; };
const isWeekendDate  = ds => !isWeekday(ds);

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
      return Promise.resolve({ skipped: true });
    }
  };
};

const createCache = (ttl = 30000) => {
  const cache = new Map();
  return {
    get: (key) => {
      const item = cache.get(key);
      if (item && Date.now() - item.timestamp < ttl) return item.data;
      cache.delete(key);
      return null;
    },
    set: (key, data) => { cache.set(key, { data, timestamp: Date.now() }); },
    delete: (key) => { cache.delete(key); },
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

const t24ToMin = t => {
  if (!t || !t.includes(":")) return null;
  const [H,M] = t.split(":").map(Number);
  if (isNaN(H) || isNaN(M)) return null;
  return H*60+M;
};
const minToT24 = m => {
  const mm = Math.max(0, Math.floor(m));
  const H = Math.floor(mm/60)%24;
  const M = mm%60;
  return `${String(H).padStart(2,"0")}:${String(M).padStart(2,"0")}`;
};

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
const IcoEdit    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoSearch  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoChevL   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IcoChevR   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>;
const IcoHalf    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor"/></svg>;
const IcoAbsent  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoOutTown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoInfo    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IcoUser    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoCalendar= () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoClock   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoTrend   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function RecordWorkHours() {
  const today = new Date();
  const todayDs = isoDate(today);

  /* ── core state ── */
  const [logs,         setLogs]         = useState({});
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [dataLoading,  setDataLoading]  = useState(false);
  const [, setTemplateLoading]          = useState(false);
  const [weekendDataLoading, setWeekendDataLoading] = useState(false);
  const [error,        setError]        = useState('');
  const [statuses,     setStatuses]     = useState({});
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
  const [selEmp,       setSelEmp]       = useState({});
  const [confirmModal, setConfirmModal] = useState({open:false,emp:null,type:null,halfDayType:"morning"});
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [toast,        setToast]        = useState(null);

  const [globalTemplate,      setGlobalTemplate]      = useState(null);
  const [individualTemplates, setIndividualTemplates] = useState({});
  const [templatesLoaded,     setTemplatesLoaded]     = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [utModal, setUtModal] = useState({ open:false, eid:null });
  const [utValue, setUtValue] = useState('');
  const [actionMenus, setActionMenus] = useState({});

  /* ── Employee Detail Modal state ── */
  const [empDetailModal,   setEmpDetailModal]   = useState({ open: false, emp: null });
  const [empDetailMonth,   setEmpDetailMonth]   = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [empMonthLogs,     setEmpMonthLogs]     = useState({});
  const [empDetailLoading, setEmpDetailLoading] = useState(false);
  const [bulkMonthSaving,  setBulkMonthSaving]  = useState(false);
  const [showBulkMonthConfirm, setShowBulkMonthConfirm] = useState(false);

  // API optimization state
  const [apiCache] = useState(() => createCache(30000));
  const [pendingUpdates, setPendingUpdates] = useState(new Set());
  const [lastApiCall, setLastApiCall] = useState(0);
  const appliedDatesRef    = useRef(new Set());
  const templateSavingRef  = useRef(new Set());
  const backendRowsRef     = useRef(new Set());

  const ds        = isoDate(curDate);
  const isWeekend = curDate.getDay()===0 || curDate.getDay()===6;
  const isFuture  = ds > todayDs;

  const statusKey = eid => `${eid}-${ds}`;
  const getStatus = eid => statuses[statusKey(eid)] || null;
  const invalidateWorkHourCache = (dateStr = ds) => { apiCache.delete(`workHours-${dateStr}`); };

  /* ── DATA FETCHING ── */
  const fetchEmployees = async () => {
    const cacheKey = 'employees';
    const cached = apiCache.get(cacheKey);
    if (cached) { setEmployees(cached); return; }
    const extractEmployees = (payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.employees)) return payload.employees;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.data?.employees)) return payload.data.employees;
      return [];
    };
    const normalizeActiveEmployees = (list) =>
      (Array.isArray(list) ? list : []).filter(emp => {
        if (!emp || emp.isArchived === true) return false;
        if (typeof emp.status === 'string') {
          const status = emp.status.toLowerCase();
          return status === 'active';
        }
        if (typeof emp.isActive === 'boolean') return emp.isActive;
        return true;
      });
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await employeeAPI.getAllEmployees({ status: 'active', limit: 100 });
        if (response?.success === false) throw new Error(response?.message || 'Failed to fetch employees');
        let employeesData = normalizeActiveEmployees(extractEmployees(response?.data ?? response));
        if (employeesData.length === 0) {
          const fallbackResponse = await employeeAPI.getAllEmployees({ limit: 200, showArchived: false });
          if (fallbackResponse?.success === false) throw new Error(fallbackResponse?.message || 'Failed to fetch employees');
          employeesData = normalizeActiveEmployees(extractEmployees(fallbackResponse?.data ?? fallbackResponse));
        }
        setEmployees(employeesData);
        apiCache.set(cacheKey, employeesData);
        setError('');
        return;
      } catch (err) {
        if (err.response?.status === 429 && attempt < maxRetries - 1) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else { setError('Failed to fetch employees'); return; }
      }
    }
  };

  const fetchWorkHours = async (date, skipGlobalLoading = false) => {
    const cacheKey = `workHours-${date}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      setLogs(prev => {
        const merged = { ...(prev || {}) };
        Object.keys(cached.logs || {}).forEach(eid => {
          merged[eid] = { ...(merged[eid] || {}), ...(cached.logs[eid] || {}) };
        });
        return merged;
      });
      setStatuses(prev => ({ ...(prev || {}), ...(cached.statuses || {}) }));
    }
    if (!skipGlobalLoading) setDataLoading(true);
    const maxRetries = 3;
    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const now = Date.now();
          if (now - lastApiCall < RATE_LIMIT_DELAY) await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          setLastApiCall(Date.now());
          const response = await workHoursAPI.getWorkHoursByDate(date);
          const logsData = {};
          const statusesData = {};
          let workHoursData = [];
          if (response.success && response.data && Array.isArray(response.data)) workHoursData = response.data;
          else if (Array.isArray(response)) workHoursData = response;
          else if (response.data && Array.isArray(response.data)) workHoursData = response.data;

          if (workHoursData.length > 0) {
            workHoursData.forEach((workHour) => {
              if (workHour?.isDefault === true) return;
              let employeeId;
              if (typeof workHour.employee === 'string') employeeId = workHour.employee;
              else if (workHour.employee && workHour.employee._id) employeeId = workHour.employee._id;
              else if (workHour.employee && workHour.employee.id) employeeId = workHour.employee.id;
              else return;

              const dateKey = (() => {
                const rawDate = workHour.date;
                if (typeof rawDate === 'string') {
                  if (rawDate.includes('T')) return rawDate.split('T')[0];
                  return rawDate;
                }
                try {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                } catch {}
                return '';
              })();
              if (!dateKey) return;
              backendRowsRef.current.add(`${employeeId}-${dateKey}`);
              if (!logsData[employeeId]) logsData[employeeId] = {};
              logsData[employeeId][dateKey] = {
                timeIn:     workHour.timeIn    || '',
                breakTime:  workHour.breakTime || '',
                resume:     workHour.resume    || '',
                timeOut:    workHour.timeOut   || '',
                overtime:   workHour.overtime  || 0,
                totalHours: workHour.totalHours|| 0,
                status:     workHour.status    || 'present'
              };
              if (workHour.status && workHour.status !== 'present') {
                statusesData[`${employeeId}-${dateKey}`] = workHour.status;
              }
            });
          }
          setLogs(prev => {
            const merged = { ...(prev || {}) };
            Object.keys(logsData).forEach(eid => {
              merged[eid] = { ...(merged[eid] || {}), ...(logsData[eid] || {}) };
            });
            return merged;
          });
          setStatuses(prev => ({ ...(prev || {}), ...(statusesData || {}) }));
          apiCache.set(cacheKey, { logs: logsData, statuses: statusesData });
          return true;
        } catch (err) {
          if (err.response?.status === 429 && attempt < maxRetries - 1) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          } else { setError(err.message || 'Failed to fetch work hours'); return false; }
        }
      }
      return false;
    } finally {
      if (!skipGlobalLoading) setDataLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════
     EMPLOYEE DETAIL MODAL — fetch & display
  ═══════════════════════════════════════════════ */

  /**
   * Load all work-hour records for `emp` in a given year/month.
   * Priority: (1) live logs state, (2) apiCache, (3) fresh API call.
   */
  const loadEmpMonthData = useCallback(async (emp, year, month) => {
    setEmpDetailLoading(true);
    try {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const result = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const fromLogs  = logs[emp._id]?.[dateStr];
        const fromCache = apiCache.get(`workHours-${dateStr}`)?.logs?.[emp._id]?.[dateStr];
        const statusSt  = statuses[`${emp._id}-${dateStr}`];
        const source    = fromLogs || fromCache;
        if (source) {
          result[dateStr] = { ...source, status: statusSt || source.status || 'present' };
        }
      }

      const missing = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        if (!result[dateStr] && isWeekday(dateStr)) missing.push(dateStr);
      }

      let cursor = 0;
      const workerCount = Math.min(MONTH_FETCH_CONCURRENCY, missing.length);
      const fetchWorker = async () => {
        while (cursor < missing.length) {
          const dateStr = missing[cursor++];
          try {
            const rechecked = apiCache.get(`workHours-${dateStr}`);
            if (rechecked?.logs?.[emp._id]?.[dateStr]) {
              result[dateStr] = { ...rechecked.logs[emp._id][dateStr] };
              continue;
            }
            let response = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                response = await workHoursAPI.getWorkHoursByDate(dateStr);
                break;
              } catch (err) {
                if (err?.response?.status === 429 && attempt < 2) {
                  const retryDelay = Math.min(300 * Math.pow(2, attempt), 1200);
                  await new Promise(r => setTimeout(r, retryDelay));
                  continue;
                }
                throw err;
              }
            }
            if (!response) continue;
            let workHoursData = [];
            if (response.success && Array.isArray(response.data)) workHoursData = response.data;
            else if (Array.isArray(response)) workHoursData = response;
            else if (response.data && Array.isArray(response.data)) workHoursData = response.data;

            const entry = workHoursData.find(w => {
              if (w?.isDefault === true) return false;
              const wId = typeof w.employee === 'string' ? w.employee : w.employee?._id || w.employee?.id;
              return wId === emp._id;
            });
            if (entry) {
              result[dateStr] = {
                timeIn:    entry.timeIn    || '',
                breakTime: entry.breakTime || '',
                resume:    entry.resume    || '',
                timeOut:   entry.timeOut   || '',
                overtime:  entry.overtime  || 0,
                status:    entry.status    || 'present'
              };
            }
          } catch {}
        }
      };

      if (workerCount > 0) {
        await Promise.all(Array.from({ length: workerCount }, () => fetchWorker()));
      }

      setEmpMonthLogs(result);
    } finally {
      setEmpDetailLoading(false);
    }
  }, [logs, statuses, apiCache]);

  /** Open the employee detail modal */
  const openEmpDetail = useCallback((emp) => {
    const year  = today.getFullYear();
    const month = today.getMonth();
    setEmpDetailModal({ open: true, emp });
    setEmpDetailMonth({ year, month });
    setEmpMonthLogs({});
    loadEmpMonthData(emp, year, month);
  }, [loadEmpMonthData]);

  /** Navigate months inside the employee detail modal */
  const changeDetailMonth = useCallback((dir) => {
    setEmpDetailMonth(prev => {
      let { year, month } = prev;
      month += dir;
      if (month > 11) { month = 0; year++; }
      if (month < 0)  { month = 11; year--; }
      if (empDetailModal.emp) loadEmpMonthData(empDetailModal.emp, year, month);
      return { year, month };
    });
  }, [empDetailModal.emp, loadEmpMonthData]);

  const pickDetailMonth = useCallback((monthValue) => {
    if (!monthValue) return;
    const [pickedYear, pickedMonth] = monthValue.split('-').map(Number);
    if (Number.isNaN(pickedYear) || Number.isNaN(pickedMonth)) return;
    const year = pickedYear;
    const month = pickedMonth - 1;
    if (month < 0 || month > 11) return;
    setEmpDetailMonth({ year, month });
    if (empDetailModal.emp) loadEmpMonthData(empDetailModal.emp, year, month);
  }, [empDetailModal.emp, loadEmpMonthData]);

  const closeEmpDetail = () => {
    setEmpDetailModal({ open: false, emp: null });
    setEmpMonthLogs({});
    setShowBulkMonthConfirm(false);
  };

  const bulkSetMonthPresent = async () => {
    if (!empDetailModal.emp) return;
    const { year, month } = empDetailMonth;
    const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());
    if (!isPastMonth) {
      showToast('Bulk set to present is only available for past months.', 'error');
      return;
    }
    try {
      setBulkMonthSaving(true);
      setError('');
      const emp = empDetailModal.emp;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const template = individualTemplates[emp._id] || globalTemplate || DEF;
      const monthUpdates = {};
      const updatedDates = [];
      let successCount = 0;
      let failCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dObj = new Date(dateStr + 'T00:00:00');
        if (dObj.getDay() === 0 || dObj.getDay() === 6) continue;

        const existing = empMonthLogs[dateStr] || logs[emp._id]?.[dateStr] || {};
        const payload = {
          employeeId: emp._id,
          date: dateStr,
          timeIn: existing.timeIn || template.timeIn || DEF.timeIn,
          breakTime: existing.breakTime || template.breakTime || DEF.breakTime,
          resume: existing.resume || template.resume || DEF.resume,
          timeOut: existing.timeOut || template.timeOut || DEF.timeOut,
          overtime: parseFloat(existing.overtime ?? template.overtime ?? DEF.overtime) || 0,
          status: 'present'
        };

        try {
          await workHoursAPI.createOrUpdateWorkHour(payload);
          invalidateWorkHourCache(dateStr);
          successCount++;
          updatedDates.push(dateStr);
          monthUpdates[dateStr] = {
            timeIn: payload.timeIn,
            breakTime: payload.breakTime,
            resume: payload.resume,
            timeOut: payload.timeOut,
            overtime: payload.overtime,
            status: 'present'
          };
        } catch {
          failCount++;
        }
      }

      if (successCount === 0) {
        showToast('No weekdays were updated. Please try again.', 'error');
        return;
      }

      setEmpMonthLogs(prev => ({ ...prev, ...monthUpdates }));
      setLogs(prev => ({ ...prev, [emp._id]: { ...prev[emp._id], ...monthUpdates } }));
      setStatuses(prev => {
        const next = { ...prev };
        updatedDates.forEach(dateStr => { delete next[`${emp._id}-${dateStr}`]; });
        return next;
      });
      setSavedRows(prev => {
        const next = { ...prev };
        updatedDates.forEach(dateStr => { next[`${emp._id}-${dateStr}`] = true; });
        return next;
      });
      setModifiedRows(prev => {
        const next = { ...prev };
        updatedDates.forEach(dateStr => { delete next[`${emp._id}-${dateStr}`]; });
        return next;
      });

      if (failCount > 0) {
        showToast(`✓ ${successCount} weekdays set to present. ${failCount} failed to save.`, 'success');
      } else {
        showToast(`✓ ${successCount} weekdays marked present for ${MONTHS[month]} ${year}.`, 'success');
      }
    } catch (err) {
      setError(err.message || 'Failed to bulk set month to present');
      showToast('Failed to bulk set month to present.', 'error');
    } finally {
      setBulkMonthSaving(false);
    }
  };

  /* Compute summary stats for the detail modal */
  const computeMonthStats = (emp, year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let presentDays = 0, absentDays = 0, halfDays = 0, outOfTownDays = 0, recordedDays = 0;
    let totalWorkHrs = 0, totalOT = 0, weekdays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dObj = new Date(dateStr + 'T00:00:00');
      if (dObj.getDay() === 0 || dObj.getDay() === 6) continue;
      weekdays++;
      const rec = empMonthLogs[dateStr];
      if (!rec) continue;
      const st = statuses[`${emp._id}-${dateStr}`] || rec.status;
      if (st === 'absent') { absentDays++; continue; }
      if (st === 'out_of_town') { outOfTownDays++; }
      if (st?.startsWith('halfday')) { halfDays++; }
      const hrs = calcHrs(rec);
      const ot = parseFloat(rec.overtime || 0) || 0;
      if (hrs > 0) { presentDays++; totalWorkHrs += hrs; }
      if (hrs > 0 || ot > 0) recordedDays++;
      totalOT += ot;
    }
    const totalHoursWithOT = totalWorkHrs + totalOT;
    return { presentDays, absentDays, halfDays, outOfTownDays, totalWorkHrs, totalOT, totalHoursWithOT, weekdays, recordedDays };
  };

  /* ════════════════════════════════════════
     ORIGINAL LOGIC (unchanged)
  ════════════════════════════════════════ */

  const applyTemplatesToDate = useCallback((targetDate, currentLogs) => {
    if (!templatesLoaded) return currentLogs;
    const hasGlobalTemplate        = globalTemplate && Object.keys(globalTemplate).length > 0;
    const hasAnyIndividualTemplates = Object.keys(individualTemplates).length > 0;
    if (!hasGlobalTemplate && !hasAnyIndividualTemplates) return currentLogs;

    const updatedLogs = { ...currentLogs };
    let appliedCount = 0;

    employees.forEach(emp => {
      const existingData = updatedLogs[emp._id]?.[targetDate];
      const hasPersistedData = backendRowsRef.current.has(`${emp._id}-${targetDate}`);
      const hasCompleteData = existingData && (
        existingData.timeIn && existingData.breakTime && existingData.resume && existingData.timeOut
      );
      const dateObj = new Date(targetDate + "T00:00:00");
      const isWknd = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const hasExistingData = existingData && (
        existingData.timeIn || existingData.breakTime || existingData.resume || existingData.timeOut ||
        (existingData.overtime && existingData.overtime > 0) || existingData.status !== 'present'
      );
      if ((!isWknd && (hasExistingData || hasPersistedData)) || hasCompleteData) return;
      const template = (individualTemplates[emp._id] ?? globalTemplate) ?? DEF;
      const templateToApply = isWknd ? { ...template, status: undefined } : template;
      updatedLogs[emp._id] = { ...(updatedLogs[emp._id] || {}), [targetDate]: { ...templateToApply } };
      appliedCount++;
    });

    const currentDateObj  = new Date(targetDate + "T00:00:00");
    const isCurrentWeekend = currentDateObj.getDay() === 0 || currentDateObj.getDay() === 6;

    if (isCurrentWeekend) {
      const weekendModified = {};
      employees.forEach(emp => {
        if (updatedLogs[emp._id]?.[targetDate]) weekendModified[`${emp._id}-${targetDate}`] = true;
      });
      setTimeout(() => setModifiedRows(p => ({ ...p, ...weekendModified })), 0);
      return updatedLogs;
    }

    const newTemplateApplications = employees
      .filter(emp => {
        const existing = currentLogs[emp._id]?.[targetDate];
        const hasPersistedData = backendRowsRef.current.has(`${emp._id}-${targetDate}`);
        const hadExisting = existing && (
          existing.timeIn || existing.breakTime || existing.resume || existing.timeOut ||
          (existing.overtime && existing.overtime > 0) || existing.status !== 'present'
        );
        return !hadExisting && !hasPersistedData && updatedLogs[emp._id]?.[targetDate];
      })
      .map(emp => ({ employeeId: emp._id, date: targetDate, ...updatedLogs[emp._id][targetDate] }));

    if (newTemplateApplications.length > 0 && !isCurrentWeekend) {
      (async () => {
        for (let index = 0; index < newTemplateApplications.length; index++) {
          const workHourData = newTemplateApplications[index];
          try {
            if (index > 0) await new Promise(resolve => setTimeout(resolve, 1000));
            const key = `${workHourData.employeeId}-${workHourData.date}`;
            if (templateSavingRef.current.has(key)) continue;
            templateSavingRef.current.add(key);
            const payload = {
              employeeId: workHourData.employeeId, date: workHourData.date,
              timeIn: workHourData.timeIn, breakTime: workHourData.breakTime,
              resume: workHourData.resume, timeOut: workHourData.timeOut,
              overtime: workHourData.overtime || 0, status: 'present'
            };
            const result = await workHoursAPI.createOrUpdateWorkHour(payload);
            setSavedRows(prev => ({ ...prev, [`${workHourData.employeeId}-${workHourData.date}`]: true }));
          } catch (err) {
            console.error('Error auto-saving template:', err?.message || err);
          } finally {
            const key = `${workHourData.employeeId}-${workHourData.date}`;
            templateSavingRef.current.add(key);
          }
        }
      })();
    }
    return updatedLogs;
  }, [templatesLoaded, individualTemplates, globalTemplate, employees, todayDs]);

  const debouncedUpdateWorkHour = useCallback(
    debounce(async (employeeId, date, workHourData) => {
      const updateKey = `${employeeId}-${date}`;
      if (pendingUpdates.has(updateKey)) return;
      const dateObj = new Date(date + "T00:00:00");
      if (dateObj.getDay() === 0 || dateObj.getDay() === 6) return;
      const now = Date.now();
      if (now - lastApiCall < RATE_LIMIT_DELAY) await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      setPendingUpdates(prev => new Set(prev).add(updateKey));
      setLastApiCall(Date.now());
      try {
        const payload = {
          employeeId, date, timeIn: workHourData.timeIn, breakTime: workHourData.breakTime,
          resume: workHourData.resume, timeOut: workHourData.timeOut,
          overtime: workHourData.overtime || 0, status: workHourData.status || 'present'
        };
        await workHoursAPI.createOrUpdateWorkHour(payload);
        backendRowsRef.current.add(`${employeeId}-${date}`);
        apiCache.delete(`workHours-${date}`);
        setSavedRows(p  => ({...p, [`${employeeId}-${date}`]: true }));
        setModifiedRows(p => { const n={...p}; delete n[updateKey]; return n; });
        showToast('✓ Auto-saved', 'success');
        try {
          const target = employees.find(e => e._id === employeeId);
          const empName = target ? `${target.firstName||''} ${target.middleInitial?target.middleInitial+'. ':''}${target.lastName||''}`.trim() : 'Employee';
          addActivity({ emp: empName || 'Employee', action: 'Work Hours Updated', status: 'Done' });
        } catch {}
      } catch (err) {
        console.error('Error updating work hour:', err);
      } finally {
        setPendingUpdates(prev => { const s=new Set(prev); s.delete(updateKey); return s; });
      }
    }, DEBOUNCE_DELAY),
    [lastApiCall, pendingUpdates, apiCache]
  );

  const batchUpdateWorkHours = useCallback(
    debounce(async (updates) => {
      if (updates.length === 0) return;
      const weekdayUpdates = updates.filter(u => {
        const d = new Date(u.date + "T00:00:00");
        return d.getDay() !== 0 && d.getDay() !== 6;
      });
      if (weekdayUpdates.length === 0) return;
      const now = Date.now();
      if (now - lastApiCall < RATE_LIMIT_DELAY * 2) await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * 2));
      try {
        for (const update of weekdayUpdates) {
          const payload = {
            employeeId: update.employeeId, date: update.date,
            timeIn: update.data.timeIn, breakTime: update.data.breakTime,
            resume: update.data.resume, timeOut: update.data.timeOut,
            overtime: update.data.overtime || 0, status: update.data.status || 'present'
          };
          await workHoursAPI.createOrUpdateWorkHour(payload);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        updates.forEach(u => apiCache.delete(`workHours-${u.date}`));
      } catch (err) { console.error('Error in batch update:', err); }
    }, BATCH_DELAY),
    [lastApiCall, apiCache]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchEmployees(), fetchTemplates()]);
        await fetchWorkHours(ds, true);
      } catch (err) { console.error('Error during initial data load:', err); }
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    const manageData = async () => {
      if (isWeekend) {
        setWeekendDataLoading(true);
        try {
          await fetchWorkHours(ds, true);
          const cached = apiCache.get(`workHours-${ds}`);
          const hasExistingData = !!cached && Object.values(cached.logs || {}).some(byDate => {
            const rec = byDate?.[ds];
            return rec && (rec.timeIn || rec.breakTime || rec.resume || rec.timeOut ||
              (rec.overtime && rec.overtime > 0) || (rec.status && rec.status !== 'present'));
          });
          if (!hasExistingData && templatesLoaded && (globalTemplate || Object.keys(individualTemplates).length > 0)) {
            setLogs(prev => applyTemplatesToDate(ds, prev));
          }
        } catch {
          if (templatesLoaded && (globalTemplate || Object.keys(individualTemplates).length > 0)) {
            setLogs(prev => applyTemplatesToDate(ds, prev));
          }
        } finally { setWeekendDataLoading(false); }
      } else {
        if (templatesLoaded && employees.length > 0 && !showTemplateWarning && (globalTemplate || Object.keys(individualTemplates).length > 0)) {
          if (appliedDatesRef.current.has(ds)) return;
          const hasCachedDayData = !!apiCache.get(`workHours-${ds}`);
          const loaded = hasCachedDayData ? true : await fetchWorkHours(ds, true);
          if (!loaded) return;
          setLogs(prev => applyTemplatesToDate(ds, prev));
          appliedDatesRef.current.add(ds);
        }
      }
    };
    manageData();
  }, [ds, isWeekend, templatesLoaded, showTemplateWarning, globalTemplate, individualTemplates, employees.length]);

  useEffect(() => {
    return () => {
      const savePendingChanges = async () => {
        if (isWeekend) return;
        const modifiedEntries = Object.entries(modifiedRows);
        if (modifiedEntries.length > 0) {
          for (const [key] of modifiedEntries) {
            const [employeeId, ...dateParts] = key.split('-');
            const rowDate = dateParts.join('-');
            if (!employeeId || !rowDate) continue;
            if (isWeekendDate(rowDate)) continue;
            if (rowDate === ds) await saveRow(employeeId, rowDate);
          }
        }
      };
      savePendingChanges();
    };
  }, [modifiedRows, ds, isWeekend]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (Object.keys(modifiedRows).length > 0) {
        const msg = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modifiedRows]);

  useEffect(() => {
    if (isWeekend) return;
    const savePendingChanges = async () => {
      const modifiedEntries = Object.entries(modifiedRows);
      if (modifiedEntries.length > 0) {
        for (const [key] of modifiedEntries) {
          const [employeeId, ...dateParts] = key.split('-');
          const rowDate = dateParts.join('-');
          if (employeeId && rowDate) {
            if (isWeekendDate(rowDate)) continue;
            await saveRow(employeeId, rowDate);
          }
        }
      }
    };
    savePendingChanges().then(() => {
      const hasTemplates = templatesLoaded && (globalTemplate || Object.keys(individualTemplates).length > 0);
      if (!isWeekend && employees.length > 0 && !hasTemplates) fetchWorkHours(ds, true);
    });
  }, [ds, employees.length, isWeekend, templatesLoaded, globalTemplate, individualTemplates]);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3000);
  };

  /* ── TEMPLATE OPERATIONS ── */
  const fetchTemplates = async () => {
    setTemplateLoading(true);
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const retryDelay = Math.min(3000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        const response = await workHoursAPI.getTemplates();
        let templatesData = [];
        if (response.data && Array.isArray(response.data)) templatesData = response.data;
        else if (response.data?.templates && Array.isArray(response.data.templates)) templatesData = response.data.templates;
        else if (Array.isArray(response)) templatesData = response;

        const globalTpl = templatesData.find(t => t.isGlobal === true);
        const individualTpls = {};
        templatesData.forEach((tpl) => {
          if (tpl.isGlobal !== true && (tpl.employee || tpl.employeeId)) {
            const employeeId = tpl.employee?.$oid || tpl.employee || tpl.employeeId;
            if (employeeId) {
              individualTpls[employeeId] = {
                _id: tpl._id?.$oid || tpl._id || tpl.id,
                timeIn: tpl.timeIn || DEF.timeIn, breakTime: tpl.breakTime || DEF.breakTime,
                resume: tpl.resume || DEF.resume, timeOut: tpl.timeOut || DEF.timeOut,
                overtime: tpl.overtime || 0
              };
            }
          }
        });
        if (globalTpl) {
          setGlobalTemplate({
            _id: globalTpl._id?.$oid || globalTpl._id || globalTpl.id,
            timeIn: globalTpl.timeIn || DEF.timeIn, breakTime: globalTpl.breakTime || DEF.breakTime,
            resume: globalTpl.resume || DEF.resume, timeOut: globalTpl.timeOut || DEF.timeOut,
            overtime: globalTpl.overtime || 0
          });
        }
        setIndividualTemplates(individualTpls);
        setTemplatesLoaded(true);
        setShowTemplateWarning(!globalTpl && Object.keys(individualTpls).length === 0);
        setTemplateLoading(false);
        return;
      } catch (err) {
        if (err.response?.status === 429 && attempt < maxRetries - 1) continue;
        else if (attempt === maxRetries - 1) {
          setGlobalTemplate(DEF); setIndividualTemplates({});
          setTemplatesLoaded(true); setShowTemplateWarning(false); setTemplateLoading(false);
          return;
        } else break;
      }
    }
    setTemplatesLoaded(true);
    setTemplateLoading(false);
  };

  const saveTemplateToBackend = async (templateData, isGlobal, employeeId = null) => {
    try {
      let templateId = null;
      if (isGlobal && globalTemplate?._id) templateId = globalTemplate._id;
      else if (!isGlobal && employeeId && individualTemplates[employeeId]?._id) templateId = individualTemplates[employeeId]._id;
      const templatePayload = {
        id: templateId,
        name: isGlobal ? 'Global Template' : `${employees.find(e => e._id === employeeId)?.name} Template`,
        isGlobal, employeeId, ...templateData
      };
      await workHoursAPI.saveTemplate(templatePayload);
      await fetchTemplates();
    } catch (err) { console.error('Error saving template:', err); }
  };

  useEffect(()=>{
    const t=setInterval(()=>{
      const n=new Date();
      setClockStr(n.toLocaleTimeString("en-US",{hour12:true}));
      setClockDate(n.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}));
    },1000);
    return ()=>clearInterval(t);
  },[]);

  const applyIndividualTemplateToDate = useCallback((empId, targetDs, template, currentLogs) => {
    if (targetDs <= todayDs) return currentLogs;
    return { ...currentLogs, [empId]: { ...(currentLogs[empId]||{}), [targetDs]: {...template} } };
  },[todayDs]);

  const navigateToDate = useCallback((newDate) => {
    setCurDate(newDate); setPage(1); setError(null);
  }, []);

  /* ── STATUS ACTIONS ── */
  const saveWeekendWorkHours = async (employeeId) => {
    try {
      setError('');
      const rec = logs[employeeId]?.[ds];
      if (!rec) { showToast('No work hours data to save for weekend', 'error'); return; }
      const wkStatus = statuses[`${employeeId}-${ds}`] || rec.status || 'present';
      await workHoursAPI.createOrUpdateWorkHour({
        employeeId, date: ds,
        timeIn: rec.timeIn || '', breakTime: rec.breakTime || '',
        resume: rec.resume || '', timeOut: rec.timeOut || '',
        overtime: rec.overtime || 0, status: wkStatus
      });
      invalidateWorkHourCache(ds);
      await fetchWorkHours(ds, true);
      setSavedRows(prev => ({ ...prev, [`${employeeId}-${ds}`]: true }));
      setModifiedRows(p => { const n={...p}; delete n[`${employeeId}-${ds}`]; return n; });
      showToast('✓ Weekend work hours saved successfully', 'success');
    } catch (err) {
      console.error('Error saving weekend work hours:', err);
      showToast('Failed to save weekend work hours', 'error');
    }
  };

  const applyStatus = async (eid, type, halfDayType="morning") => {
    try {
      setError('');
      if (isWeekend) {
        const rec = logs[eid]?.[ds] || { ...DEF, overtime: 0 };
        if (type === "out_of_town") {
          setStatuses(p=>({...p,[statusKey(eid)]:'out_of_town'}));
          setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...rec,status:'out_of_town'}}}));
          setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
          setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
          showToast('Marked out of town. Click "Save Weekend" to persist', 'success');
          return;
        }
        if (type === "halfday") {
          const template = halfDayType==="morning" ? {...DEF_HD_MORNING} : {...DEF_HD_AFTERNOON};
          setStatuses(p=>({...p,[statusKey(eid)]:`halfday_${halfDayType}`}));
          setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...template,status:`halfday_${halfDayType}`}}}));
          setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
          setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
          setConfirmModal({open:false,emp:null,type:null,halfDayType:"morning"});
          showToast('Marked half day. Click "Save Weekend" to persist', 'success');
          return;
        }
        if (type === "absent") {
          setStatuses(p=>({...p,[statusKey(eid)]:'absent'}));
          setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{ status:'absent' }}}));
          setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
          setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
          setConfirmModal({open:false,emp:null,type:null,halfDayType:"morning"});
          showToast('Marked absent. Click "Save Weekend" to persist', 'success');
          return;
        }
      }
      if (type === "out_of_town") {
        const rec = logs[eid]?.[ds] || { ...DEF, overtime: 0 };
        await workHoursAPI.createOrUpdateWorkHour({
          employeeId: eid, date: ds,
          timeIn: rec.timeIn || '', breakTime: rec.breakTime || '',
          resume: rec.resume || '', timeOut: rec.timeOut || '',
          overtime: rec.overtime || 0, status: 'out_of_town'
        });
        invalidateWorkHourCache(ds);
        setStatuses(p=>({...p,[statusKey(eid)]:'out_of_town'}));
        setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...rec,status:'out_of_town'}}}));
        setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
        showToast('✓ Employee marked as out of town', 'success');
        return;
      }
      if (type === "halfday") {
        await workHoursAPI.markHalfDay(eid, ds, halfDayType);
        try {
          const target = employees.find(e => e._id === eid);
          const empName = target ? `${target.firstName||''} ${target.middleInitial?target.middleInitial+'. ':''}${target.lastName||''}`.trim() : 'Employee';
          addActivity({ emp: empName||'Employee', action: `Marked Half Day (${halfDayType})`, status: 'Done' });
        } catch {}
      } else if (type === "absent") {
        await workHoursAPI.markAbsent(eid, ds);
        try {
          const target = employees.find(e => e._id === eid);
          const empName = target ? `${target.firstName||''} ${target.middleInitial?target.middleInitial+'. ':''}${target.lastName||''}`.trim() : 'Employee';
          addActivity({ emp: empName||'Employee', action: 'Marked Absent', status: 'Done' });
        } catch {}
      }
      invalidateWorkHourCache(ds);
      const statusValue = type==="halfday" ? `halfday_${halfDayType}` : type;
      setStatuses(p=>({...p,[statusKey(eid)]:statusValue}));
      const template = type==="halfday"
        ? (halfDayType==="morning" ? {...DEF_HD_MORNING} : {...DEF_HD_AFTERNOON})
        : (type==="absent" ? {} : null);
      if (template) {
        setLogs(p=>({...p,[eid]:{...p[eid],[ds]:template}}));
        setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
      }
      setConfirmModal({open:false,emp:null,type:null,halfDayType:"morning"});
      showToast(`✓ Employee marked as ${type==="halfday"?"half day":type==="out_of_town"?"out of town":"absent"}`, "success");
    } catch (err) {
      console.error('Error applying status:', err);
      setError(err.message || 'Failed to update status');
    }
  };

  const undoStatus = async (eid) => {
    try {
      setError('');
      const recKey = `${eid}-${ds}`;
      if (isWeekend) {
        setStatuses(p=>{ const n={...p}; delete n[statusKey(eid)]; return n; });
        setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...DEF}}}));
        setSavedRows(p=>{ const n={...p}; delete n[recKey]; return n; });
        setModifiedRows(p=>({...p,[recKey]:true}));
        showToast('Status reverted. Click "Save Weekend" to persist', 'success');
        return;
      }
      await workHoursAPI.createOrUpdateWorkHour({
        employeeId: eid, date: ds, status: 'present',
        timeIn: DEF.timeIn, breakTime: DEF.breakTime, resume: DEF.resume, timeOut: DEF.timeOut, overtime: 0
      });
      invalidateWorkHourCache(ds);
      setStatuses(p=>{ const n={...p}; delete n[statusKey(eid)]; return n; });
      setLogs(p=>({...p,[eid]:{...p[eid],[ds]:{...DEF}}}));
      setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
      setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
      showToast('✓ Status reverted to present', 'success');
    } catch (err) { setError(err.message || 'Failed to undo status'); }
  };

  const updateField = async (eid, field, val, force = false) => {
    if (getStatus(eid) && !force) return;
    setLogs(p=>({
      ...p, [eid]: { ...(p[eid]||{}), [ds]: { ...((p[eid]?.[ds])||{...DEF}), [field]: val } }
    }));
    setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
    setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
    if (field === 'overtime') return;
    const currentData = logs[eid]?.[ds] || { ...DEF };
    const workHourData = { employeeId: eid, date: ds, ...currentData, [field]: val, status: getStatus(eid)||'present' };
    if (!isWeekend) debouncedUpdateWorkHour(eid, ds, workHourData);
  };

  const handleOvertimeBlur = (eid, val) => {
    if (getStatus(eid)) return;
    const currentData = logs[eid]?.[ds] || { ...DEF };
    const workHourData = { employeeId: eid, date: ds, ...currentData, overtime: parseFloat(val)||0, status: getStatus(eid)||'present' };
    if (!isWeekend) debouncedUpdateWorkHour(eid, ds, workHourData);
  };

  const handleFieldBlur = async (eid, field) => {
    if (getStatus(eid)) return;
    if (!modifiedRows[`${eid}-${ds}`]) return;
    if (isWeekend) return;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setError('');
        const currentData = logs[eid]?.[ds] || { ...DEF };
        const workHourData = { employeeId: eid, date: ds, ...currentData, status: 'present' };
        if (attempt > 0) await new Promise(resolve => setTimeout(resolve, Math.min(2000 * Math.pow(2, attempt-1), 8000)));
        await workHoursAPI.createOrUpdateWorkHour(workHourData);
        invalidateWorkHourCache(ds);
        setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
        if (field === 'overtime') showToast(`Overtime saved: ${workHourData.overtime} hours`, 'success');
        return;
      } catch (err) {
        if (err.response?.status === 429 && attempt < maxRetries-1) continue;
        setError('Failed to save field to backend'); break;
      }
    }
  };

  const updateTimeField = (eid, field, val) => {
    if (getStatus(eid)) return;
    if (val.match(/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/)) {
      const t24 = parseTime12(val);
      if (t24) { updateField(eid, field, t24); return; }
    }
    updateField(eid, field, val);
  };

  const saveRow = async (eid, targetDate = ds) => {
    try {
      if (isWeekendDate(targetDate)) return;
      setError('');
      const workHourData = logs[eid]?.[targetDate] || { ...DEF };
      const status = statuses[`${eid}-${targetDate}`] || null;
      await workHoursAPI.createOrUpdateWorkHour({ employeeId: eid, date: targetDate, ...workHourData, status: status||'present' });
      backendRowsRef.current.add(`${eid}-${targetDate}`);
      invalidateWorkHourCache(targetDate);
      setSavedRows(p=>({...p,[`${eid}-${targetDate}`]:true}));
      setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${targetDate}`]; return n; });
      showToast('✓ Work hours saved', 'success');
    } catch (err) { setError(err.message || 'Failed to save work hours'); }
  };

  const handleModalSave = async () => {
    try {
      setIsModalSaving(true); setError('');
      const savedTemplate = {...editForm};
      if (isWeekend) {
        showToast('Weekend detected - Please use "Save Weekend" buttons for each row', 'error');
        setIsModalSaving(false); return;
      }
      if (modalTab==="all") {
        const updates = employees.map(emp => ({
          employeeId: emp._id, timeIn: savedTemplate.timeIn, breakTime: savedTemplate.breakTime,
          resume: savedTemplate.resume, timeOut: savedTemplate.timeOut,
          overtime: parseFloat(savedTemplate.overtime)||0, status: 'present'
        }));
        await workHoursAPI.bulkUpdateWorkHours(ds, updates);
        invalidateWorkHourCache(ds);
        await saveTemplateToBackend(savedTemplate, true);
        setGlobalTemplate(savedTemplate); setShowTemplateWarning(false);
        const newSaved = {};
        employees.forEach(emp => {
          newSaved[`${emp._id}-${ds}`] = true;
          setLogs(p=>({...p,[emp._id]:{...p[emp._id],[ds]:{...savedTemplate}}}));
        });
        setSavedRows(p=>({...p,...newSaved}));
        setModifiedRows(p=>{ const n={...p}; employees.forEach(emp=>{ delete n[`${emp._id}-${ds}`]; }); return n; });
        showToast(`✓ Log saved for all employees. Future dates auto-filled.`, "success");
      } else {
        const empId = selEmp._id;
        await workHoursAPI.createOrUpdateWorkHour({
          employeeId: empId, date: ds, timeIn: savedTemplate.timeIn, breakTime: savedTemplate.breakTime,
          resume: savedTemplate.resume, timeOut: savedTemplate.timeOut,
          overtime: parseFloat(savedTemplate.overtime)||0, status: 'present'
        });
        invalidateWorkHourCache(ds);
        await saveTemplateToBackend(savedTemplate, false, empId);
        setIndividualTemplates(p=>({...p,[empId]:savedTemplate}));
        setShowTemplateWarning(false);
        setLogs(p=>({...p,[empId]:{...p[empId],[ds]:{...savedTemplate}}}));
        setSavedRows(p=>({...p,[`${empId}-${ds}`]:true}));
        setModifiedRows(p=>{ const n={...p}; delete n[`${empId}-${ds}`]; return n; });
        showToast(`✓ Log saved for ${selEmp.name || `${selEmp.firstName} ${selEmp.lastName}`}. Future dates auto-filled.`, "individual");
      }
      closeModal();
    } catch (err) { setError(err.message || 'Failed to save work hours'); }
    finally { setIsModalSaving(false); }
  };

  const expectedHoursForStatus = (st) => {
    if (st==='halfday_morning'||st==='halfday_afternoon') return 4;
    if (!st||st==='present'||st==='out_of_town') return 8;
    return 0;
  };

  const openUndertimeModal = (eid) => {
    setError('');
    const st  = getStatus(eid);
    const rec = logs[eid]?.[ds] || {};
    const expected = expectedHoursForStatus(st);
    const hrs = calcHrs(rec);
    let ut = Math.max(0, expected - hrs);
    if (ut > expected) ut = expected;
    setUtModal({ open:true, eid });
    setUtValue(ut.toFixed(2));
  };

  const closeUndertimeModal = () => { setUtModal({ open:false, eid:null }); setUtValue(''); };

  const applyUndertime = async () => {
    try {
      if (!utModal.open || !utModal.eid) return;
      setError('');
      let ut = parseFloat(utValue);
      if (isNaN(ut) || ut < 0) { showToast('Invalid undertime value', 'error'); return; }
      const eid = utModal.eid;
      const st  = getStatus(eid);
      const expected = expectedHoursForStatus(st);
      if (expected === 0) { showToast('Undertime not applicable', 'error'); return; }
      if (ut > expected) ut = expected;
      const baseEnd = st==='halfday_morning' ? t24ToMin('12:30') : t24ToMin('17:30');
      const nextTimeOut = ut === 0
        ? minToT24(baseEnd)
        : minToT24(Math.max(0, baseEnd - Math.round(ut*60)));
      const currentData = logs[eid]?.[ds] || { ...DEF };
      const nextData = { ...currentData, timeOut: nextTimeOut };

      setLogs(p=>({
        ...p,
        [eid]: { ...(p[eid]||{}), [ds]: { ...((p[eid]?.[ds])||{...DEF}), timeOut: nextTimeOut } }
      }));
      setModifiedRows(p=>({...p,[`${eid}-${ds}`]:true}));
      setSavedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });

      if (isWeekend) {
        showToast('Undertime set. Click "Save Weekend" to persist', 'success');
        closeUndertimeModal();
        return;
      }

      await workHoursAPI.createOrUpdateWorkHour({
        employeeId: eid,
        date: ds,
        ...nextData,
        status: st || 'present'
      });
      backendRowsRef.current.add(`${eid}-${ds}`);
      invalidateWorkHourCache(ds);
      setSavedRows(p=>({...p,[`${eid}-${ds}`]:true}));
      setModifiedRows(p=>{ const n={...p}; delete n[`${eid}-${ds}`]; return n; });
      showToast(ut === 0 ? 'Undertime removed' : 'Undertime applied', 'success');
      closeUndertimeModal();
    } catch (err) { setError(err.message || 'Failed to set undertime'); }
  };

  /* ── rows ── */
  const rows = useMemo(()=>
    employees.filter(e =>
      !search ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
    ),
  [search, employees]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = rows.slice((safePage-1)*PER_PAGE, safePage*PER_PAGE);

  useEffect(() => {
    if (employees.length > 0 && !selEmp._id) setSelEmp(employees[0]);
  }, [employees]);

  const openModal = emp => {
    setEditEmp(emp);
    setEditForm({ timeIn:"08:30", breakTime:"12:00", resume:"13:00", timeOut:"17:30", overtime:"0.00" });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditEmp(null); };

  const getTemplateSource = eid => {
    if (individualTemplates[eid]) return "individual";
    if (globalTemplate) return "global";
    return null;
  };

  /* ── styles ── */
  const S = {
    wrap:{ width:"100%", fontFamily:"'DM Sans',sans-serif" },
    topRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"28px", gap:"20px", flexWrap:"wrap" },
    clockCard:{ background:"#132440", borderRadius:"16px", padding:"24px 32px", boxShadow:"0 12px 40px rgba(19,36,64,.3)", minWidth:"400px", position:"relative", overflow:"hidden", border:"1px solid rgba(255,255,255,.1)" },
    clockTime:{ fontFamily:"'Courier New','Monaco',monospace", fontSize:"56px", fontWeight:"700", color:"#FFFFFF", letterSpacing:"8px", lineHeight:"1", position:"relative", zIndex:2, marginBottom:"12px", fontVariantNumeric:"tabular-nums" },
    clockDt:{ fontSize:"12px", color:"rgba(255,255,255,.6)", marginTop:"0", fontWeight:"600", position:"relative", zIndex:2, letterSpacing:"3px", textTransform:"uppercase" },
    clockGlow:{ position:"absolute", top:0, right:0, width:"100%", height:"100%", background:"none", pointerEvents:"none" },
    editBtn:{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"14px 28px", background:RED, color:WHITE, border:"none", borderRadius:"50px", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:"700", cursor:"pointer", boxShadow:"0 6px 20px rgba(97,0,0,.25)", transition:"all .3s ease" },
    navRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", gap:"12px", flexWrap:"wrap" },
    prevBtn:{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"8px 16px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"20px 0 0 20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    datePill:{ padding:"8px 18px", background:isFuture?"#f0f7ff":WHITE, color:isFuture?"#1d4ed8":NAVY, fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", borderTop:`1px solid ${isFuture?"#bfdbfe":BORDER}`, borderBottom:`1px solid ${isFuture?"#bfdbfe":BORDER}`, borderLeft:"none", borderRight:"none", whiteSpace:"nowrap" },
    nextBtn:{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"8px 16px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"0 20px 20px 0", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    todayBtn:{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"8px 18px", background:WHITE, color:NAVY, border:`1px solid ${BORDER}`, borderRadius:"20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"600", cursor:"pointer" },
    srchWrap:{ position:"relative", display:"flex", alignItems:"center" },
    srchIcon:{ position:"absolute", left:"10px", display:"flex", alignItems:"center", pointerEvents:"none" },
    srchInput:{ padding:"8px 12px 8px 34px", border:`1px solid ${BORDER}`, borderRadius:"20px", fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", color:NAVY, background:WHITE, outline:"none", width:"220px" },
    tblWrap:{ background:WHITE, borderRadius:"12px", overflow:"hidden", border:`1px solid ${BORDER}`, boxShadow:"0 1px 4px rgba(0,0,0,.07)" },
    table:{ width:"100%", borderCollapse:"collapse" },
    th:{ padding:"13px 12px", textAlign:"center", fontSize:"12px", fontWeight:"700", color:WHITE, textTransform:"uppercase", letterSpacing:".08em", background:RED, whiteSpace:"nowrap" },
    thL:{ padding:"13px 16px", textAlign:"left", fontSize:"12px", fontWeight:"700", color:WHITE, textTransform:"uppercase", letterSpacing:".08em", background:RED, whiteSpace:"nowrap" },
    td:(eid,st)=>({ padding:"12px 10px", fontSize:"13px", color:st?"#9ca3af":"#111827", borderBottom:`1px solid ${BORDER}`, background:st==="absent"?"#fff5f5":(st?.startsWith("halfday"))?"#fffbea":st==="out_of_town"?"#eff6ff":hovRow===eid?"#fdf8f4":WHITE, textAlign:"center", verticalAlign:"middle" }),
    tdL:(eid,st)=>({ padding:"12px 16px", fontSize:"13px", color:st?"#9ca3af":"#111827", borderBottom:`1px solid ${BORDER}`, background:st==="absent"?"#fff5f5":(st?.startsWith("halfday"))?"#fffbea":st==="out_of_town"?"#eff6ff":hovRow===eid?"#fdf8f4":WHITE, textAlign:"left", verticalAlign:"middle" }),
    timeInputWrapper:()=>({ display:"inline-flex", alignItems:"center", gap:"6px", padding:"0 8px", border:"2px solid #d4d0ca", borderRadius:"10px", background:"linear-gradient(135deg, #fafaf8 0%, #ffffff 100%)", height:"40px", transition:"all .25s ease" }),
    timeInput:()=>({ flex:1, border:"none", borderRadius:"6px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"500", color:NAVY, outline:"none", textAlign:"center", background:"transparent", cursor:"text", padding:"0" }),
    otInput:()=>({ padding:"8px 12px", border:"2px solid #d4d0ca", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"500", color:NAVY, width:"85px", height:"40px", outline:"none", textAlign:"center", background:"linear-gradient(135deg, #fafaf8 0%, #ffffff 100%)", cursor:"text", transition:"all .25s ease" }),
    loadingInput:(width)=>({ padding:"8px 12px", border:"2px solid #e0d8d0", borderRadius:"10px", fontFamily:"'DM Sans',sans-serif", fontSize:"13px", fontWeight:"500", color:"#9ca3af", width:width||"95px", height:"40px", outline:"none", textAlign:"center", background:"#f9fafb", cursor:"not-allowed" }),
    spinner:{ display:"inline-block", width:"12px", height:"12px", border:"2px solid #e5e7eb", borderTop:"2px solid #3b82f6", borderRadius:"50%", animation:"spin 1s linear infinite" },
    saveBtn:(saved)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background:saved?"#10b981":"#f59e0b", color:WHITE, fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    absentBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background:hov===`abs-${eid}`?"#fee2e2":"#fff1f1", color:RED, fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    halfBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background:hov===`hd-${eid}`?"#fde68a":"#fffbea", color:"#92400e", fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    undoBtn:(eid)=>({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background:hov===`undo-${eid}`?"#d1fae5":"#ecfdf5", color:"#065f46", fontSize:"12px", fontWeight:"600", cursor:"pointer" }),
    weekendSaveBtn:{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"5px 10px", borderRadius:"6px", border:"none", background:"#10b981", color:WHITE, fontSize:"12px", fontWeight:"600", cursor:"pointer" },
    actionSelect:(st)=>({ minWidth:"140px", height:"34px", border:`1px solid ${BORDER}`, borderRadius:"8px", background:WHITE, color:st?"#6b7280":NAVY, fontFamily:"'DM Sans',sans-serif", fontSize:"12.5px", fontWeight:"600", padding:"0 10px", outline:"none", cursor:"pointer" }),
    foot:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px 4px" },
    pgRow:{ display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"16px 0 4px" },
    pgBtn:(active,k)=>({ width:"34px", height:"34px", display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", border:"none", background:active?RED:hov===k?"#f4ede6":"transparent", color:active?WHITE:NAVY, fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", fontWeight:active?"700":"400", cursor:"pointer" }),
    overlay:{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" },
    modal:{ background:WHITE, borderRadius:"14px", padding:"28px 30px", width:"100%", maxWidth:"500px", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 12px 48px rgba(0,0,0,.22)" },
    confirmModal:{ background:WHITE, borderRadius:"14px", padding:"28px 30px", width:"100%", maxWidth:"400px", boxShadow:"0 12px 48px rgba(0,0,0,.22)", textAlign:"center" },
    mLabel:{ fontSize:"11px", fontWeight:"600", color:NAVY, textTransform:"uppercase", letterSpacing:".07em" },
    mInput:{ padding:"9px 12px", border:"2px solid #e8dfd6", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", color:NAVY, background:WHITE, outline:"none", width:"100%" },
    weekendMsg:{ padding:"40px", textAlign:"center", color:"#9ca3af", fontSize:"14px", fontStyle:"italic", background:WHITE },
  };

  const badge = (type, hrs) => {
    if (type==="absent")             return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fee2e2",color:"#991b1b"}}><IcoAbsent/> Absent</span>;
    if (type==="out_of_town")        return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#dbeafe",color:"#1e40af"}}><IcoOutTown/> Out of Town</span>;
    if (type==="halfday_morning")    return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fde68a",color:"#92400e"}}><IcoHalf/> {hrs<4 ? 'Half Day (Undertime)' : 'Half Day (AM)'}</span>;
    if (type==="halfday_afternoon")  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fde68a",color:"#92400e"}}><IcoHalf/> {hrs<4 ? 'Half Day (Undertime)' : 'Half Day (PM)'}</span>;
    if (hrs>=8) return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#d1fae5",color:"#065f46"}}>Present</span>;
    if (hrs>0)  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#fef3c7",color:"#92400e"}}>Undertime</span>;
    return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:"12px",fontSize:"12px",fontWeight:"700",background:"#f3f4f6",color:"#9ca3af"}}>—</span>;
  };

  const templateBadge = (src) => {
    if (!src || src !== "individual") return null;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"3px",padding:"1px 6px",borderRadius:"8px",fontSize:"10px",fontWeight:"600",background:"#ede9fe",color:"#5b21b6",marginLeft:"4px",verticalAlign:"middle"}}>
        <IcoInfo/> Personal
      </span>
    );
  };

  const pageNums = Array.from({length:totalPages},(_,i)=>i+1);

  /* ════════════════════════════════════════
     EMPLOYEE DETAIL MODAL render helper
  ════════════════════════════════════════ */
  const renderEmpDetailModal = () => {
    if (!empDetailModal.open || !empDetailModal.emp) return null;
    const emp   = empDetailModal.emp;
    const { year, month } = empDetailMonth;
    const monthPickerValue = `${year}-${String(month + 1).padStart(2, "0")}`;
    const empName = emp.name || `${emp.firstName||''} ${emp.middleInitial ? emp.middleInitial+'. ' : ''}${emp.lastName||''}`.trim();
    const initials = empName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const stats = computeMonthStats(emp, year, month);
    const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());

    // Build day rows
    const dayRows = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dObj    = new Date(dateStr + 'T00:00:00');
      const dayIdx  = dObj.getDay();
      const isWknd  = dayIdx === 0 || dayIdx === 6;
      const isFut   = dateStr > todayDs;
      const rec     = empMonthLogs[dateStr];
      const st      = statuses[`${emp._id}-${dateStr}`] || rec?.status || null;
      const hrs     = rec ? calcHrs(rec) : 0;
      const ot      = parseFloat(rec?.overtime || 0) || 0;
      dayRows.push({ dateStr, dObj, dayIdx, isWknd, isFut, rec, st, hrs, ot });
    }

    // Stat card helper
    const StatCard = ({ label, value, sub, color, bg, icon }) => (
      <div style={{flex:"1 1 0",minWidth:"100px",background:bg||"#f9fafb",borderRadius:"12px",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"4px",border:"1px solid #e5e7eb"}}>
        <div style={{fontSize:"11px",fontWeight:"600",color:"#6b7280",textTransform:"uppercase",letterSpacing:".07em",display:"flex",alignItems:"center",gap:"4px"}}>
          {icon} {label}
        </div>
        <div style={{fontSize:"24px",fontWeight:"800",color:color||NAVY,fontFamily:"'Playfair Display',serif",lineHeight:1.1}}>{value}</div>
        {sub && <div style={{fontSize:"11px",color:"#9ca3af",fontWeight:"500"}}>{sub}</div>}
      </div>
    );

    const rowBg = (row) => {
      if (row.isWknd) return "#f8fafc";
      if (row.isFut)  return "#f0f7ff";
      if (row.st === "absent")           return "#fff5f5";
      if (row.st?.startsWith("halfday")) return "#fffbea";
      if (row.st === "out_of_town")      return "#eff6ff";
      if (row.hrs >= 8) return "#f0fdf4";
      if (row.hrs > 0)  return "#fffbeb";
      return WHITE;
    };

    const rowStatus = (row) => {
      if (row.isWknd) return <span style={{fontSize:"11px",color:"#cbd5e1",fontWeight:"600"}}>Weekend</span>;
      if (row.isFut)  return <span style={{fontSize:"11px",color:"#93c5fd",fontWeight:"600"}}>Upcoming</span>;
      if (!row.rec && !row.st) return <span style={{fontSize:"11px",color:"#d1d5db",fontWeight:"600"}}>No Record</span>;
      if (row.st === "absent")           return <span style={{display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"11px",fontWeight:"700",color:"#991b1b",background:"#fee2e2",padding:"2px 8px",borderRadius:"10px"}}><IcoAbsent/> Absent</span>;
      if (row.st === "out_of_town")      return <span style={{display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"11px",fontWeight:"700",color:"#1e40af",background:"#dbeafe",padding:"2px 8px",borderRadius:"10px"}}><IcoOutTown/> Out of Town</span>;
      if (row.st === "halfday_morning")  return <span style={{display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"11px",fontWeight:"700",color:"#92400e",background:"#fde68a",padding:"2px 8px",borderRadius:"10px"}}><IcoHalf/> Half Day AM</span>;
      if (row.st === "halfday_afternoon")return <span style={{display:"inline-flex",alignItems:"center",gap:"3px",fontSize:"11px",fontWeight:"700",color:"#92400e",background:"#fde68a",padding:"2px 8px",borderRadius:"10px"}}><IcoHalf/> Half Day PM</span>;
      if (row.hrs >= 8) return <span style={{fontSize:"11px",fontWeight:"700",color:"#065f46",background:"#d1fae5",padding:"2px 8px",borderRadius:"10px"}}>Present</span>;
      if (row.hrs > 0)  return <span style={{fontSize:"11px",fontWeight:"700",color:"#92400e",background:"#fef3c7",padding:"2px 8px",borderRadius:"10px"}}>Undertime</span>;
      return <span style={{fontSize:"11px",color:"#d1d5db",fontWeight:"600"}}>—</span>;
    };

    return (
      <>
      <div style={{...S.overlay, zIndex:1100}} onClick={e=>{ if(e.target===e.currentTarget) closeEmpDetail(); }}>
        <div style={{
          background:WHITE, borderRadius:"20px", width:"100%", maxWidth:"900px",
          maxHeight:"92vh", display:"flex", flexDirection:"column",
          boxShadow:"0 24px 80px rgba(0,0,0,.25)", overflow:"hidden",
          animation:"slideIn .25s ease"
        }}>

          {/* ── MODAL HEADER ── */}
          <div style={{
            background:`linear-gradient(135deg, ${NAVY} 0%, #1e3a5f 100%)`,
            padding:"28px 32px", position:"relative", flexShrink:0
          }}>
            {/* decorative glow */}
            <div style={{position:"absolute",top:"-40%",right:"-10%",width:"300px",height:"300px",background:"radial-gradient(circle,rgba(255,231,151,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

            <div style={{display:"flex",alignItems:"center",gap:"18px",position:"relative",zIndex:1}}>
              {/* Avatar */}
              <div style={{
                width:"64px", height:"64px", borderRadius:"18px",
                background:"#610000",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"22px", fontWeight:"800", color:WHITE,
                fontFamily:"'Playfair Display',serif",
                boxShadow:"0 4px 16px rgba(0,0,0,.3)", flexShrink:0
              }}>
                {initials}
              </div>
              {/* Name block */}
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:"700",color:WHITE,lineHeight:1.2}}>{empName}</div>
                <div style={{display:"flex",gap:"12px",marginTop:"6px",flexWrap:"wrap"}}>
                  {emp.idNumber && (
                    <span style={{fontSize:"12px",color:"rgba(255,255,255,.65)",display:"flex",alignItems:"center",gap:"4px"}}>
                      <IcoUser/> {emp.idNumber}
                    </span>
                  )}
                  {emp.department && (
                    <span style={{fontSize:"12px",color:"rgba(255,255,255,.65)"}}>{emp.department}</span>
                  )}
                  {emp.position && (
                    <span style={{fontSize:"12px",color:"rgba(255,255,255,.65)"}}>{emp.position}</span>
                  )}
                </div>
              </div>
              {/* Close */}
              <button onClick={closeEmpDetail} style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:"10px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontSize:"20px",lineHeight:1,flexShrink:0}}>×</button>
            </div>

            {/* Month Navigation */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"20px",background:"rgba(255,255,255,.1)",borderRadius:"12px",padding:"10px 16px",position:"relative",zIndex:1}}>
              <button onClick={()=>changeDetailMonth(-1)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"8px",padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",color:WHITE,fontSize:"13px",fontWeight:"600"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Prev
              </button>
              <div style={{display:"flex",alignItems:"center",gap:"8px",color:WHITE}}>
                <input
                  type="month"
                  className="month-picker-white"
                  value={monthPickerValue}
                  onChange={(e)=>pickDetailMonth(e.target.value)}
                  style={{
                    fontFamily:"'Playfair Display',serif",
                    fontSize:"15px",
                    fontWeight:"700",
                    color:WHITE,
                    background:"rgba(255,255,255,.08)",
                    border:"1px solid rgba(255,255,255,.25)",
                    borderRadius:"8px",
                    padding:"6px 10px",
                    outline:"none",
                    cursor:"pointer"
                  }}
                />
              </div>
              <button onClick={()=>changeDetailMonth(1)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"8px",padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px",color:WHITE,fontSize:"13px",fontWeight:"600"}}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"12px",gap:"10px",flexWrap:"wrap",position:"relative",zIndex:1}}>
              <div style={{fontSize:"11px",fontWeight:"600",color:"rgba(255,255,255,.78)"}}>
                For past months, this marks all working days (Mon–Fri) as Present for this employee. Weekends are not changed.
              </div>
              <button
                onClick={()=>setShowBulkMonthConfirm(true)}
                disabled={!isPastMonth || bulkMonthSaving || empDetailLoading}
                style={{
                  display:"inline-flex",alignItems:"center",gap:"6px",
                  padding:"8px 14px",borderRadius:"9px",border:"1px solid rgba(255,255,255,.25)",
                  background:(!isPastMonth || empDetailLoading) ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.2)",
                  color:(!isPastMonth || empDetailLoading) ? "rgba(255,255,255,.55)" : WHITE,
                  fontSize:"12px",fontWeight:"700",cursor:(!isPastMonth || bulkMonthSaving || empDetailLoading) ? "not-allowed" : "pointer"
                }}
              >
                {bulkMonthSaving ? "Applying..." : "Weekdays Present"}
              </button>
            </div>
          </div>

          {/* ── STATS STRIP ── */}
          {!empDetailLoading && (
            <div style={{padding:"20px 28px",background:"#fafafa",borderBottom:`1px solid ${BORDER}`,flexShrink:0}}>
              <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
                <StatCard
                  label="Working Days" icon={<IcoCalendar/>}
                  value={stats.weekdays}
                  sub={`${stats.presentDays} recorded`}
                  color={NAVY} bg={WHITE}
                />
                <StatCard
                  label="Total Hours (incl. OT)" icon={<IcoClock/>}
                  value={stats.totalHoursWithOT.toFixed(1)}
                  sub={`${(stats.totalHoursWithOT / (stats.recordedDays || 1)).toFixed(1)} avg/recorded day`}
                  color="#065f46" bg="#f0fdf4"
                />
                <StatCard
                  label="Overtime" icon={<IcoTrend/>}
                  value={stats.totalOT.toFixed(1) + "h"}
                  sub="this month"
                  color="#5b21b6" bg="#faf5ff"
                />
                <StatCard
                  label="Absent" icon={<IcoAbsent/>}
                  value={stats.absentDays}
                  sub={stats.absentDays===1?"day":"days"}
                  color="#991b1b" bg="#fff5f5"
                />
                <StatCard
                  label="Half Days" icon={<IcoHalf/>}
                  value={stats.halfDays}
                  sub={stats.halfDays===1?"occurrence":"occurrences"}
                  color="#92400e" bg="#fffbea"
                />
                {stats.outOfTownDays > 0 && (
                  <StatCard
                    label="Out of Town" icon={<IcoOutTown/>}
                    value={stats.outOfTownDays}
                    sub={stats.outOfTownDays===1?"day":"days"}
                    color="#1e40af" bg="#eff6ff"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── TABLE BODY ── */}
          <div style={{flex:1,overflowY:"auto",padding:"0"}}>
            {empDetailLoading ? (
              <div style={{padding:"48px",display:"flex",flexDirection:"column",alignItems:"center",gap:"16px"}}>
                <div style={{
                  width:"48px",height:"48px",border:`4px solid ${BORDER}`,borderTop:`4px solid ${RED}`,
                  borderRadius:"50%",animation:"spin 1s linear infinite"
                }}/>
                <div style={{fontSize:"14px",color:"#6b7280",fontWeight:"500"}}>Loading work hours for {MONTHS[month]} {year}…</div>
              </div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{position:"sticky",top:0,zIndex:2}}>
                  <tr>
                    {["Date","Day","Time In","Break","Resume","Time Out","Hours","Overtime","Status"].map((h,i)=>(
                      <th key={i} style={{
                        padding:"11px 14px",
                        textAlign: i <= 1 ? "left" : "center",
                        fontSize:"11px",fontWeight:"700",color:"#6b7280",
                        textTransform:"uppercase",letterSpacing:".07em",
                        background:"#f1f5f9",
                        borderBottom:`1px solid ${BORDER}`,
                        whiteSpace:"nowrap"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((row, idx) => {
                    const isToday = row.dateStr === todayDs;
                    const displayDay  = row.dObj.getDate();
                    const displayDayName = DAYS_SHORT[row.dayIdx];
                    const monthLabel = MONTHS_SHORT[row.dObj.getMonth()];

                    return (
                      <tr
                        key={row.dateStr}
                        style={{
                          background:rowBg(row),
                          borderBottom:`1px solid ${isToday?"#bfdbfe":BORDER}`,
                          outline: isToday ? `2px solid #3b82f6` : "none",
                          outlineOffset: isToday ? "-2px" : "0",
                          transition:"background .15s"
                        }}
                      >
                        {/* Date */}
                        <td style={{padding:"10px 14px",textAlign:"left",whiteSpace:"nowrap"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            {isToday && (
                              <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#3b82f6",flexShrink:0,display:"inline-block"}}/>
                            )}
                            <div>
                              <div style={{fontSize:"13px",fontWeight:isToday?"700":"600",color:isToday?"#1d4ed8":row.isWknd?"#94a3b8":NAVY}}>
                                {monthLabel} {displayDay}
                              </div>
                              {isToday && (
                                <div style={{fontSize:"10px",color:"#3b82f6",fontWeight:"600",textTransform:"uppercase",letterSpacing:".06em"}}>Today</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day name */}
                        <td style={{padding:"10px 14px",textAlign:"left"}}>
                          <span style={{fontSize:"12px",fontWeight:"600",color:row.isWknd?"#94a3b8":row.dayIdx===1||row.dayIdx===5?"#64748b":"#374151"}}>
                            {displayDayName}
                          </span>
                        </td>

                        {/* Time columns */}
                        {["timeIn","breakTime","resume","timeOut"].map(field => {
                          const val = row.rec?.[field] || "";
                          const display = (val && val.length===5 && val.includes(":")) ? formatTime12(val) : val;
                          return (
                            <td key={field} style={{padding:"10px 12px",textAlign:"center"}}>
                              {row.isWknd || row.st==="absent" ? (
                                <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                              ) : display ? (
                                <span style={{fontSize:"12.5px",fontWeight:"500",color:row.isFut?"#93c5fd":NAVY,fontVariantNumeric:"tabular-nums"}}>{display}</span>
                              ) : (
                                <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Hours */}
                        <td style={{padding:"10px 12px",textAlign:"center"}}>
                          {row.isWknd || row.st==="absent" ? (
                            <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                          ) : row.hrs > 0 ? (
                            <span style={{
                              fontSize:"13px",fontWeight:"700",fontVariantNumeric:"tabular-nums",
                              color: row.hrs>=8?"#065f46":row.hrs>=4?"#d97706":"#92400e"
                            }}>
                              {row.hrs.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                          )}
                        </td>

                        {/* Overtime */}
                        <td style={{padding:"10px 12px",textAlign:"center"}}>
                          {row.ot > 0 ? (
                            <span style={{fontSize:"12.5px",fontWeight:"600",color:"#5b21b6",background:"#f3e8ff",padding:"2px 8px",borderRadius:"8px"}}>
                              +{row.ot.toFixed(2)}h
                            </span>
                          ) : (
                            <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{padding:"10px 12px",textAlign:"center"}}>
                          {rowStatus(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── FOOTER ── */}
          {!empDetailLoading && (
            <div style={{padding:"14px 28px",borderTop:`1px solid ${BORDER}`,background:"#fafafa",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"12px",color:"#9ca3af"}}>
                {daysInMonth} days in {MONTHS[month]} · {stats.weekdays} working days
              </div>
              <button
                onClick={closeEmpDetail}
                style={{padding:"8px 20px",background:NAVY,color:WHITE,border:"none",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",cursor:"pointer"}}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
      {showBulkMonthConfirm && (
        <div style={{...S.overlay, zIndex:1200}} onClick={e=>{ if(e.target===e.currentTarget) setShowBulkMonthConfirm(false); }}>
          <div style={S.confirmModal}>
            <div style={{width:"56px",height:"56px",borderRadius:"50%",background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/><path d="M8 17h8"/></svg>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:"700",color:NAVY,marginBottom:"8px"}}>
              Confirm Past Month Weekdays
            </div>
            <div style={{fontSize:"13.5px",color:"#6b7280",marginBottom:"12px",lineHeight:1.6}}>
              Set <strong>{empName}</strong> as <strong style={{color:"#1e40af"}}>Present</strong> for all weekdays in <strong>{MONTHS[month]} {year}</strong>?
            </div>
            <div style={{fontSize:"12.5px",color:"#9ca3af",marginBottom:"22px"}}>
              This updates only weekdays (Mon–Fri) in the selected past month. Weekend records will stay as they are.
            </div>
            <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
              <button
                style={{padding:"9px 22px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"600",cursor:"pointer",border:`2px solid ${BORDER}`,background:WHITE,color:NAVY}}
                onClick={()=>setShowBulkMonthConfirm(false)}
              >
                Cancel
              </button>
              <button
                style={{padding:"9px 22px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"700",cursor:bulkMonthSaving?"not-allowed":"pointer",border:"none",background:bulkMonthSaving?"#93c5fd":"#1d4ed8",color:WHITE}}
                onClick={async ()=>{
                  setShowBulkMonthConfirm(false);
                  await bulkSetMonthPresent();
                }}
                disabled={bulkMonthSaving}
              >
                {bulkMonthSaving ? "Applying..." : "Yes, Mark Weekdays Present"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}}
        @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-8px)}}
        @keyframes slideIn{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        .emp-name-link:hover { text-decoration:underline !important; color:#610000 !important; }
        .month-picker-white::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 1; }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{position:"fixed",top:"20px",right:"20px",zIndex:9999,padding:"12px 20px",borderRadius:"10px",background:toast.type==="individual"?"#5b21b6":RED,color:WHITE,fontSize:"13.5px",fontWeight:"600",boxShadow:"0 8px 24px rgba(0,0,0,.2)",display:"flex",alignItems:"center",gap:"8px",animation:"slideIn .3s ease",maxWidth:"360px"}}>
          {toast.msg}
        </div>
      )}

      {/* ── TEMPLATE WARNING ── */}
      {showTemplateWarning && templatesLoaded && (
        <div style={{margin:"16px 20px",padding:"16px 20px",background:"#fef3c7",border:"2px solid #f59e0b",borderRadius:"12px",display:"flex",alignItems:"center",gap:"16px",animation:"slideIn .3s ease"}}>
          <div style={{width:"40px",height:"40px",background:"#f59e0b",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:"15px",fontWeight:"700",color:"#92400e",marginBottom:"4px"}}>No Work Hour Templates Found</div>
            <div style={{fontSize:"13px",color:"#78350f",lineHeight:"1.4"}}>You must create a work hour template before you can auto-fill the table. Click "Create Template Now" to set your standard work hours.</div>
            <div style={{marginTop:"10px",display:"flex",gap:"8px"}}>
              <button style={{padding:"6px 14px",background:"#f59e0b",color:"white",border:"none",borderRadius:"6px",fontSize:"12px",fontWeight:"600",cursor:"pointer"}} onClick={()=>{ setShowModal(true); setModalTab('all'); setEditForm({...DEF}); }}>Create Template Now</button>
              <button style={{padding:"6px 14px",background:"transparent",color:"#92400e",border:"1px solid #f59e0b",borderRadius:"6px",fontSize:"12px",fontWeight:"600",cursor:"pointer"}} onClick={()=>setShowTemplateWarning(false)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP ROW ── */}
      <div style={S.topRow}>
        <div style={S.clockCard}>
          <div style={S.clockGlow}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:"24px",alignItems:"center"}}>
            {/* Day */}
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"48px",fontWeight:"700",color:"#FFFFFF",letterSpacing:"2px",marginBottom:"8px"}}>
                {DAYS_SHORT[new Date().getDay()]}
              </div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,.5)",letterSpacing:"1px",textTransform:"uppercase"}}>Day</div>
            </div>
            {/* Time separator and display */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
              <div style={{fontSize:"48px",fontWeight:"700",color:"#FFFFFF",letterSpacing:"2px"}}>
                {clockStr ? clockStr.split(":")[0] : "--"}
              </div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,.5)",letterSpacing:"1px",textTransform:"uppercase"}}>Hours</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
              <div style={{fontSize:"48px",fontWeight:"700",color:"#FFFFFF",letterSpacing:"2px"}}>
                {clockStr ? clockStr.split(":")[1] : "--"}
              </div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,.5)",letterSpacing:"1px",textTransform:"uppercase"}}>Minutes</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
              <div style={{fontSize:"48px",fontWeight:"700",color:"#FFFFFF",letterSpacing:"2px"}}>
                {clockStr ? clockStr.split(":")[2]?.substring(0,2) : "--"}
              </div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,.5)",letterSpacing:"1px",textTransform:"uppercase"}}>Seconds</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"10px",alignItems:"flex-end"}}>
          <button style={S.editBtn} onClick={()=>{ if(pageRows[0]&&!getStatus(pageRows[0]._id)) openModal(pageRows[0]); }}>
            <IcoEdit/> Edit Log
          </button>
        </div>
      </div>

      {/* ── UNDERTIME MODAL ── */}
      {utModal.open && (
        <div style={S.overlay}>
          <div style={S.confirmModal}>
            <div style={{fontSize:"16px",fontWeight:700,color:NAVY,marginBottom:"10px"}}>Set Undertime</div>
            <div style={{fontSize:"13px",color:"#6b7280",marginBottom:"10px"}}>
              {(() => {
                const emp = employees.find(e=>e._id===utModal.eid);
                const name = emp ? (emp.name || `${emp.firstName} ${emp.middleInitial ? emp.middleInitial+'. ' : ''}${emp.lastName}`) : '';
                return name;
              })()}
            </div>
            <div style={{display:"grid",gap:"8px"}}>
              <label style={S.mLabel}>Hours</label>
              <input style={S.mInput} type="number" step="0.25" min="0" value={utValue} onChange={e=>setUtValue(e.target.value)} placeholder="0.50"/>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",marginTop:"16px"}}>
              <button onClick={closeUndertimeModal} style={{padding:"8px 14px",borderRadius:"8px",border:`2px solid ${NAVY}`,background:"transparent",color:NAVY,fontWeight:600}}>Cancel</button>
              <button onClick={applyUndertime} style={{padding:"8px 14px",borderRadius:"8px",border:"none",background:RED,color:WHITE,fontWeight:600}}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR MESSAGE ── */}
      {error && (
        <div style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:"10px",padding:"12px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",fontSize:"13px",color:"#991b1b"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span>{error}</span>
          <button onClick={()=>setError('')} style={{background:"none",border:"none",color:"#991b1b",cursor:"pointer",fontSize:"16px",padding:"0",marginLeft:"auto"}}>×</button>
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div style={{marginBottom:"14px"}}>
          <ShimmerLoader type="title" width="200px" style={{marginBottom:"16px"}}/>
          <TableShimmer rows={5} columns={6}/>
        </div>
      )}

      {/* ── WEEKEND BANNER ── */}
      {isWeekend && (
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"10px",padding:"10px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",fontSize:"13px",color:"#1e40af",fontWeight:"600"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Weekend — work hours are pre-filled from your template but will NOT auto-save.
          Click <strong style={{marginLeft:"4px"}}>"Save Weekend"</strong> on each row to save to the database.
        </div>
      )}

      {/* ── NAV ROW ── */}
      {!loading && (
        <div style={S.navRow}>
          <div style={{display:"flex",alignItems:"center"}}>
            <button style={S.prevBtn} onClick={()=>{ const d=new Date(curDate); d.setDate(d.getDate()-1); navigateToDate(d); }}><IcoChevL/> Prev</button>
            <div style={{...S.datePill,padding:"8px 14px",position:"relative",display:"flex",alignItems:"center",gap:"8px"}}>
              <input type="date" value={ds}
                onChange={e=>{ const d=new Date(e.target.value+"T00:00:00"); navigateToDate(d); }}
                style={{border:"none",background:"transparent",color:isFuture?"#1d4ed8":NAVY,fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",outline:"none",cursor:"pointer",padding:"0"}}
              />
            </div>
            <button style={S.nextBtn} onClick={()=>{ const d=new Date(curDate); d.setDate(d.getDate()+1); navigateToDate(d); }}>Next <IcoChevR/></button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {ds===todayDs && (
              <button style={{...S.todayBtn,cursor:"default"}} disabled>Today</button>
            )}
            <div style={S.srchWrap}>
              <span style={S.srchIcon}><IcoSearch/></span>
              <input type="text" placeholder="Search employee..." value={search}
                onChange={e=>{ setSearch(e.target.value); setPage(1); }} style={S.srchInput}/>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE ── */}
      {!loading && (
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
              {pageRows.length===0 ? (
                <tr><td colSpan="9" style={S.weekendMsg}>No employees found.</td></tr>
              ) : pageRows.map(emp => {
                const st       = getStatus(emp._id);
                const rec      = logs[emp._id]?.[ds] || { timeIn:"", breakTime:"", resume:"", timeOut:"" };
                const hrs      = st==="absent" ? 0 : calcHrs(rec);
                const saved    = savedRows[`${emp._id}-${ds}`];
                const modified = modifiedRows[`${emp._id}-${ds}`];
                const disabled = st==="absent" || (st && st.startsWith && st.startsWith('halfday'));
                const tplSrc   = isFuture ? getTemplateSource(emp._id) : null;
                const empDisplayName = emp.name || `${emp.firstName} ${emp.middleInitial ? emp.middleInitial+'. ' : ''}${emp.lastName}`;

                return (
                  <tr key={emp._id} onMouseEnter={()=>setHovRow(emp._id)} onMouseLeave={()=>setHovRow(null)}>

                    {/* ── Name cell — clickable ── */}
                    <td style={S.tdL(emp._id,st)}>
                      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        {/* Avatar initials */}
                        <div style={{
                          width:"32px",height:"32px",borderRadius:"8px",flexShrink:0,
                          background:`linear-gradient(135deg,${NAVY} 0%,#1e3a5f 100%)`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:"11px",fontWeight:"700",color:WHITE,letterSpacing:".03em"
                        }}>
                          {empDisplayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div>
                          {/* Clickable name */}
                          <button
                            className="emp-name-link"
                            title={`View ${empDisplayName}'s monthly work hours`}
                            onClick={() => openEmpDetail(emp)}
                            style={{
                              background:"none",border:"none",padding:"0",cursor:"pointer",
                              fontWeight:"600",color:st?"#9ca3af":NAVY,
                              fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
                              textAlign:"left",display:"flex",alignItems:"center",gap:"5px",
                              transition:"color .15s"
                            }}
                          >
                            {empDisplayName}
                            {tplSrc && templateBadge(tplSrc)}
                            {/* subtle calendar icon hint */}
                            <svg
                              width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke={st?"#c4c4c4":"#94a3b8"} strokeWidth="2" strokeLinecap="round"
                              style={{opacity:.6,flexShrink:0}}
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                          </button>
                          <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"1px"}}>{emp.idNumber || emp._id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Time fields */}
                    {["timeIn","breakTime","resume","timeOut"].map(field => {
                      const raw = rec[field] || "";
                      const val = (raw && raw.length===5 && raw.includes(":")) ? formatTime12(raw) : raw;
                      const isLoading = dataLoading || (isWeekend && weekendDataLoading);
                      return (
                        <td key={field} style={S.td(emp._id,st)}>
                          {disabled ? (
                            <span style={{color:"#d1d5db",fontSize:"12px"}}>{st.startsWith("halfday")&&val?val:"—"}</span>
                          ) : isLoading ? (
                            <div style={S.loadingInput("95px")}><div style={S.spinner}></div></div>
                          ) : (
                            <div style={S.timeInputWrapper()}>
                              <Clock size={14} color={RED} style={{flexShrink:0,opacity:0.7}} />
                              <input
                                style={S.timeInput()} type="text" placeholder="HH:MM AM"
                                value={val}
                                onChange={e => updateTimeField(emp._id, field, e.target.value)}
                                onBlur={() => handleFieldBlur(emp._id, field)}
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Hrs */}
                    <td style={S.td(emp._id,st)}>
                      {dataLoading||(isWeekend&&weekendDataLoading) ? (
                        <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"36px"}}><div style={S.spinner}></div></div>
                      ) : st==="absent" ? (
                        <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                          {(()=>{
                            const ot = parseFloat(rec.overtime||0)||0;
                            const totalRendered = hrs+(isNaN(ot)?0:ot);
                            return <span style={{fontWeight:"700",color:hrs>=8?"#065f46":hrs>=4?"#d97706":hrs>0?"#92400e":"#9ca3af"}}>{fmtH(totalRendered)}</span>;
                          })()}
                          {(()=>{
                            const exp = expectedHoursForStatus(st);
                            const ut = Math.max(0, exp-hrs);
                            if (ut>0) return <span style={{fontSize:"10px",color:"#b91c1c"}}>- UT {ut.toFixed(2)}h</span>;
                            return null;
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Overtime */}
                    <td style={S.td(emp._id,st)}>
                      {disabled ? (
                        <span style={{color:"#d1d5db",fontSize:"12px"}}>—</span>
                      ) : dataLoading||(isWeekend&&weekendDataLoading) ? (
                        <div style={S.loadingInput("80px")}><div style={S.spinner}></div></div>
                      ) : (
                        <input style={S.otInput()} type="number" step="0.25" min="0" max="24"
                          value={rec.overtime||"0.00"}
                          onChange={e=>updateField(emp._id,"overtime",e.target.value)}
                          onBlur={(e)=>handleOvertimeBlur(emp._id,e.target.value)}
                        />
                      )}
                    </td>

                    {/* Status */}
                    <td style={S.td(emp._id,st)}>{badge(st,hrs)}</td>

                    {/* Actions */}
                    <td style={S.td(emp._id,st)}>
                      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        {!isWeekend&&modified&&!st && (
                          <span style={{fontSize:"11px",color:"#f59e0b",fontWeight:"600",padding:"2px 6px",background:"#fffbeb",borderRadius:"4px"}}>Saving...</span>
                        )}
                        <select
                          style={S.actionSelect(st)}
                          value={actionMenus[emp._id] || ""}
                          onChange={e=>{
                            const action = e.target.value;
                            if (!action) return;
                            setActionMenus(p=>({...p,[emp._id]:""}));
                            if (action === "save_weekend") { saveWeekendWorkHours(emp._id); return; }
                            if (action === "halfday") { setConfirmModal({open:true,emp,type:"halfday",halfDayType:"morning"}); return; }
                            if (action === "out_of_town") { applyStatus(emp._id,"out_of_town"); return; }
                            if (action === "undertime") { openUndertimeModal(emp._id); return; }
                            if (action === "absent") { setConfirmModal({open:true,emp,type:"absent"}); return; }
                            if (action === "undo") { undoStatus(emp._id); }
                          }}
                        >
                          <option value="">Actions</option>
                          {st ? (
                            <>
                              {(st.startsWith&&st.startsWith('halfday')) && <option value="undertime">Undertime</option>}
                              <option value="undo">Undo Status</option>
                              {isWeekend && (
                                <option value="save_weekend" disabled={!modified}>
                                  {modified ? "Save Weekend" : "Save Weekend (no changes)"}
                                </option>
                              )}
                            </>
                          ) : (
                            <>
                              {isWeekend && (
                                <option value="save_weekend" disabled={!modified}>
                                  {modified ? "Save Weekend" : "Save Weekend (no changes)"}
                                </option>
                              )}
                              <option value="halfday">Half Day</option>
                              <option value="out_of_town">Out of Town</option>
                              <option value="undertime">Undertime</option>
                              <option value="absent">Absent</option>
                            </>
                          )}
                        </select>
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
            <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
              {(()=>{
                const ac=employees.filter(e=>getStatus(e._id)==="absent").length;
                const hm=employees.filter(e=>getStatus(e._id)==="halfday_morning").length;
                const ha=employees.filter(e=>getStatus(e._id)==="halfday_afternoon").length;
                const ot=employees.filter(e=>getStatus(e._id)==="out_of_town").length;
                return (
                  <>
                    {ac>0&&<span style={{fontSize:"12.5px",color:"#991b1b",fontWeight:"600"}}>{ac} absent today</span>}
                    {hm>0&&<span style={{fontSize:"12.5px",color:"#92400e",fontWeight:"600"}}>{hm} half day (AM)</span>}
                    {ha>0&&<span style={{fontSize:"12.5px",color:"#92400e",fontWeight:"600"}}>{ha} half day (PM)</span>}
                    {ot>0&&<span style={{fontSize:"12.5px",color:"#1e40af",fontWeight:"600"}}>{ot} out of town today</span>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages>1 && (
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
      {showModal && editEmp && (
        <div style={S.overlay} onClick={e=>{ if(e.target===e.currentTarget) closeModal(); }}>
          <div style={S.modal}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:"700",color:NAVY}}>Edit Log</div>
              <button style={{background:"none",border:"none",fontSize:"22px",cursor:"pointer",color:"#8a8a8a"}} onClick={closeModal}>×</button>
            </div>
            <div style={{fontSize:"12.5px",color:"#6b7280",marginBottom:"4px"}}>{fmtDisplayDate(curDate)}</div>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"8px",padding:"8px 12px",marginBottom:"16px",fontSize:"12px",color:"#15803d",display:"flex",gap:"6px",alignItems:"flex-start"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginTop:"1px",flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>Auto-fill enabled:</strong> Saving will apply these times to all future weekday dates{modalTab==="individual"?` for ${selEmp.name||`${selEmp.firstName} ${selEmp.lastName}`}`:" for all employees"}. Individual settings override global ones.</span>
            </div>
            <div style={{display:"flex",marginBottom:"20px",borderBottom:`1px solid ${BORDER}`}}>
              {["all","individual"].map(tab=>(
                <button key={tab} onClick={()=>setModalTab(tab)} style={{padding:"10px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:"14px",fontWeight:"600",cursor:"pointer",border:"none",background:"none",color:modalTab===tab?RED:"#6b7280",borderBottom:modalTab===tab?`2px solid ${RED}`:"2px solid transparent"}}>
                  {tab==="all"?"All Employees":"Individual"}
                </button>
              ))}
            </div>
            {modalTab==="individual" && (
              <select style={{width:"100%",padding:"10px 12px",border:"2px solid #e8dfd6",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",color:NAVY,background:WHITE,outline:"none",marginBottom:"16px"}}
                value={selEmp._id||''} onChange={e=>{ const emp=employees.find(x=>x._id===e.target.value); if(emp){ setSelEmp(emp); setEditForm({...(logs[emp._id]?.[ds]||{...DEF})}); } }}>
                <option value="">Select Employee</option>
                {employees.map(e=>(
                  <option key={e._id} value={e._id}>{e.name||`${e.firstName} ${e.middleInitial?e.middleInitial+'. ':''}${e.lastName}`}</option>
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
              <button style={{padding:"9px 20px",borderRadius:"8px",fontFamily:"'DM Sans',sans-serif",fontSize:"13.5px",fontWeight:"600",cursor:isModalSaving?"not-allowed":"pointer",border:"none",background:isModalSaving?"#ccc":RED,color:WHITE,display:"flex",alignItems:"center",gap:"8px"}}
                onClick={handleModalSave} disabled={isModalSaving}>
                {isModalSaving && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>}
                {isModalSaving ? "Saving..." : (modalTab==="all" ? "Save & Auto-fill All" : `Save & Auto-fill ${selEmp.name||`${selEmp.firstName} ${selEmp.lastName}`}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL (Absent / Half Day) ── */}
      {confirmModal.open && confirmModal.emp && confirmModal.type && (()=>{
        const isHD = confirmModal.type==="halfday";
        const cfg = {
          absent:  { color:RED,      bg:"#fee2e2", title:"Mark as Absent?",   btnLabel:"Yes, Mark Absent",   note:"Their time log for this day will be cleared." },
          halfday: { color:"#92400e",bg:"#fde68a", title:"Mark as Half Day?", btnLabel:"Yes, Mark Half Day", note:"Select morning or afternoon shift." },
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
                Marking <strong>{confirmModal.emp.name||`${confirmModal.emp.firstName} ${confirmModal.emp.middleInitial?confirmModal.emp.middleInitial+'. ':''}${confirmModal.emp.lastName}`}</strong> as{" "}
                <strong style={{color:cfg.color}}>{isHD?"Half Day":"Absent"}</strong> for <strong>{fmtDisplayDate(curDate)}</strong>.
              </div>
              {isHD && (
                <div style={{marginBottom:"16px"}}>
                  <div style={{fontSize:"12px",fontWeight:"600",color:NAVY,marginBottom:"8px",textTransform:"uppercase",letterSpacing:".07em"}}>Select Shift:</div>
                  <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
                    {["morning","afternoon"].map(shift=>(
                      <button key={shift}
                        style={{padding:"8px 16px",border:`2px solid ${confirmModal.halfDayType===shift?"#92400e":BORDER}`,borderRadius:"8px",background:confirmModal.halfDayType===shift?"#fde68a":WHITE,color:confirmModal.halfDayType===shift?"#92400e":NAVY,fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:"600",cursor:"pointer"}}
                        onClick={()=>setConfirmModal(p=>({...p,halfDayType:shift}))}>
                        {shift==="morning"?"Morning":"Afternoon"}
                        <div style={{fontSize:"11px",fontWeight:"400",marginTop:"2px",opacity:.8}}>{shift==="morning"?"8:30 AM – 12:30 PM":"1:00 PM – 5:30 PM"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{fontSize:"12.5px",color:"#9ca3af",marginBottom:"22px"}}>
                {isHD ? (confirmModal.halfDayType==="morning"?"Morning shift (8:30 AM – 12:30 PM) will be applied.":"Afternoon shift (1:00 PM – 5:30 PM) will be applied.") : cfg.note}
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

      {/* ── EMPLOYEE DETAIL MODAL ── */}
      {renderEmpDetailModal()}

      <style>{`
        div[style*="timeInputWrapper"] {
          transition: all 0.25s ease;
        }
        div[style*="timeInputWrapper"]:hover {
          border-color: #a72703;
          box-shadow: 0 2px 8px rgba(167, 39, 3, 0.1);
        }
        div[style*="timeInputWrapper"]:focus-within {
          border-color: #610000;
          box-shadow: 0 0 0 3px rgba(97, 0, 0, 0.08);
        }
        input[style*="timeInput"]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
