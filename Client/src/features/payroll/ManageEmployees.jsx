import { useState, useMemo, useEffect } from "react";
import { employeeAPI } from "../../api/employee.api";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import { TableShimmer, CardShimmer } from "../../components/ui/ShimmerLoader";
import { addActivity } from "../../utils/activityLog";

/* ── icons (inline SVG, no external deps) ── */
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconPlusBootstrap = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="#610000">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
  </svg>
);
const IconCelebration = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="#610000">
    <path d="M7 11l-3 2 3-2zm10 0l3 2-3-2zm-5-9l1 4-1-4zm0 18l1-4-1 4zM4.22 4.22l2.83 2.83-2.83-2.83zm12.73 12.73l2.83 2.83-2.83-2.83zm0-12.73l2.83 2.83-2.83-2.83zM4.22 16.95l2.83-2.83-2.83 2.83zM12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/>
    <path d="M9 12l2 2 4-4" stroke="#FFFFFF" strokeWidth="2" fill="none"/>
  </svg>
);
const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconArchiveFilled = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#610000" stroke="#610000" strokeWidth="0">
    <polyline points="21 8 21 21 3 21 3 8" fill="#610000"/>
    <rect x="1" y="3" width="22" height="5" fill="#610000"/>
    <line x1="10" y1="12" x2="14" y2="12" stroke="#FFFFFF" strokeWidth="2"/>
  </svg>
);

const IconArchive = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#610000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconInboxes = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="#610000">
    <path d="M4.5 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-7zm0 4a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V7.5a.5.5 0 0 0-.5-.5h-1zm6 0a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V7.5a.5.5 0 0 0-.5-.5h-1zm-6 4a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-7z"/>
  </svg>
);
const IconChevLeft  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IconChevRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>;

/* ── colours ── */
const RED    = "#610000";
const REDDK  = "#8a1f02";
const NAVY   = "#132440";
const WHITE  = "#FFFFFF";
const BG     = "#f4ede6";
const BORDER = "#e5e7eb";

const PER_PAGE = 10;

const EMPTY_FORM = {
  firstName: "", lastName: "", middleInitial: "",
  designation: "", email: "", idNumber: "",
};

const INITIAL_EMPLOYEES = [
  { id: "EMP-001", name: "Alvina S. Cudo",  email: "alvina@datalogix.com.ph",  designation: "Developer",    idNumber: "223232323", archived: false },
  { id: "EMP-002", name: "Maria Santos",    email: "jorell@gmail.com",          designation: "Cashier",      idNumber: "32334344",  archived: false },
  { id: "EMP-003", name: "Juan dela Cruz",  email: "juan@datalogix.com.ph",     designation: "Supervisor",   idNumber: "44512312",  archived: false },
  { id: "EMP-004", name: "Ana Reyes",       email: "ana@datalogix.com.ph",      designation: "Accountant",   idNumber: "55671234",  archived: false },
  { id: "EMP-005", name: "Carlos Gomez",    email: "carlos@datalogix.com.ph",   designation: "IT Specialist",idNumber: "66789012",  archived: false },
  { id: "EMP-006", name: "Liza Mendoza",    email: "liza@datalogix.com.ph",     designation: "HR Officer",   idNumber: "77890123",  archived: true  },
  { id: "EMP-007", name: "Mark Johnson",    email: "mark@datalogix.com.ph",     designation: "Developer",    idNumber: "88901234",  archived: false },
  { id: "EMP-008", name: "Sarah Lee",       email: "sarah@datalogix.com.ph",    designation: "Designer",     idNumber: "99012345",  archived: false },
  { id: "EMP-009", name: "David Kim",       email: "david@datalogix.com.ph",     designation: "Analyst",      idNumber: "10123456",  archived: false },
  { id: "EMP-010", name: "Emily Chen",      email: "emily@datalogix.com.ph",    designation: "Manager",      idNumber: "11234567",  archived: false },
  { id: "EMP-011", name: "Robert Wilson",   email: "robert@datalogix.com.ph",   designation: "Developer",    idNumber: "12345678",  archived: false },
  { id: "EMP-012", name: "Lisa Anderson",   email: "lisa@datalogix.com.ph",     designation: "Accountant",   idNumber: "13456789",  archived: false },
  { id: "EMP-013", name: "James Taylor",    email: "james@datalogix.com.ph",    designation: "Sales Rep",    idNumber: "14567890",  archived: false },
  { id: "EMP-014", name: "Patricia Brown",  email: "patricia@datalogix.com.ph", designation: "Marketing",    idNumber: "15678901",  archived: false },
  { id: "EMP-015", name: "Michael Davis",   email: "michael@datalogix.com.ph",  designation: "Developer",    idNumber: "16789012",  archived: false },
];

