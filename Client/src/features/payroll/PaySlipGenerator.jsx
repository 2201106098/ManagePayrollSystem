import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import { employeeAPI } from "../../api/employee.api";
import paySlipAPI from "../../api/paySlip.api";
import periodSettingsAPI from "../../api/periodSettings.api";
import { FormShimmer } from "../../components/ui/ShimmerLoader";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import employeeRateAPI from "../../api/employeeRate.api";
import { addActivity } from "../../utils/activityLog";

/* ── CONSTANTS ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MAX_TIMEFRAME_DAYS = 17;
const PAYSLIP_DOWNLOAD_COUNTER_KEY = "payslipDownloadsByMonth";

const incrementPaySlipDownloadCounter = (yearValue, monthValue) => {
  if (yearValue === undefined || monthValue === undefined) return;
  const storageKey = `${yearValue}-${monthValue}`;
  const raw = localStorage.getItem(PAYSLIP_DOWNLOAD_COUNTER_KEY);
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  parsed[storageKey] = (Number(parsed[storageKey]) || 0) + 1;
  localStorage.setItem(PAYSLIP_DOWNLOAD_COUNTER_KEY, JSON.stringify(parsed));
};

/* ── TIME FORMATTING ── */
const formatTime12 = (time24) => {
  if (!time24) return "";
  const timePart = time24.split(" ")[0];
  const [hours, minutes] = timePart.split(":");
  if (!hours || !minutes) return time24;
  const hour = parseInt(hours, 10);
  if (hour === 0)  return `12:${minutes} AM`;
  if (hour < 12)  return `${hour}:${minutes} AM`;
  if (hour === 12) return `12:${minutes} PM`;
  return `${hour - 12}:${minutes} PM`;
};

const hasWorkedTime = (day) => {
  if (!day) return false;
  return Boolean(
    day.timeIn ||
    day.timeOut ||
    day.breakTime ||
    day.resume ||
    (Number(day.hours) || 0) > 0 ||
    (Number(day.overtime) || 0) > 0
  );
};

const parseTimeToMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const t = value.trim();
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const meridiem = match12[3].toUpperCase();
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
  return null;
};

const getDayHours = (day) => {
  if (!day) return 0;
  const numericHours = Number(day.hours);
  if (Number.isFinite(numericHours) && numericHours > 0) return numericHours;
  const start = parseTimeToMinutes(day.timeIn);
  const end = parseTimeToMinutes(day.timeOut);
  if (start === null || end === null) return Number.isFinite(numericHours) ? numericHours : 0;
  const breakStart = parseTimeToMinutes(day.breakTime);
  const breakEnd = parseTimeToMinutes(day.resume);
  let total = end - start;
  if (breakStart !== null && breakEnd !== null && breakEnd > breakStart) {
    total -= (breakEnd - breakStart);
  }
  return Math.max(0, total / 60);
};

// Total hours rendered (base hours + overtime) for display-only purposes
const getDayRenderedHours = (day) => {
  const base = getDayHours(day);
  const ot = Number(day?.overtime || 0);
  return base + (Number.isFinite(ot) ? ot : 0);
};
const formatDayShort = (dateValue) =>
  new Date(dateValue).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

const isWeekendDate = (dateValue) => {
  const day = new Date(dateValue).getUTCDay();
  return day === 0 || day === 6;
};

