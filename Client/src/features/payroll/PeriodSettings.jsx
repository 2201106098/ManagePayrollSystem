import { useState, useMemo, useEffect } from "react";
import periodSettingsAPI from "../../api/periodSettings.api";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import { CardShimmer, FormShimmer } from "../../components/ui/ShimmerLoader";
import { addActivity } from "../../utils/activityLog";

/* ── constants ── */
const RED   = "#A72703";
const REDDK = "#8a1f02";
const NAVY  = "#132440";
const WHITE = "#FFFFFF";
const BORDER = "#e5e7eb";
const GOLD  = "#FFE797";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const PS_CACHE_KEY = "periodSettingsCache";
const cacheKey = (y,m) => `${y}-${m}`;
const loadCachedPeriods = (y,m) => {
  try {
    const raw = localStorage.getItem(PS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data[cacheKey(y,m)] || null;
  } catch { return null; }
};
const saveCachedPeriods = (y,m,periods) => {
  try {
    const raw = localStorage.getItem(PS_CACHE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[cacheKey(y,m)] = periods;
    localStorage.setItem(PS_CACHE_KEY, JSON.stringify(data));
  } catch {}
};

/* ── helpers ── */
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const dayOfWeek   = (y, m, d) => new Date(y, m, d).toLocaleDateString("en-US", { weekday: "short" });
const fmtDate     = (y, m, d) => `${MONTHS[m]} ${d}, ${y}`;

const toOrdinal = (n) => {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/* ── icons ── */
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconMoney = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconInfo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

/* ── default periods ── */
const DEFAULT_PERIODS = [
  {
    id: "P1",
    label: "First Half",
    startDay: 1,
    endDay: 15,
    payday: 15,
    color: RED,
  },
  {
    id: "P2",
    label: "Second Half",
    startDay: 16,
    endDay: 0,
    payday: 0,
    color: NAVY,
  },
];

export default function PeriodSettings() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [periods,  setPeriods]  = useState(DEFAULT_PERIODS);
  const [editing,  setEditing]  = useState(null);   // period id being edited
  const [form,     setForm]     = useState({});
  const [saved,    setSaved]    = useState(false);
  const [hovBtn,   setHovBtn]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error,    setError]    = useState(null);

  const dim = daysInMonth(year, month);  // days in selected month

  /* build day options */
  const dayOpts = Array.from({ length: dim }, (_, i) => i + 1);

  /* open edit modal */
  const openEdit = (p) => {
    setForm({
      label:        p.label,
      startDay:     p.startDay,
      endDay:       p.endDay === 0 ? dim : p.endDay,
      payday:       p.endDay === 0 ? dim : p.endDay,
      payNextMonth: !!p.payNextMonth,
    });
    setEditing(p.id);
    setSaved(false);
  };

  const closeEdit = () => { setEditing(null); setForm({}); };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const updated = periods.map(p =>
        p.id === editing
          ? {
              ...p,
              label:        form.label,
              startDay:     Number(form.startDay),
              endDay:       Number(form.endDay) === dim ? 0 : Number(form.endDay),
              payday:       Number(form.endDay) === dim ? 0 : Number(form.endDay),
              payNextMonth: !!form.payNextMonth,
            }
          : p
      );
      setPeriods(updated);
      saveCachedPeriods(year, month, updated);
      setSaved(true);
      const dataToSave = {
        year,
        month,
        periods: updated
      };
      await periodSettingsAPI.savePeriodSettings(dataToSave);
      try{
        addActivity({ emp: 'System', action: 'Period Settings Updated', status: 'Done' });
      }catch{}
      setTimeout(() => { closeEdit(); setSaved(false); }, 900);
    } catch (err) {
      setError(err.message || 'Failed to save period settings');
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  /* compute effective endDay for display */
  const effectiveEnd = (p) => p.endDay === 0 ? dim : p.endDay;

  /* working days count (Mon–Fri only) */
  const workingDays = (start, end) => {
    let count = 0;
    for (let d = start; d <= end; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  };

  /* ── API FUNCTIONS ── */
  // Fetch period settings from backend
  const fetchPeriodSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await periodSettingsAPI.getPeriodSettings(year, month);
      
      if (response.success && response.data) {
        const settingsData = response.data;
        const fromApi =
          settingsData.periods
            ? settingsData.periods
            : settingsData.data && settingsData.data.periods
              ? settingsData.data.periods
              : null;
        if (Array.isArray(fromApi) && fromApi.length) {
          setPeriods(fromApi);
          saveCachedPeriods(year, month, fromApi);
        } else {
          const cached = loadCachedPeriods(year, month);
          if (cached) setPeriods(cached);
        }
      } else {
        const cached = loadCachedPeriods(year, month);
        if (cached) setPeriods(cached);
      }
    } catch (err) {
      console.error('Error fetching period settings:', err);
      setError(err.message || 'Failed to fetch period settings');
      const cached = loadCachedPeriods(year, month);
      if (cached) setPeriods(cached);
    } finally {
      setLoading(false);
    }
  };

  // Save period settings to backend
  const saveToBackend = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dataToSave = {
        year,
        month,
        periods: periods.map(p => ({
          ...p,
          payNextMonth: p.payNextMonth || false
        }))
      };
      
      const response = await periodSettingsAPI.savePeriodSettings(dataToSave);
      
      if (response.success) {
        // Show success feedback
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        try{
          addActivity({ emp: 'System', action: 'Period Settings Updated', status: 'Done' });
        }catch{}
      }
    } catch (err) {
      console.error('Error saving period settings:', err);
      setError(err.message || 'Failed to save period settings');
    } finally {
      setLoading(false);
    }
  };

  // Load settings when year/month changes
  useEffect(() => {
    fetchPeriodSettings();
  }, [year, month]);

  /* calendar strip for a period */
  const CalendarStrip = ({ period }) => {
    const start = period.startDay;
    const end   = effectiveEnd(period);
    const cells = [];
    for (let d = start; d <= end; d++) {
      const dow   = new Date(year, month, d).getDay();
      const isWE  = dow === 0 || dow === 6;
      const isPay = d === end; // Payday is always the period end day
      cells.push({ d, isWE, isPay, dow });
    }
    
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "10px" }}>
        {cells.map(({ d, isWE, isPay }) => (
          <div key={d} style={{
            width: "30px", height: "30px",
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column",
            fontSize: "11px", fontWeight: "600",
            background: isPay ? GOLD : isWE ? "#f3f4f6" : `${period.color}18`,
            color: isPay ? "#7a5c00" : isWE ? "#9ca3af" : period.color,
            border: isPay ? `1.5px solid #e6c200` : `1px solid ${isWE ? "#e5e7eb" : `${period.color}30`}`,
            position: "relative",
          }}>
            {d}
            {isPay && (
              <div style={{
                position: "absolute", top: "-6px", right: "-6px",
                width: "12px", height: "12px", borderRadius: "50%",
                background: "#10b981", border: "1.5px solid white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /* ── styles ── */
  const s = {
    wrap: { width: "100%", fontFamily: "'DM Sans', sans-serif" },

    pageHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      flexWrap: "wrap",
      gap: "12px",
    },
    pageTitleWrap: {},
    pageTitle: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "22px",
      fontWeight: "700",
      color: NAVY,
    },
    pageSub: {
      fontSize: "13px",
      color: "#6b7280",
      marginTop: "3px",
    },

    /* month/year selector */
    monthYearRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    selectBase: {
      padding: "8px 14px",
      border: `1.5px solid ${BORDER}`,
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      color: NAVY,
      background: WHITE,
      outline: "none",
      cursor: "pointer",
    },

    /* info banner */
    infoBanner: {
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: "10px",
      padding: "14px 16px",
      marginBottom: "22px",
      fontSize: "13px",
      color: "#1e40af",
      lineHeight: 1.6,
    },

    /* period cards grid */
    cardsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "16px",
      marginBottom: "28px",
    },

    periodCard: (color) => ({
      background: WHITE,
      borderRadius: "14px",
      overflow: "hidden",
      border: `1px solid ${BORDER}`,
      boxShadow: "0 2px 10px rgba(0,0,0,.07)",
    }),

    cardHeader: (color) => ({
      background: color,
      padding: "12px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    cardHeaderLeft: {},
    cardLabel: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "17px",
      fontWeight: "700",
      color: WHITE,
    },
    cardRange: {
      fontSize: "12px",
      color: "rgba(255,255,255,.75)",
      marginTop: "3px",
    },
    editCardBtn: (color) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "6px 14px",
      borderRadius: "20px",
      border: "1.5px solid rgba(255,255,255,.5)",
      background: "rgba(255,255,255,.15)",
      color: WHITE,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "12.5px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "background .18s",
    }),

    cardBody: {
      padding: "14px 16px",
    },

    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 0",
      borderBottom: `1px solid #f3f4f6`,
      fontSize: "13.5px",
    },
    detailLabel: {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      color: "#6b7280",
      fontWeight: "500",
    },
    detailValue: {
      fontWeight: "700",
      color: NAVY,
    },
    detailValueHighlight: (color) => ({
      fontWeight: "700",
      color: color,
      fontFamily: "'Playfair Display', serif",
      fontSize: "15px",
    }),

    workingDaysBadge: (color) => ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "10px",
      background: `${color}18`,
      color: color,
      fontSize: "13px",
      fontWeight: "700",
    }),

    calLabel: {
      fontSize: "11.5px",
      fontWeight: "600",
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: ".08em",
      marginTop: "16px",
      marginBottom: "2px",
    },

    legend: {
      display: "flex",
      gap: "14px",
      marginTop: "12px",
      flexWrap: "wrap",
    },
    legendItem: {
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "11.5px",
      color: "#6b7280",
    },
    legendDot: (bg, border) => ({
      width: "12px", height: "12px",
      borderRadius: "3px",
      background: bg,
      border: `1px solid ${border}`,
    }),

    /* summary table */
    summaryWrap: {
      background: WHITE,
      borderRadius: "14px",
      overflow: "hidden",
      border: `1px solid ${BORDER}`,
      boxShadow: "0 2px 10px rgba(0,0,0,.07)",
      marginBottom: "28px",
    },
    summaryHead: {
      padding: "16px 20px",
      background: NAVY,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryTitle: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "16px",
      fontWeight: "700",
      color: WHITE,
    },
    summaryTable: { width: "100%", borderCollapse: "collapse" },
    summaryTh: {
      padding: "11px 16px",
      textAlign: "left",
      fontSize: "11px",
      fontWeight: "700",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: ".07em",
      borderBottom: `1px solid ${BORDER}`,
      background: "#f9fafb",
    },
    summaryTd: {
      padding: "13px 16px",
      fontSize: "13.5px",
      color: NAVY,
      borderBottom: `1px solid #f3f4f6`,
    },

    /* modal */
    overlay: {
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: WHITE, borderRadius: "16px", padding: "0",
      width: "90%", maxWidth: "520px",
      boxShadow: "0 16px 56px rgba(0,0,0,.25)",
      overflow: "hidden",
    },
    modalTop: (color) => ({
      background: color,
      padding: "20px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    modalTitle: {
      fontFamily: "'Playfair Display', serif",
      fontSize: "18px",
      fontWeight: "700",
      color: WHITE,
    },
    modalSub: {
      fontSize: "12px",
      color: "rgba(255,255,255,.7)",
      marginTop: "2px",
    },
    closeBtn: {
      background: "rgba(255,255,255,.2)",
      border: "none",
      borderRadius: "50%",
      width: "30px", height: "30px",
      fontSize: "18px",
      cursor: "pointer",
      color: WHITE,
      display: "flex", alignItems: "center", justifyContent: "center",
      lineHeight: 1,
    },
    modalBody: { padding: "24px" },
    sectionTitle: {
      fontSize: "11px",
      fontWeight: "700",
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginBottom: "12px",
      marginTop: "20px",
    },
    formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
    fg: { display: "flex", flexDirection: "column", gap: "5px" },
    flabel: {
      fontSize: "11px", fontWeight: "600", color: NAVY,
      textTransform: "uppercase", letterSpacing: ".07em",
    },
    fselect: {
      padding: "9px 12px",
      border: "2px solid #e8dfd6",
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      color: NAVY,
      background: WHITE,
      outline: "none",
      cursor: "pointer",
    },
    finput: {
      padding: "9px 12px",
      border: "2px solid #e8dfd6",
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      color: NAVY,
      background: WHITE,
      outline: "none",
    },
    checkRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 14px",
      background: "#f9f4ef",
      borderRadius: "8px",
      marginTop: "14px",
      cursor: "pointer",
    },
    checkBox: (checked) => ({
      width: "18px", height: "18px",
      borderRadius: "5px",
      border: `2px solid ${checked ? RED : "#d1d5db"}`,
      background: checked ? RED : WHITE,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      transition: "all .18s",
    }),
    previewBox: {
      background: "#f9f4ef",
      borderRadius: "10px",
      padding: "14px 16px",
      marginTop: "16px",
      fontSize: "13px",
      color: "#6b7280",
      lineHeight: 1.8,
    },
    previewLine: (color) => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    previewKey: { color: "#9ca3af", fontSize: "12px", fontWeight: "500" },
    previewVal: (color) => ({ fontWeight: "700", color: color || NAVY, fontSize: "13.5px" }),
    modalActions: {
      display: "flex", gap: "10px",
      justifyContent: "flex-end",
      padding: "0 24px 24px",
    },
    cancelBtn: {
      padding: "10px 22px", borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", fontWeight: "600",
      cursor: "pointer", border: `2px solid ${BORDER}`, background: WHITE, color: NAVY,
    },
    saveBtn: (color) => ({
      padding: "10px 22px", borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", fontWeight: "600",
      cursor: "pointer", border: "none",
      background: saved ? "#10b981" : color,
      color: WHITE,
      display: "inline-flex", alignItems: "center", gap: "6px",
      transition: "background .2s",
    }),
  };

  const editingPeriod = periods.find(p => p.id === editing);

  return (
    <div style={s.wrap}>

      {/* ── PAGE HEADER ── */}
      <div style={s.pageHead}>
        <div style={s.pageTitleWrap}>
          <div style={s.pageTitle}>Period Settings</div>
          <div style={s.pageSub}>Configure your 15-day work periods and paydays</div>
        </div>
        {/* Month / Year selector */}
        <div style={s.monthYearRow}>
          <select
            style={s.selectBase}
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            style={s.selectBase}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {[2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

    

      {/* ── PERIOD CARDS ── */}
      <div style={s.cardsGrid}>
        {periods.map(p => {
          const start = p.startDay;
          const end   = effectiveEnd(p);
          const wd    = workingDays(start, end);
          const paydayDisplay = p.payday === 0 ? effectiveEnd(p) : p.payday;
          const payMonthLabel = p.payNextMonth
            ? `${MONTHS[(month + 1) % 12]} ${paydayDisplay}, ${month === 11 ? year + 1 : year}`
            : `${MONTHS[month]} ${paydayDisplay}, ${year}`;

          return (
            <div key={p.id} style={s.periodCard(p.color)}>
              {/* header */}
              <div style={s.cardHeader(p.color)}>
                <div style={s.cardHeaderLeft}>
                  <div style={s.cardLabel}>{p.label}</div>
                  <div style={s.cardRange}>
                    {fmtDate(year, month, start)} — {fmtDate(year, month, end)}
                  </div>
                </div>
                <button
                  style={s.editCardBtn(p.color)}
                  onClick={() => openEdit(p)}
                >
                  <IconEdit /> Edit
                </button>
              </div>

              {/* body */}
              <div style={s.cardBody}>
                {/* detail rows */}
                <div style={s.detailRow}>
                  <span style={s.detailLabel}><IconClock /> Period Start</span>
                  <span style={s.detailValue}>
                    {toOrdinal(start)} — {dayOfWeek(year, month, start)}, {fmtDate(year, month, start)}
                  </span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}><IconClock /> Period End</span>
                  <span style={s.detailValue}>
                    {toOrdinal(end)} — {dayOfWeek(year, month, end)}, {fmtDate(year, month, end)}
                  </span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Working Days
                  </span>
                  <span style={s.workingDaysBadge(p.color)}>{wd} days</span>
                </div>
                <div style={{ ...s.detailRow, borderBottom: "none" }}>
                  <span style={s.detailLabel}><IconMoney /> Payday</span>
                  <span style={s.detailValueHighlight(p.color)}>
                    {payMonthLabel}
                    {p.payNextMonth && <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'DM Sans',sans-serif", fontWeight: "500", marginLeft: "4px" }}>(next month)</span>}
                  </span>
                </div>

                {/* calendar strip */}
                <div style={s.calLabel}>Calendar View</div>
                <CalendarStrip period={p} />

                {/* legend */}
                <div style={s.legend}>
                  <div style={s.legendItem}>
                    <div style={s.legendDot(`${p.color}18`, `${p.color}30`)} />
                    Working day
                  </div>
                  <div style={s.legendItem}>
                    <div style={s.legendDot("#f3f4f6", "#e5e7eb")} />
                    Weekend
                  </div>
                  <div style={s.legendItem}>
                    <div style={s.legendDot(GOLD, "#e6c200")} />
                    Payday
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SUMMARY TABLE ── */}
      <div style={s.summaryWrap}>
        <div style={s.summaryHead}>
          <div style={s.summaryTitle}>
            {MONTHS[month]} {year} — Period Summary
          </div>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,.65)" }}>
            {daysInMonth(year, month)} total days in month
          </span>
        </div>
        <table style={s.summaryTable}>
          <thead>
            <tr>
              {["Period","Start","End","Working Days","Payday","Days Until Payday"].map(h => (
                <th key={h} style={s.summaryTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => {
              const start  = p.startDay;
              const end    = effectiveEnd(p);
              const wd     = workingDays(start, end);
              const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();
              const paydayDisplay = p.payday === 0 ? effectiveEnd(p) : p.payday;
              let payDate;
              if (p.payNextMonth) {
                const nm = month + 1 > 11 ? 0 : month + 1;
                const ny = month + 1 > 11 ? year + 1 : year;
                payDate = new Date(ny, nm, paydayDisplay);
              } else {
                payDate = new Date(year, month, paydayDisplay);
              }
              const nowDate = new Date(todayY, todayM, todayD);
              const diff    = Math.ceil((payDate - nowDate) / (1000 * 60 * 60 * 24));
              const diffTxt = diff < 0 ? "Passed" : diff === 0 ? "Today!" : `${diff} day${diff !== 1 ? "s" : ""}`;
              const diffColor = diff < 0 ? "#9ca3af" : diff === 0 ? "#10b981" : diff <= 5 ? RED : NAVY;

              return (
                <tr key={p.id}>
                  <td style={s.summaryTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: "600" }}>{p.label}</span>
                    </div>
                  </td>
                  <td style={s.summaryTd}>{toOrdinal(start)} ({dayOfWeek(year, month, start)})</td>
                  <td style={s.summaryTd}>{toOrdinal(end)} ({dayOfWeek(year, month, end)})</td>
                  <td style={{ ...s.summaryTd, fontWeight: "700", color: p.color }}>{wd} days</td>
                  <td style={s.summaryTd}>
                    <span style={{ fontWeight: "700", color: p.color }}>
                      {payDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {p.payNextMonth && <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "4px" }}>next mo.</span>}
                  </td>
                  <td style={{ ...s.summaryTd, fontWeight: "700", color: diffColor }}>{diffTxt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── EDIT MODAL ── */}
      {editing && editingPeriod && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div style={s.modal}>
            {/* modal header */}
            <div style={s.modalTop(editingPeriod.color)}>
              <div>
                <div style={s.modalTitle}>Edit {editingPeriod.label}</div>
                <div style={s.modalSub}>{MONTHS[month]} {year}</div>
              </div>
              <button style={s.closeBtn} onClick={closeEdit}>×</button>
            </div>

            <div style={s.modalBody}>
              {/* period name */}
              <div style={{ ...s.sectionTitle, marginTop: 0 }}>Period Label</div>
              <div style={s.fg}>
                <label style={s.flabel}>Label</label>
                <input
                  style={s.finput}
                  type="text"
                  value={form.label || ""}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. First Half"
                />
              </div>

              {/* work period */}
              <div style={s.sectionTitle}>Work Period</div>
              <div style={s.formGrid2}>
                <div style={s.fg}>
                  <label style={s.flabel}>Start Day</label>
                  <select
                    style={s.fselect}
                    value={form.startDay || 1}
                    onChange={e => setForm(p => ({ ...p, startDay: Number(e.target.value) }))}
                  >
                    {dayOpts.map(d => (
                      <option key={d} value={d}>
                        {toOrdinal(d)} — {dayOfWeek(year, month, d)}, {fmtDate(year, month, d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>End Day</label>
                  <select
                    style={s.fselect}
                    value={form.endDay || dim}
                    onChange={e => setForm(p => ({ ...p, endDay: Number(e.target.value) }))}
                  >
                    {dayOpts.filter(d => d >= (form.startDay || 1)).map(d => (
                      <option key={d} value={d}>
                        {toOrdinal(d)} — {dayOfWeek(year, month, d)}, {fmtDate(year, month, d)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* payday */}
              <div style={s.sectionTitle}>Payday</div>
              <div style={s.formGrid2}>
                <div style={s.fg}>
                  <label style={s.flabel}>Payday (Day of Month)</label>
                  <select
                    style={s.fselect}
                    value={form.payday || 1}
                    onChange={e => setForm(p => ({ ...p, payday: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{toOrdinal(d)}</option>
                    ))}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Working Days</label>
                  <div style={{
                    padding: "9px 12px", borderRadius: "8px",
                    background: `${editingPeriod.color}10`,
                    border: `2px solid ${editingPeriod.color}30`,
                    fontFamily: "'Playfair Display',serif",
                    fontSize: "18px", fontWeight: "700",
                    color: editingPeriod.color,
                  }}>
                    {workingDays(form.startDay || 1, form.endDay || dim)} days
                  </div>
                </div>
              </div>

              {/* pay next month toggle */}
              <div
                style={s.checkRow}
                onClick={() => setForm(p => ({ ...p, payNextMonth: !p.payNextMonth }))}
              >
                <div style={s.checkBox(form.payNextMonth)}>
                  {form.payNextMonth && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={WHITE} strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "600", color: NAVY }}>Payday schedule repeats the following month</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "1px" }}>
                    e.g. Second half will be paid on the 15th next month as well
                  </div>
                </div>
              </div>

              {/* preview box */}
              <div style={s.previewBox}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>Preview</div>
                {[
                  ["Period", `${fmtDate(year, month, form.startDay || 1)} → ${fmtDate(year, month, form.endDay || dim)}`],
                  ["Working Days", `${workingDays(form.startDay || 1, form.endDay || dim)} days (Mon–Fri only)`],
                  ["Payday", (() => {
                    if (form.payNextMonth) {
                      const nm = month + 1 > 11 ? 0 : month + 1;
                      const ny = month + 1 > 11 ? year + 1 : year;
                      return `${toOrdinal(form.payday || 1)} of ${MONTHS[nm]} ${ny}`;
                    }
                    return `${toOrdinal(form.payday || 1)} of ${MONTHS[month]} ${year}`;
                  })()],
                ].map(([k, v]) => (
                  <div key={k} style={s.previewLine()}>
                    <span style={s.previewKey}>{k}</span>
                    <span style={s.previewVal(editingPeriod.color)}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* actions */}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={closeEdit}>Cancel</button>
              <button 
                style={{
                  ...s.saveBtn(editingPeriod.color),
                  background: isSaving ? '#ccc' : (saved ? "#10b981" : editingPeriod.color),
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }} 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    Saving...
                  </>
                ) : saved ? (
                  <><IconCheck /> Saved!</>
                ) : (
                  "Save Period"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