export default function ManageEmployees() {
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingId, setEditingId]   = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit: PER_PAGE,
        search,
        showArchived,
        status: 'active'
      };
      
      const response = await employeeAPI.getAllEmployees(params);
      setEmployees(response.data.employees);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Load employees on component mount and when filters change
  useEffect(() => {
    fetchEmployees();
  }, [page, search, showArchived]);

  /* paginated list - filtering is now done on backend */
  const totalPages = pagination.pages || 1;
  const safePage   = Math.min(page, totalPages);
  const pageRows   = employees;

  /* helpers */
  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = emp => {
    setForm({
      firstName:     emp.firstName || "",
      middleInitial: emp.middleInitial || "",
      lastName:      emp.lastName || "",
      designation:   emp.designation || "",
      email:         emp.email || "",
      idNumber:      emp.idNumber || "",
    });
    setEditingId(emp._id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleArchive = async (emp) => {
    try {
      await employeeAPI.archiveEmployee(emp._id);
      fetchEmployees();
      const fullName = emp.name || `${emp.firstName || ""} ${emp.middleInitial ? emp.middleInitial + '. ' : ''}${emp.lastName || ""}`.trim();
      addActivity({
        emp: fullName || 'Employee',
        action: emp.isArchived ? 'Employee Unarchived' : 'Employee Archived',
        status: 'Done'
      });
    } catch (err) {
      console.error('Error archiving employee:', err);
      setError(err.response?.data?.message || 'Failed to archive employee');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError("");
      
      if (editingId) {
        await employeeAPI.updateEmployee(editingId, form);
        const fullName = `${form.firstName} ${form.middleInitial ? form.middleInitial + '. ' : ''}${form.lastName}`.trim();
        addActivity({ emp: fullName || 'Employee', action: 'Employee Updated', status: 'Done' });
      } else {
        await employeeAPI.createEmployee(form);
        const fullName = `${form.firstName} ${form.middleInitial ? form.middleInitial + '. ' : ''}${form.lastName}`.trim();
        addActivity({ emp: fullName || 'Employee', action: 'Employee Added', status: 'Done' });
        setShowSuccessModal(true);
      }
      
      closeModal();
      fetchEmployees(); // Refresh the list
      setPage(1);
    } catch (err) {
      console.error('Error saving employee:', err);
      const msg = err?.response?.data?.message || '';
      if (/validation failed/i.test(msg)) {
        if (!form.email || String(form.email).trim() === '') {
          setError('Please fill this out');
        } else {
          setError('Validation failed: ensure all required fields are filled and the email is a valid address.');
        }
      } else {
        setError(msg || 'Failed to save employee');
      }
    } finally {
      setIsSaving(false);
    }
  };

  /* ── styles ── */
  const s = {
    wrap: {
      width: "100%",
      fontFamily: "'DM Sans', sans-serif",
    },
    topRow: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "20px",
    },
    addBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "11px 22px",
      background: hoveredBtn === "add" ? REDDK : RED,
      color: WHITE,
      border: "none",
      borderRadius: "50px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "background .2s",
      boxShadow: "0 2px 8px rgba(167,39,3,.25)",
    },
    subRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
      gap: "12px",
    },
    listTitle: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "15px",
      fontWeight: "700",
      color: NAVY,
      textTransform: "uppercase",
      letterSpacing: ".1em",
    },
    subRight: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    archivedBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 14px",
      background: !showArchived ? "#fef2f2" : WHITE,
      color: RED,
      border: `1px solid ${RED}`,
      borderRadius: "20px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "12.5px",
      fontWeight: "600",
      cursor: "pointer",
    },
    searchWrap: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    searchIcon: {
      position: "absolute",
      left: "10px",
      display: "flex",
      alignItems: "center",
      pointerEvents: "none",
    },
    searchInput: {
      padding: "8px 12px 8px 34px",
      border: `1px solid ${BORDER}`,
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      color: NAVY,
      background: WHITE,
      outline: "none",
      width: "220px",
    },
    tableWrap: {
      background: WHITE,
      borderRadius: "12px",
      overflow: "hidden",
      border: `1px solid ${BORDER}`,
      boxShadow: "0 1px 4px rgba(0,0,0,.07)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "13px 16px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "700",
      color: WHITE,
      textTransform: "uppercase",
      letterSpacing: ".07em",
      background: RED,
      whiteSpace: "nowrap",
    },
    thCenter: {
      padding: "13px 16px",
      textAlign: "center",
      fontSize: "12px",
      fontWeight: "700",
      color: WHITE,
      textTransform: "uppercase",
      letterSpacing: ".07em",
      background: RED,
    },
    td: (rowId) => ({
      padding: "14px 16px",
      fontSize: "13.5px",
      color: "#111827",
      borderBottom: `1px solid ${BORDER}`,
      background: hoveredRow === rowId ? "#fdf8f4" : WHITE,
      transition: "background .14s",
    }),
    tdCenter: (rowId) => ({
      padding: "14px 16px",
      fontSize: "13.5px",
      color: "#111827",
      borderBottom: `1px solid ${BORDER}`,
      background: hoveredRow === rowId ? "#fdf8f4" : WHITE,
      textAlign: "center",
    }),
    actionBtn: (key, hoverColor) => ({
      background: "none",
      border: "none",
      color: "#610000",
      fontSize: "16px",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "6px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    foot: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 16px 4px",
    },
    showingTxt: {
      fontSize: "13px",
      color: "#6b7280",
    },
    pagination: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      padding: "16px 0 4px",
    },
    pageBtn: (active, key) => ({
      width: "34px",
      height: "34px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",
      border: "none",
      background: active ? RED : "transparent",
      color: active ? WHITE : NAVY,
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      fontWeight: active ? "700" : "400",
      cursor: "pointer",
      transition: "background .18s",
    }),
    navBtn: (key) => ({
      width: "34px",
      height: "34px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",
      border: "none",
      background: "transparent",
      color: NAVY,
      cursor: "pointer",
      transition: "background .18s",
    }),
    /* modal */
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },
    modal: {
      background: WHITE,
      borderRadius: "14px",
      padding: "28px 30px",
      width: "90%",
      maxWidth: "560px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 12px 48px rgba(0,0,0,.22)",
    },
    modalHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    modalTitle: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "18px",
      fontWeight: "600",
      color: "#610000",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    closeBtn: {
      background: "none",
      border: "none",
      fontSize: "22px",
      cursor: "pointer",
      color: "#8a8a8a",
      lineHeight: 1,
      padding: "2px 6px",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "14px",
    },
    fg: {
      display: "flex",
      flexDirection: "column",
      gap: "5px",
    },
    fgFull: {
      display: "flex",
      flexDirection: "column",
      gap: "5px",
      gridColumn: "span 2",
    },
    flabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: NAVY,
      textTransform: "uppercase",
      letterSpacing: ".07em",
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
    modalActions: {
      display: "flex",
      gap: "10px",
      marginTop: "22px",
      justifyContent: "flex-end",
    },
    cancelBtn: {
      padding: "9px 20px",
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      fontWeight: "600",
      cursor: "pointer",
      border: `2px solid ${RED}`,
      background: "transparent",
      color: RED,
    },
    submitBtn: {
      padding: "9px 20px",
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "13.5px",
      fontWeight: "600",
      cursor: "pointer",
      border: "none",
      background: RED,
      color: WHITE,
      transition: "all .2s",
    },
    successModal: {
      background: WHITE,
      borderRadius: "14px",
      padding: "32px",
      width: "90%",
      maxWidth: "400px",
      textAlign: "center",
      boxShadow: "0 12px 48px rgba(0,0,0,.22)",
      position: "relative",
    },
    successModalHeader: {
      position: "absolute",
      top: "16px",
      right: "16px",
    },
    successCloseBtn: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#8a8a8a",
      lineHeight: 1,
      padding: "4px",
      borderRadius: "4px",
      transition: "all .2s",
    },
    successIcon: {
      margin: "16px auto",
      width: "80px",
      height: "80px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    successTitle: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "20px",
      fontWeight: "600",
      color: "#610000",
      marginBottom: "8px",
    },
    successMessage: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      color: "#6b7280",
      marginBottom: "24px",
    },
    successBtn: {
      padding: "10px 24px",
      borderRadius: "8px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      border: "none",
      background: "#610000",
      color: WHITE,
      transition: "all .2s",
    },
  };

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={s.wrap}>

      {/* Top row — Add Employee button (pill, top-right) */}
      <div style={s.topRow}>
        <button
          style={s.addBtn}
          onMouseEnter={() => setHoveredBtn("add")}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={openAdd}
        >
          <IconPlus />
          Add Employee
        </button>
      </div>

      {/* Sub row — title + archived toggle + search */}
      <div style={s.subRow}>
        <div className="sec-head" style={{ fontFamily: "Playfair Display, serif", fontSize: '17px', fontWeight: '700', color: 'var(--navy)', marginBottom: '0px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Employee List
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(to right,#e0d4c8,transparent)', minWidth: '50px' }}></div>
        </div>
        <div style={s.subRight}>
          <button
            style={s.archivedBtn}
            onClick={() => { setShowArchived(!showArchived); setPage(1); }}
          >
            {!showArchived ? <IconArchiveFilled /> : <IconArchive />}
            {!showArchived ? "show archived" : "hide archived"}
          </button>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={s.searchInput}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          background: "#fef2f2", 
          border: "1px solid #fecaca", 
          borderRadius: "8px", 
          padding: "12px 16px", 
          marginBottom: "16px",
          color: "#dc2626",
          fontSize: "13.5px"
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Designation</th>
              <th style={s.th}>ID Number</th>
              <th style={s.thCenter}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: "20px", background: WHITE }}>
                  <TableShimmer rows={4} columns={5} />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px", background: WHITE }}>
                  No employees found.
                </td>
              </tr>
            ) : (
              pageRows.map(emp => (
                <tr
                  key={emp._id}
                  onMouseEnter={() => setHoveredRow(emp._id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={s.td(emp._id)}>
                    <div style={{ fontWeight: "500", color: "#111827" }}>{emp.name || `${emp.firstName} ${emp.middleInitial ? emp.middleInitial + '. ' : ''}${emp.lastName}`}</div>
                  </td>
                  <td style={s.td(emp._id)}>{emp.email || <span style={{ color: "#d1d5db" }}>—</span>}</td>
                  <td style={s.td(emp._id)}>{emp.designation}</td>
                  <td style={s.td(emp._id)}>
                    <span style={{ fontFamily: "'DM Sans', monospace", fontSize: "13px", letterSpacing: ".03em" }}>{emp.idNumber}</span>
                  </td>
                  <td style={s.tdCenter(emp._id)}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                      {/* Edit */}
                      <button
                        title="Edit"
                        style={s.actionBtn(`edit-${emp._id}`, RED)}
                        onClick={() => openEdit(emp)}
                      >
                        <IconEdit />
                      </button>
                      {/* Archive / Unarchive */}
                      <button
                        title={emp.isArchived ? "Unarchive" : "Archive"}
                        style={s.actionBtn(`arch-${emp._id}`, emp.isArchived ? "#059669" : RED)}
                        onMouseEnter={() => setHoveredBtn(`arch-${emp._id}`)}
                        onMouseLeave={() => setHoveredBtn(null)}
                        onClick={() => handleArchive(emp)}
                      >
                        {emp.isArchived ? <IconArchiveFilled /> : <IconArchive />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Showing X out of Y */}
        <div style={s.foot}>
          <span style={s.showingTxt}>
            Showing {pagination.total > 0 ? Math.min((safePage - 1) * PER_PAGE + 1, pagination.total) : 0}–{Math.min(safePage * PER_PAGE, pagination.total)} out of {pagination.total}
          </span>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={s.navBtn("prev")}
            onMouseEnter={() => setHoveredBtn("prev")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <IconChevLeft />
          </button>
          {pageNums.map(n => (
            <button
              key={n}
              style={s.pageBtn(n === safePage, `pg-${n}`)}
              onMouseEnter={() => setHoveredBtn(`pg-${n}`)}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            style={s.navBtn("next")}
            onMouseEnter={() => setHoveredBtn("next")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            <IconChevRight />
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <div style={s.modalTitle}>{editingId ? "Edit Employee" : <><IconPlusBootstrap /> Add New Employee</>}</div>
              <button style={s.closeBtn} onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={s.formGrid}>
                <div style={s.fg}>
                  <label style={s.flabel}>First Name</label>
                  <input style={s.finput} type="text" name="firstName" value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="e.g. Alvina" required />
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Last Name</label>
                  <input style={s.finput} type="text" name="lastName" value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="e.g. Cudo" required />
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Middle Initial</label>
                  <input style={s.finput} type="text" name="middleInitial" value={form.middleInitial}
                    onChange={e => setForm(p => ({ ...p, middleInitial: e.target.value }))}
                    placeholder="e.g. S" maxLength="1" />
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Employee ID Number</label>
                  <input style={s.finput} type="text" name="idNumber" value={form.idNumber}
                    onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))}
                    placeholder="e.g. 223232323" required />
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Designation</label>
                  <input style={s.finput} type="text" name="designation" value={form.designation}
                    onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Developer" required />
                </div>
                <div style={s.fg}>
                  <label style={s.flabel}>Email</label>
                  <input
                    style={s.finput}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    onInvalid={e => e.target.setCustomValidity('Please fill this out')}
                    onInput={e => e.target.setCustomValidity('')}
                    placeholder="employee@datalogix.com.ph"
                    required
                  />
                </div>
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.cancelBtn} onClick={closeModal}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  style={{
                    ...s.submitBtn,
                    background: isSaving ? '#ccc' : RED,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
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
                  {isSaving ? 'Saving...' : (editingId ? "Update Employee" : "Add Employee")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowSuccessModal(false); }}>
          <div style={s.successModal}>
            <div style={s.successModalHeader}>
              <button style={s.successCloseBtn} onClick={() => setShowSuccessModal(false)}>×</button>
            </div>
            <div style={s.successTitle}>Employee Added Successfully!</div>
            <div style={s.successMessage}>
              {form.firstName} {form.lastName} has been added to the employee list.
            </div>
            <div style={s.successIcon}>
              <img src="/party_14965557.png" alt="Success" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