/* ── BREAKDOWN TABLE (screen) ── */
function BDTable({ rows, total }) {
  const th = { fontWeight:"700", background:"#f0f0f0", padding:"1px 3px",
    borderBottom:"1.5px solid #888", textAlign:"center", fontSize:"5pt",
    fontFamily:"Arial,sans-serif", color:"#000" };
  const td = (left) => ({ padding:"1px 3px", textAlign:left?"left":"center",
    borderBottom:"1px solid #eee", fontSize:"5pt", fontFamily:"Arial,sans-serif" });
  return (
    <table style={{ borderCollapse:"collapse", width:"100%", marginBottom:"4px" }}>
      <thead>
        <tr>
          <th style={{...th,textAlign:"left",width:"12%"}}>Day</th>
          <th style={{...th,width:"19%"}}>Time-In (PST)</th>
          <th style={{...th,width:"17%"}}>Break</th>
          <th style={{...th,width:"17%"}}>Resume</th>
          <th style={{...th,width:"19%"}}>Time-Out (PST)</th>
          <th style={{...th,width:"16%"}}>Total Hours</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={i}>
            <td style={td(true)}>{r.day}</td>
            <td style={td(false)}>{r.ti}</td>
            <td style={td(false)}>{r.brk}</td>
            <td style={td(false)}>{r.res}</td>
            <td style={td(false)}>{r.to}</td>
            <td style={td(false)}>{r.hrs}</td>
          </tr>
        ))}
        <tr>
          <td colSpan="5" style={{...td(false),textAlign:"right",fontWeight:"700",borderTop:"1px solid #bbb",borderBottom:"none",paddingTop:"3px"}}>
            Total Hours Spent
          </td>
          <td style={{...td(false),fontWeight:"700",borderTop:"1px solid #bbb",borderBottom:"none",paddingTop:"3px"}}>
            {total}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function PaySlipGenerator() {
  const isDevMode = import.meta.env.DEV;
  const today = new Date();
  const psPageRef = useRef(null);
  const generateRequestIdRef = useRef(0);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPeriod,   setSelectedPeriod]   = useState(null);
  const [employees,        setEmployees]         = useState([]);
  const [periods,          setPeriods]           = useState([]);
  const [currentPaySlip,   setCurrentPaySlip]    = useState(null);
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [loading,    setLoading]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error,      setError]      = useState(null);
  const [hovPrint,   setHovPrint]   = useState(false);
  const [cashAdvance,setCashAdvance]= useState(0);
  const [preparedBy, setPreparedBy] = useState('');
  const [cashAdvanceLimit, setCashAdvanceLimit] = useState(null);
  const [showCALimitModal, setShowCALimitModal] = useState(false);

  const resetCashAdvance = () => { setCashAdvance(0); setCurrentPaySlip(null); };

  useEffect(()=>{ fetchEmployees(); },[]);
  useEffect(()=>{ if(year&&month!==undefined) fetchPeriods(); },[year,month]);
  useEffect(()=>{ if(selectedEmployee&&selectedPeriod) generatePaySlip(); },[selectedEmployee,selectedPeriod]);
  useEffect(()=>{
    const loadRate = async ()=>{
      if(!selectedEmployee?._id){ setCashAdvanceLimit(null); return; }
      try{
        const r = await employeeRateAPI.getEmployeeRateByEmployeeId(selectedEmployee._id);
        let lim = 0;
        if (r?.data?.cashAdvanceLimit !== undefined) lim = r.data.cashAdvanceLimit;
        else if (r?.cashAdvanceLimit !== undefined) lim = r.cashAdvanceLimit;
        else if (r?.data?.rate?.cashAdvanceLimit !== undefined) lim = r.data.rate.cashAdvanceLimit;
        setCashAdvanceLimit(Number(lim)||0);
      }catch{
        setCashAdvanceLimit(0);
      }
    };
    loadRate();
  },[selectedEmployee?._id]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const r = await employeeAPI.getAllEmployees({ page: 1, limit: 1000, status: 'active', showArchived: false });
      let data = [];
      if(r.success&&r.data) data = Array.isArray(r.data)?r.data:(r.data.employees??r.data.data??[]);
      setEmployees(data);
      if(data.length>0&&!selectedEmployee) setSelectedEmployee(data[0]);
    } catch(e){ setError(e.message||'Failed to fetch employees'); }
    finally{ setLoading(false); }
  };

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const r = await periodSettingsAPI.getPeriodSettings(year,month);
      let list = [];
      if(r.success&&r.data){ const d=r.data; list=d.periods??d.data?.periods??(Array.isArray(d)?d:[]); }
      else if(r.periods) list=r.periods;
      if(!list.length) list=[
        {id:"P1",label:"First Half", startDay:1, endDay:15,payday:15,color:"#A72703"},
        {id:"P2",label:"Second Half",startDay:16,endDay:0, payday:0, color:"#132440"},
      ];
      setPeriods(list);
      if(list.length){
        const now = new Date();
        const isCurrentYM = (year === now.getFullYear() && month === now.getMonth());
        const day = now.getDate();
        const inRange = (p) => {
          const sd = Number(p.startDay || 1);
          let ed = Number(p.endDay || 0);
          if (!ed || ed === 0) ed = 31;
          return day >= sd && day <= ed;
        };
        let target = list[0];
        if (isCurrentYM) {
          const match = list.find(inRange);
          if (match) target = match;
          else {
            if (day >= 16) target = list.find(p => Number(p.startDay || 0) >= 16) || target;
            else target = list.find(p => Number(p.startDay || 0) < 16) || target;
          }
        }
        const selectedStillValid = selectedPeriod && list.some(p => p.id === selectedPeriod.id);
        if (!selectedPeriod || !selectedStillValid) {
          setSelectedPeriod(target);
        }
      }
    } catch(e){ setError(e.message||'Failed to fetch periods'); }
    finally{ setLoading(false); }
  };

  const generatePaySlip = async ({ silent = false } = {}) => {
    if(!selectedEmployee||!selectedPeriod) return;
    const requestId = ++generateRequestIdRef.current;
    try {
      if(!silent) setLoading(true);
      setError(null);
      const r = await paySlipAPI.generatePaySlip({
        employeeId:selectedEmployee._id, year, month,
        periodId:selectedPeriod.id, cashAdvance:cashAdvance||0,
      });
      if (requestId !== generateRequestIdRef.current) return;
      if(r.success&&r.data) setCurrentPaySlip(r.data);
      else if(r._id)        setCurrentPaySlip(r);
      else                  setError(r.message||'Failed to generate payslip');
      const empName = selectedEmployee
        ? `${selectedEmployee.firstName||""} ${selectedEmployee.middleInitial?selectedEmployee.middleInitial+". ":""}${selectedEmployee.lastName||""}`.trim()
        : 'Employee';
      addActivity({ emp: empName || 'Employee', action: 'Pay Slip Generated', status: 'Done' });
    } catch(e){
      if (requestId !== generateRequestIdRef.current) return;
      if(e.data?._id) setCurrentPaySlip(e.data);
      else setError(e.message||'Failed to generate payslip');
    } finally{
      if(!silent) setLoading(false);
    }
  };

  const formatWorkDaysForTable = () => {
    if(!currentPaySlip?.workDays) return {
      week1DayLabels:[],
      week1Dates:[],
      week1Hours:[],
      week2DayLabels:[],
      week2Dates:[],
      week2Hours:[],
      week3DayLabels:[],
      week3Dates:[],
      week3Hours:[],
      weekSubtotals:["","",""],
      breakdownBlocks:[[],[]],
      totals:["0.00","0.00","0.00"]
    };
    const includedDays = currentPaySlip.workDays
      .filter((day) => {
        if (!day) return false;
        const weekend = day.status === "weekend" || isWeekendDate(day.date);
        if (!weekend) return true;
        return hasWorkedTime(day);
      })
      .sort((a,b)=>new Date(a.date)-new Date(b.date));
    // Build timeframe (limited to 17 days) from the most recent period days
    const days = includedDays.slice(-MAX_TIMEFRAME_DAYS);
    const w1 = days.slice(0,5);
    const w2 = days.slice(5,11);
    const w3 = days.slice(11,17);
    const week1Total = w1.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);
    const week2Total = w2.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);
    const week3Total = w3.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);
    const week1HasWorked = w1.some(hasWorkedTime);
    const week2HasWorked = w2.some(hasWorkedTime);
    const week3HasWorked = w3.some(hasWorkedTime);
    const week1DayLabels = w1.map(d => formatDayShort(d.date));
    const week2DayLabels = w2.map(d => formatDayShort(d.date));
    const week3DayLabels = w3.map(d => formatDayShort(d.date));

    // Build full breakdown from all includedDays (not trimmed)
    const allBreakdownDays = includedDays;
    const mid = Math.ceil(allBreakdownDays.length / 2);
    const break1 = allBreakdownDays.slice(0, mid);
    const break2 = allBreakdownDays.slice(mid);
    const break1Total = break1.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);
    const break2Total = break2.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);
    const grandTotal = allBreakdownDays.reduce((s,d)=>s+getDayRenderedHours(d),0).toFixed(2);

    return {
      week1DayLabels,
      week1Dates: w1.map(d=>new Date(d.date).toLocaleDateString('en-US',{day:'numeric',month:'short', timeZone:'UTC'})),
      week1Hours: w1.map(d=>getDayRenderedHours(d).toFixed(2)),
      week2DayLabels,
      week2Dates: w2.map(d=>new Date(d.date).toLocaleDateString('en-US',{day:'numeric',month:'short', timeZone:'UTC'})),
      week2Hours: w2.map(d=>getDayRenderedHours(d).toFixed(2)),
      week3DayLabels,
      week3Dates: w3.map(d=>new Date(d.date).toLocaleDateString('en-US',{day:'numeric',month:'short', timeZone:'UTC'})),
      week3Hours: w3.map(d=>getDayRenderedHours(d).toFixed(2)),
      weekSubtotals:[week1HasWorked ? week1Total : "", week2HasWorked ? week2Total : "", week3HasWorked ? week3Total : ""],
      breakdownBlocks:[break1, break2],
      totals:[break1Total, break2Total, grandTotal],
    };
  };

  const tableData    = formatWorkDaysForTable();
  const workDaysTotalHours = currentPaySlip?.workDays?.reduce((sum, day) => sum + getDayHours(day), 0) || 0;
  const effectiveHourlyRate = (() => {
    const rate = Number(currentPaySlip?.hourlyRate || 0);
    if (rate > 0) return rate;
    const basic = Number(currentPaySlip?.basicPay || 0);
    if (basic > 0 && workDaysTotalHours > 0) return basic / workDaysTotalHours;
    return 0;
  })();
  const effectiveBasicPay = (() => {
    const basic = Number(currentPaySlip?.basicPay || 0);
    if (basic > 0) return basic;
    if (effectiveHourlyRate > 0 && workDaysTotalHours > 0) return effectiveHourlyRate * workDaysTotalHours;
    return 0;
  })();
  const undertimeDeductRaw = (() => {
    if (currentPaySlip?.deductions?.length) {
      return currentPaySlip.deductions
        .filter(d => d.type === 'undertime')
        .reduce((s, d) => s + Number(d.amount || 0), 0);
    }
    return 0;
  })();
  const undertimeDeduct = isDevMode ? 0 : undertimeDeductRaw;
  const totalAllowances = currentPaySlip?.allowances?.reduce((sum, a) => sum + Number(a.amount || 0), 0) || 0;
  const totalDeductions = currentPaySlip?.deductions?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;
  const adjustedTotalDeductions = totalDeductions - undertimeDeductRaw + undertimeDeduct;
  const effectiveOvertimePay = Number(currentPaySlip?.overtimePay || 0);
  const effectiveGrossPay = effectiveBasicPay + effectiveOvertimePay + totalAllowances;
  const effectiveNetPay = effectiveGrossPay - adjustedTotalDeductions;
  const effectiveNetPayAfterCashAdvance = effectiveNetPay - cashAdvance;
  const employeeName = selectedEmployee
    ? `${selectedEmployee.firstName||""} ${selectedEmployee.middleInitial?selectedEmployee.middleInitial+". ":""}${selectedEmployee.lastName||""}`
    : "Employee";

  const outOfTownTotal = (() => {
    if (currentPaySlip?.allowances?.length) {
      const match = currentPaySlip.allowances.find(a => a.type === 'out_of_town');
      if (match) return Number(match.amount || 0);
    }
    return 0;
  })();

  /* ══════════════════════════════════════════════════════════════════════════
     generatePDF
     ─ Uses jsPDF only.
     ─ Draws every element with the same coordinates / colours / fonts as the
       HTML payslip so the downloaded file is a 1-to-1 text match — fully
       selectable, copyable, and searchable.
  ══════════════════════════════════════════════════════════════════════════ */
  const generatePDF = async () => {
    if(!currentPaySlip){ setError("Please generate a payslip first"); return; }
    try {
      setPdfLoading(true);

      // ── A4 landscape (297 × 210 mm) ──────────────────────────────────────
      const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
      const PW = 297, PH = 210;  // page dims
      const M  = 10;             // left / right margin
      const CW = PW - M*2;      // content width  = 277

      const RED  = [167, 39,  3];
      const NAVY = [ 26, 58,143];   // #1a3a8f (blue used for PAYSLIP title / total hrs)
      const BLK  = [  0,  0,  0];
      const GRY  = [136,136,136];
      const LGY  = [240,240,240];   // light grey bg

      let y = M;

      // ── helper shortcuts ──────────────────────────────────────────────────
      const setColor   = (rgb) => { doc.setTextColor(...rgb); };
      const setFill    = (rgb) => { doc.setFillColor(...rgb); };
      const setDraw    = (rgb) => { doc.setDrawColor(...rgb); };
      const font       = (style="normal", size=8) => { doc.setFont("helvetica",style); doc.setFontSize(size); };
      const text       = (str, x, ty, align="left") => doc.text(String(str||""), x, ty, {align});
      const line       = (x1,y1,x2,y2,w=0.2,rgb=GRY) => {
        setDraw(rgb); doc.setLineWidth(w); doc.line(x1,y1,x2,y2);
      };
      const rect       = (x,rx,rw,rh,fillRgb,strokeRgb=null) => {
        setFill(fillRgb);
        if(strokeRgb){ setDraw(strokeRgb); doc.rect(x,rx,rw,rh,"FD"); }
        else doc.rect(x,rx,rw,rh,"F");
      };

      // ── cell draw helper (table cell with optional bg, borders on bottom) ─
      const cell = (x,cy,w,h,str,opts={}) => {
        const {
          align="center", bold=false, size=6, fg=BLK,
          bg=null, borderB=true, borderR=false, padding=1,
        } = opts;
        if(bg){ rect(x,cy,w,h,bg); }
        if(borderB){ line(x,cy+h,x+w,cy+h,0.15,GRY); }
        if(borderR){ line(x+w,cy,x+w,cy+h,0.15,GRY); }
        font(bold?"bold":"normal",size);
        setColor(fg);
        const tx = align==="center" ? x+w/2 : align==="right" ? x+w-padding : x+padding;
        text(str, tx, cy+h-padding-0.5, align);
      };

      /* ── ① PAYSLIP TITLE ─────────────────────────────────────────────────── */
      font("bold",18);
      setColor(NAVY);
      text("PAYSLIP", PW/2, y+10, "center");
      y += 13;

      /* ── ② NAME OF EMPLOYEE + TIMEFRAME HEADER ──────────────────────────── */
      // NAME OF EMPLOYEE column width
      const LCW = 35;    // left label column width
      const PSUMW= 55;   // pay summary column width
      const TFW  = CW - LCW - PSUMW;  // timeframe grid width

      const lx   = M;           // left col x
      const tfx  = M + LCW;     // timeframe x
      const psx  = M + LCW + TFW; // pay summary x

      const ROW_H = 4.2;

      // NAME OF EMPLOYEE
      font("bold", 7.5);
      setColor(BLK);
      text("NAME OF EMPLOYEE", lx + LCW/2, y+3, "center");

      // Employee name
      font("normal",7);
      setColor(BLK);
      text(employeeName, lx + LCW/2, y+7, "center");

      // Timeframe title + Submitted on (same row)
      font("bold",7.5);
      setColor(BLK);
      text("Timeframe", tfx+1, y+3, "left");

      const submittedLabel = `Submitted on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}`;
      font("bold",7);
      text(submittedLabel, tfx+TFW, y+3, "right");

      // Week label
      font("normal",7);
      setColor(BLK);
      const weekLabel = currentPaySlip
        ? `${MONTHS[currentPaySlip.month]} ${currentPaySlip.year} – ${currentPaySlip.periodLabel}`
        : "N/A";
      text(weekLabel, tfx+1, y+7, "left");

      y += 10;

      /* ── ③ TIMEFRAME TABLE ───────────────────────────────────────────────── */
      // column definitions (matching screen: 13,13,13,11,11,11,5,13 %)
      const COL_PCT   = [0.13,0.13,0.13,0.11,0.11,0.11,0.05,0.13];
      const colWidths = COL_PCT.map(p => p * TFW);
      const WEEK1_DAY_NAMES = buildTFRow(tableData.week1DayLabels, 5);
      const WEEK2_DAY_NAMES = buildTFRow(tableData.week2DayLabels, 6);
      const WEEK3_DAY_NAMES = buildTFRow(tableData.week3DayLabels, 6);

      // Row labels for left column (aligned with each table row)
      const LEFT_LABELS = ["Day","Date","Time Management","Day","Date","Time Management","Day","Date","Time Management","Total hrs"];
      const LEFT_BOLD   = [false,false,true,false,false,true,false,false,true,true];
      const LEFT_BLUE   = [false,false,false,false,false,false,false,false,false,true];

      // Draw each timeframe row
      const tfRows = [
        { cells: WEEK1_DAY_NAMES,         bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week1Dates, 5, "Weekly Total Hours"), bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week1Hours, 5, tableData.weekSubtotals[0]), bold:false, bg:null, fg:BLK },
        { cells: WEEK2_DAY_NAMES,         bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week2Dates, 6, "Weekly Total Hours"), bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week2Hours, 6, tableData.weekSubtotals[1]), bold:false, bg:null, fg:BLK },
        { cells: WEEK3_DAY_NAMES,         bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week3Dates, 6, "Weekly Total Hours"), bold:true,  bg:null,  fg:BLK },
        { cells: buildTFRow(tableData.week3Hours, 6, tableData.weekSubtotals[2]), bold:false, bg:null, fg:BLK },
        { cells: buildTotRow(tableData.totals[2]),    bold:true,  bg:LGY,   fg:NAVY },
      ];

      function buildTFRow(dates, count, tail=""){
        const row = [...dates];
        while (row.length < count) row.push("");
        while (row.length < 7) row.push(""); // ensure index 6 is spacer for alignment
        row.push(tail || "");                // index 7: label or total value
        return row;
      }
      function buildTotRow(grand){
        return ["","","","","","","Grand Total Hours",grand];
      }

      tfRows.forEach((row, ri) => {
        let cx = tfx;
        // left label
        font(LEFT_BOLD[ri]?"bold":"normal", 6.5);
        setColor(LEFT_BLUE[ri]?NAVY:BLK);
        text(LEFT_LABELS[ri], lx + LCW/2, y + ROW_H - 1, "center");
        // timeframe cells
        row.cells.forEach((cellVal,ci)=>{
          const cw = colWidths[ci];
          const isSpacer = ci===6;
          if(!isSpacer){
            const isTotal = ci===7;
            const bg = row.bg ?? null;
            cell(cx, y, cw, ROW_H, cellVal, {
              align:"center",
              bold:row.bold||(isTotal&&ri>=2),
              size:6,
              fg: ri===9 ? NAVY : row.fg,
              bg: bg ? bg : (ri===9?LGY:null),
              borderB:true,
              borderR:ci<7,
            });
          }
          cx += cw;
        });
        line(tfx, y, tfx+TFW, y, 0.1, GRY); // top border
        y += ROW_H;
      });
      // bottom border of table
      line(tfx, y, tfx+TFW, y, 0.2, GRY);

      /* ── ④ PAY SUMMARY (right of timeframe) ─────────────────────────────── */
      const cashAdvDeduct = cashAdvance.toFixed(2);
      const netPayVal = effectiveNetPayAfterCashAdvance;

      const psRows = [
        { label:"Billing Rate (hourly)",   value:`P${effectiveHourlyRate.toFixed(2)}`,              labelRed:false, valueRed:false },
        { label:"Basic Pay",               value:`P${effectiveBasicPay.toFixed(2)}`,                 labelRed:true,  valueRed:false },
        { label:"Undertime Deduction",     value:`P${undertimeDeduct.toFixed(2)}`,                 labelRed:true,  valueRed:true  },
        { label:"Cash Advance Deduction",  value:`P${cashAdvDeduct}`,                              labelRed:true,  valueRed:true  },
        { label:"Total Out of Town",       value:`P${outOfTownTotal.toFixed(2)}`,                  labelRed:false, valueRed:false },
        { label:"Net Pay",                 value:`P${netPayVal.toFixed(2)}`,                       labelRed:false, valueRed:false, netPay:true },
      ];

      const psy0 = y - ROW_H * 10; // align with start of timeframe rows
      let psy    = psy0;
      psRows.forEach((row,ri)=>{
        if(ri===5){ line(psx, psy, psx+PSUMW, psy, 0.3, GRY); psy+=1.5; }
        font(row.labelRed?"bold":"normal", 7);
        setColor(row.labelRed ? RED : BLK);
        text(row.label, psx+1, psy+4.2, "left");
        font("bold", row.netPay?8:7);
        setColor(row.valueRed ? RED : BLK);
        text(row.value, psx+PSUMW-1, psy+4.2, "right");
        psy += 5.8;
      });

      y += 4; // gap after timeframe

      /* ── ⑤ BREAKDOWN LABEL ───────────────────────────────────────────────── */
      line(M, y, M+CW, y, 0.3, GRY);
      y += 3;
      font("bold",7);
      setColor(BLK);
      text("Breakdown", M, y+2.5, "left");
      y += 5;

      /* ── ⑥ BREAKDOWN TABLES ──────────────────────────────────────────────── */
      if(tableData.breakdownBlocks.some(block => block.length > 0)){
        const blocks   = tableData.breakdownBlocks;
        const totals   = [tableData.totals[0], tableData.totals[1]];

        const BD_COLS  = ["Day","Time-In (PST)","Break","Resume","Time-Out (PST)","Total Hours"];
        const BD_PCT   = [0.15,0.20,0.16,0.16,0.20,0.13];
        const bdColW   = BD_PCT.map(p=>p*CW);

        blocks.forEach((block, bi)=>{
          // header row
          let cx = M;
          bdColW.forEach((cw,ci)=>{
            rect(cx, y, cw, 4, [240,240,240]);
            font("bold",5.5);
            setColor(BLK);
            line(cx, y+4, cx+cw, y+4, 0.4, GRY);
            text(BD_COLS[ci], ci===0 ? cx+1 : cx+cw/2, y+3, ci===0?"left":"center");
            cx += cw;
          });
          y += 4;

          // data rows
          block.forEach((day)=>{
            const hasTime = hasWorkedTime(day) && day.status!=="absent";
            const cells = [
              day.dayOfWeek||"",
              hasTime ? formatTime12(day.timeIn)  : "",
              hasTime ? formatTime12(day.breakTime)||"" : "",
              hasTime ? formatTime12(day.resume)||""   : "",
              hasTime ? formatTime12(day.timeOut)||""  : "",
              hasTime ? getDayRenderedHours(day).toFixed(2) : "",
            ];
            cx = M;
            cells.forEach((val,ci)=>{
              font("normal",5.5);
              setColor(BLK);
              line(cx, y+3.8, cx+bdColW[ci], y+3.8, 0.1,[220,220,220]);
              text(val, ci===0 ? cx+1 : cx+bdColW[ci]/2, y+3, ci===0?"left":"center");
              cx += bdColW[ci];
            });
            y += 3.8;
          });

          // Total Hours Spent row
          line(M, y, M+CW, y, 0.3, GRY);
          y += 0.5;
          font("bold",5.5);
          setColor(BLK);
          text("Total Hours Spent", M+CW - bdColW[bdColW.length-1] - 2, y+3, "right");
          text(totals[bi], M+CW, y+3, "right");
          y += 5;
        });
      }

      /* ── ⑦ SIGNATURES ───────────────────────────────────────────────────── */
      y += 4;
      line(M, y, M+CW, y, 0.2, GRY);
      y += 5;
      font("bold",7);
      setColor(BLK);
      text("Prepared By:", M, y, "left");
      font("normal",7);
      const prepName = (preparedBy && preparedBy.trim()) ? preparedBy.trim() : employeeName;
      text(prepName, M+23, y, "left");

      font("bold",7);
      text("Approved By:", M+85, y, "left");
      font("bold",7);
      setColor(BLK);
      // underline Joel V. Agsaoay
      const approvedName = "Joel V. Agsaoay";
      text(approvedName, M+85+23, y, "left");
      const nameW = doc.getTextWidth(approvedName);
      line(M+85+23, y+0.5, M+85+23+nameW, y+0.5, 0.3, BLK);

      y += 5;
      font("normal",6.5);
      setColor(BLK);
      text("President/CEO", M+110, y, "left");

      y += 6;
      font("bold",7);
      text("Received By:", M, y, "left");
      font("normal",7);
      text(employeeName, M+23, y, "left");

      /* ── ⑧ SAVE ─────────────────────────────────────────────────────────── */
      const fileName = currentPaySlip
        ? `PaySlip_${employeeName.replace(/\s+/g,"_")}_${MONTHS[currentPaySlip.month]}_${currentPaySlip.year}.pdf`
        : `PaySlip_${employeeName.replace(/\s+/g,"_")}.pdf`;
      doc.save(fileName);
      if (currentPaySlip?.year !== undefined && currentPaySlip?.month !== undefined) {
        incrementPaySlipDownloadCounter(currentPaySlip.year, currentPaySlip.month);
      }

    } catch(err){
      console.error("PDF error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── screen styles ── */
  const NAVY_CSS = "#132440";
  const RED_CSS  = "#A72703";
  const BLUE_CSS = "#1a3a8f";

  const panelStyle = { width:"220px", flexShrink:0, background:"#fff", borderRadius:"12px", padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.09)", fontFamily:"'DM Sans',sans-serif" };
  const fgStyle    = { display:"flex", flexDirection:"column", gap:"4px", marginBottom:"10px" };
  const lblStyle   = { fontSize:"10px", fontWeight:"700", color:NAVY_CSS, textTransform:"uppercase", letterSpacing:".07em" };
  const selStyle   = { padding:"7px 9px", border:"2px solid #e8dfd6", borderRadius:"7px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:NAVY_CSS, background:"#fff", outline:"none" };
  const btnStyle   = { width:"100%", padding:"10px", background: pdfLoading?"#888": hovPrint?"#8a1f02":RED_CSS, color:"#fff", border:"none", borderRadius:"8px", fontFamily:"'DM Sans',sans-serif", fontSize:"12px", fontWeight:"700", cursor: pdfLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" };
  const tftd       = (extra={}) => ({ border:"none", padding:"0 2px", textAlign:"center", height:"11px", verticalAlign:"middle", fontSize:"6.5pt", fontFamily:"Arial,sans-serif", ...extra });
  const expandEmployeeSelect = (e) => {
    if (employees.length > 8) e.target.size = 8;
  };
  const collapseEmployeeSelect = (e) => {
    e.target.size = 1;
  };
  const handleCashAdvanceChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    if (cashAdvanceLimit !== null && val > cashAdvanceLimit) {
      setShowCALimitModal(true);
      setCashAdvance(cashAdvanceLimit);
      return;
    }
    setCashAdvance(val);
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:"flex", gap:"18px", alignItems:"flex-start", flexWrap:"nowrap", overflowX:"auto" }}>

      {/* ══ CONTROL PANEL ══ */}
      <div className="no-print" style={panelStyle}>
        {loading ? (
          <div style={{padding:"20px"}}>
            <FormShimmer fieldCount={6}/>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"15px", fontWeight:"700", color:NAVY_CSS, marginBottom:"12px", paddingBottom:"6px", borderBottom:`2px solid ${RED_CSS}` }}>
              Generate Pay Slip
            </div>

            {error && <div style={{background:"#fee2e2",color:"#991b1b",padding:"10px",borderRadius:"5px",marginBottom:"10px",fontSize:"12px"}}>{error}</div>}

            <div style={fgStyle}>
              <label style={lblStyle}>Year</label>
              <select style={selStyle} value={year} onChange={e=>setYear(parseInt(e.target.value))}>
                {[2024,2025,2026,2027,2028,2029,2030].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={fgStyle}>
              <label style={lblStyle}>Month</label>
              <select style={selStyle} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div style={fgStyle}>
              <label style={lblStyle}>Employee</label>
              <select
                style={selStyle}
                value={selectedEmployee?._id||""}
                disabled={!employees.length}
                size={1}
                onFocus={expandEmployeeSelect}
                onBlur={collapseEmployeeSelect}
                onChange={e=>{
                  const emp=employees.find(x=>x._id===e.target.value);
                  setSelectedEmployee(emp);
                  resetCashAdvance();
                  collapseEmployeeSelect(e);
                }}
              >
                {employees.map(emp=><option key={emp._id} value={emp._id}>{emp.firstName} {emp.middleInitial?emp.middleInitial+". ":""}{emp.lastName}</option>)}
              </select>
            </div>
            <div style={fgStyle}>
              <label style={lblStyle}>Pay Period</label>
              <select style={selStyle} value={selectedPeriod?.id||""} disabled={!periods.length}
                onChange={e=>{ const p=periods.find(x=>x.id===e.target.value); setSelectedPeriod(p); resetCashAdvance(); }}>
                {periods.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div style={fgStyle}>
              <label style={lblStyle}>Cash Advance</label>
              <input type="number" style={{...selStyle,width:"100%"}} value={cashAdvance}
                onChange={handleCashAdvanceChange} placeholder="0.00" min="0" step="0.01"/>
            </div>
            <div style={fgStyle}>
              <label style={lblStyle}>Prepared By</label>
              <input
                type="text"
                style={{...selStyle,width:"100%"}}
                value={preparedBy}
                onChange={e=>setPreparedBy(e.target.value)}
                placeholder="Type preparer's name"
              />
            </div>

            {currentPaySlip && (
              <div style={{background:"#f9f4ef",borderRadius:"7px",padding:"9px",marginBottom:"10px",fontSize:"11px"}}>
                {[
                  ["Employee", employeeName],
                  ["Rate",     `P${effectiveHourlyRate.toFixed(2)}/hr`],
                  ["Basic Pay",`P${effectiveBasicPay.toFixed(2)}`],
                  ["Cash Adv", `P${cashAdvance.toFixed(2)}`],
                  ["Net Pay",  `P${effectiveNetPayAfterCashAdvance.toFixed(2)}`],
                ].map(([l,v],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                    <span style={{color:"#6b7280"}}>{l}</span>
                    <span style={{fontWeight:"700",color:i===4?RED_CSS:NAVY_CSS}}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <button style={btnStyle} disabled={pdfLoading}
              onMouseEnter={()=>setHovPrint(true)} onMouseLeave={()=>setHovPrint(false)}
              onClick={generatePDF}>
              {pdfLoading ? (
                <>
                  <svg style={{animation:"spin .8s linear infinite"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2a10 10 0 0 1 0 20"/></svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* ══ PAYSLIP DOCUMENT (screen) ══ */}
      <div style={{flex:1,overflowX:"auto",minWidth:0}}>
        {showCALimitModal && (
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}}>
            <div style={{background:"#fff",borderRadius:"14px",padding:"24px",width:"100%",maxWidth:"420px",boxShadow:"0 12px 48px rgba(0,0,0,.22)"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:"18px",fontWeight:700,color:"#132440",marginBottom:"8px"}}>Cash Advance Limit Exceeded</div>
              <div style={{fontSize:"13.5px",color:"#6b7280",lineHeight:1.6,marginBottom:"12px"}}>
                The amount you entered exceeds your cash advance limit.
              </div>
              <div style={{fontSize:"13.5px",color:"#6b7280",lineHeight:1.6,marginBottom:"16px"}}>
                Please enter an amount within your allowed limit of {`₱${Number(cashAdvanceLimit||0).toFixed(2)}`}.
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
                <button onClick={()=>setShowCALimitModal(false)} style={{padding:"9px 16px",borderRadius:"8px",border:"none",background:"#A72703",color:"#fff",fontWeight:700}}>OK</button>
              </div>
            </div>
          </div>
        )}
        {currentPaySlip ? (
          <div ref={psPageRef} className="ps-page" style={{
            width:"1000px",maxWidth:"1000px",minWidth:"1000px",
            background:"#fff",color:"#000",
            fontFamily:"Arial,Helvetica,sans-serif",
            fontSize:"7pt",padding:"16px 22px",
            boxSizing:"border-box",lineHeight:1.3,
            boxShadow:"0 3px 18px rgba(0,0,0,.3)",
          }}>

            <div style={{textAlign:"center",fontFamily:"Arial Black,Arial,sans-serif",fontSize:"16pt",fontWeight:"900",letterSpacing:".08em",margin:"2px 0 3px",color:BLUE_CSS}}>
              PAYSLIP
            </div>

            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"center",gap:0,margin:"4px 0 3px"}}>
              {/* Left labels */}
              <div style={{width:"130px",flexShrink:0,textAlign:"center"}}>
                <div style={{fontSize:"7.5pt",fontWeight:"700",height:"12px",display:"flex",alignItems:"center",justifyContent:"center",margin:0,whiteSpace:"nowrap"}}>NAME OF EMPLOYEE</div>
                <div style={{fontSize:"7pt",height:"12px",display:"flex",alignItems:"center",justifyContent:"center",margin:0}}>{employeeName}</div>
                {[["Day",""],["Date",""],["Time Management","b"],["Day",""],["Date",""],["Time Management","b"],["Day",""],["Date",""],["Time Management","b"],["Total hrs","r"]].map(([lbl,cls],i)=>(
                  <div key={i} style={{height:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:cls==="b"||cls==="r"?"7pt":"6.5pt",fontWeight:cls==="b"||cls==="r"?"700":"400",color:cls==="r"?BLUE_CSS:cls==="b"?"#000":"#555"}}>{lbl}</div>
                ))}
              </div>

              {/* Timeframe grid */}
              <div style={{flex:"0 1 auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",height:"12px",margin:0}}>
                  <div style={{fontSize:"7.5pt",fontWeight:"700"}}>Timeframe</div>
                  <div style={{fontSize:"7pt",fontWeight:"700",whiteSpace:"nowrap"}}>Submitted on {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
                </div>
                <div style={{fontSize:"7pt",height:"12px",display:"flex",alignItems:"center",margin:0}}>
                  {MONTHS[currentPaySlip.month]} {currentPaySlip.year} – {currentPaySlip.periodLabel}
                </div>
                <table style={{borderCollapse:"collapse",width:"100%",fontSize:"6.5pt",tableLayout:"fixed"}}>
                  <colgroup>
                    <col style={{width:"13%"}}/><col style={{width:"13%"}}/><col style={{width:"13%"}}/>
                    <col style={{width:"11%"}}/><col style={{width:"11%"}}/><col style={{width:"11%"}}/>
                    <col style={{width:"5%"}} /><col style={{width:"13%"}}/>
                  </colgroup>
                  <tbody>
                    <tr>{tableData.week1DayLabels.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd()}/><td style={tftd()}/></tr>
                    <tr>{tableData.week1Dates.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd()}/><td style={tftd({fontWeight:"700",color:BLUE_CSS})}>Weekly Total Hours</td></tr>
                    <tr>{tableData.week1Hours.map((h,i)=><td key={i} style={tftd()}>{h}</td>)}<td style={tftd()}/><td style={tftd()}/><td style={tftd({fontWeight:"700"})}>{tableData.weekSubtotals[0]}</td></tr>
                    <tr>{tableData.week2DayLabels.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd()}/></tr>
                    <tr>{tableData.week2Dates.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd({fontWeight:"700",color:BLUE_CSS})}>Weekly Total Hours</td></tr>
                    <tr>{tableData.week2Hours.map((h,i)=><td key={i} style={tftd()}>{h}</td>)}<td style={tftd()}/><td style={tftd({fontWeight:"700"})}>{tableData.weekSubtotals[1]}</td></tr>
                    <tr>{tableData.week3DayLabels.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd()}/></tr>
                    <tr>{tableData.week3Dates.map((d,i)=><td key={i} style={tftd({fontWeight:"700"})}>{d}</td>)}<td style={tftd()}/><td style={tftd({fontWeight:"700",color:BLUE_CSS})}>Weekly Total Hours</td></tr>
                    <tr>{tableData.week3Hours.map((h,i)=><td key={i} style={tftd()}>{h}</td>)}<td style={tftd()}/><td style={tftd({fontWeight:"700"})}>{tableData.weekSubtotals[2]}</td></tr>
                    <tr style={{borderTop:"1.5px solid #000"}}>
                      {["","","","","",""].map((v,i)=><td key={i} style={tftd({color:BLUE_CSS,fontWeight:"700"})}>{v}</td>)}
                      <td style={tftd({color:BLUE_CSS,fontWeight:"700"})}>Grand Total Hours</td>
                      <td style={tftd({color:BLUE_CSS,fontWeight:"900",fontSize:"7.5pt"})}>{tableData.totals[2]}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pay Summary */}
              <div style={{width:"200px",flexShrink:0,paddingLeft:"6px",fontSize:"7pt",paddingTop:"22px"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"7pt",lineHeight:1.5}}>
                  <tbody>
                    <tr><td style={{textAlign:"left",padding:"2px 2px",fontSize:"7pt",whiteSpace:"nowrap"}}>Billing Rate (hourly)</td><td style={{textAlign:"right",padding:"2px 2px",fontWeight:"700",fontSize:"7pt",whiteSpace:"nowrap"}}>P{effectiveHourlyRate.toFixed(2)}</td></tr>
                    <tr><td style={{textAlign:"left",padding:"2px 2px",fontWeight:"700",color:RED_CSS,fontSize:"7pt",whiteSpace:"nowrap"}}>Basic Pay</td><td style={{textAlign:"right",padding:"2px 2px",fontWeight:"700",fontSize:"7pt",whiteSpace:"nowrap"}}>P{effectiveBasicPay.toFixed(2)}</td></tr>
                    <tr><td style={{textAlign:"left",padding:"2px 2px",fontWeight:"700",color:RED_CSS,fontSize:"7pt",whiteSpace:"nowrap"}}>Undertime Deduction</td><td style={{textAlign:"right",padding:"2px 2px",fontWeight:"700",color:RED_CSS,fontSize:"7pt",whiteSpace:"nowrap"}}>P{undertimeDeduct.toFixed(2)}</td></tr>
                    <tr><td style={{textAlign:"left",padding:"2px 2px",fontWeight:"700",color:RED_CSS,fontSize:"7pt",whiteSpace:"nowrap"}}>Cash Advance Deduction</td><td style={{textAlign:"right",padding:"2px 2px",fontWeight:"700",color:RED_CSS,fontSize:"7pt",whiteSpace:"nowrap"}}>P{cashAdvance.toFixed(2)}</td></tr>
                    <tr><td style={{textAlign:"left",padding:"2px 2px",fontSize:"7pt",whiteSpace:"nowrap"}}>Total Out of Town</td><td style={{textAlign:"right",padding:"2px 2px",fontSize:"7pt",whiteSpace:"nowrap"}}>P{outOfTownTotal.toFixed(2)}</td></tr>
                    <tr style={{borderTop:"1px solid #888"}}><td style={{textAlign:"left",padding:"3px 2px 0",fontSize:"8pt",whiteSpace:"nowrap"}}>Net Pay</td><td style={{textAlign:"right",padding:"3px 2px 0",fontWeight:"900",fontSize:"9pt",whiteSpace:"nowrap"}}>P{effectiveNetPayAfterCashAdvance.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{marginTop:"8px",paddingTop:"6px",borderTop:"1px solid #ccc",fontSize:"6pt",fontWeight:"700",marginBottom:"2px"}}>Breakdown</div>
            {currentPaySlip.workDays && (() => {
              return (
                <>
                  <BDTable rows={tableData.breakdownBlocks[0].map(d=>{ const h=hasWorkedTime(d)&&d.status!=="absent"; return {day:d.dayOfWeek,ti:h?formatTime12(d.timeIn):"",brk:h?formatTime12(d.breakTime)||"":"",res:h?formatTime12(d.resume)||"":"",to:h?formatTime12(d.timeOut)||"":"",hrs:h?getDayHours(d).toFixed(2):""}; })} total={tableData.totals[0]}/>
                  <BDTable rows={tableData.breakdownBlocks[1].map(d=>{ const h=hasWorkedTime(d)&&d.status!=="absent"; return {day:d.dayOfWeek,ti:h?formatTime12(d.timeIn):"",brk:h?formatTime12(d.breakTime)||"":"",res:h?formatTime12(d.resume)||"":"",to:h?formatTime12(d.timeOut)||"":"",hrs:h?getDayHours(d).toFixed(2):""}; })} total={tableData.totals[1]}/>
                </>
              );
            })()}

            {/* Signatures */}
            <div style={{marginTop:"12px",fontSize:"7pt"}}>
              <div style={{display:"flex",gap:"50px",marginBottom:"2px"}}>
                <div><strong>Prepared By:</strong>&nbsp;&nbsp;{(preparedBy && preparedBy.trim()) ? preparedBy.trim() : employeeName}</div>
                <div><strong>Approved By:</strong>&nbsp;&nbsp;<u><strong>Joel V. Agsaoay</strong></u></div>
              </div>
              <div style={{marginLeft:"200px",fontSize:"6.5pt",marginBottom:"8px"}}>President/CEO</div>
              <div><strong>Received By:</strong>&nbsp;&nbsp;{employeeName}</div>
            </div>

          </div>
        ) : (
          <div style={{width:"1000px",background:"#fff",padding:"40px",boxShadow:"0 3px 18px rgba(0,0,0,.3)",textAlign:"center",minHeight:"500px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div>
              <div style={{fontSize:"16pt",fontWeight:"bold",marginBottom:"10px",color:NAVY_CSS}}>No Pay Slip Data Available</div>
              <div style={{fontSize:"10pt",color:"#666"}}>Please select an employee and pay period to generate a pay slip.</div>
              {loading && <div style={{marginTop:"20px"}}><ShimmerLoader type="card" height="100px"/></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
