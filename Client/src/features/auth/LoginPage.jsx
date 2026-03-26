import { useState, useEffect } from "react";
import { authAPI } from "../../api/auth.api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .login-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .login-left {
    width: 46%;
    background: #610000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 52px;
    position: relative;
    overflow: hidden;
  }

  /* geometric accent shapes */
  .login-left::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 320px; height: 320px;
    border-radius: 50%;
    border: 60px solid rgba(255,243,115,.08);
    pointer-events: none;
  }
  .login-left::after {
    content: '';
    position: absolute;
    bottom: -60px; left: -60px;
    width: 240px; height: 240px;
    border-radius: 50%;
    border: 50px solid rgba(0,50,153,.18);
    pointer-events: none;
  }

  .brand-block { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: flex-start; height: 100%; }

  .brand-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    margin-top: 60px;
  }
  .brand-logo-icon {
    width: 38px; height: 38px;
    background: #FFF373;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand-logo-icon svg { width: 22px; height: 22px; }
  .brand-logo-name {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    letter-spacing: .02em;
  }
  .brand-logo-name span { color: #FFF373; }

  .brand-headline {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 600;
    color: #fff;
    line-height: 1.2;
    margin-bottom: 20px;
    margin-top: 30px;
    letter-spacing: -.01em;
    text-align: center;
  }
  .brand-headline em {
    font-style: normal;
    color: #FFF373;
  }

  .brand-sub {
    font-size: 14px;
    color: rgba(255,255,255,.55);
    line-height: 1.7;
    max-width: 280px;
    font-weight: 300;
    text-align: center;
    margin: 0 auto;
  }

  /* stats row */
  .brand-stats {
    display: flex;
    gap: 32px;
    position: relative;
    z-index: 1;
  }
  .stat-item {}
  .stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #FFF373;
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-lbl {
    font-size: 11px;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .1em;
  }

  /* ── RIGHT PANEL ── */
  .login-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    background: #fff;
    position: relative;
  }

  /* subtle grid bg */
  .login-right::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,50,153,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,50,153,.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    position: relative;
    z-index: 1;
    animation: fadeUp .5s ease both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .login-card-header { margin-bottom: 36px; }

  .login-greeting {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: #003299;
    margin-bottom: 8px;
  }

  .login-title {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.15;
    margin-bottom: 8px;
  }

  .login-desc {
    font-size: 13px;
    color: #888;
    font-weight: 300;
  }

  /* form */
  .login-form { display: flex; flex-direction: column; gap: 18px; }

  .form-group { display: flex; flex-direction: column; gap: 6px; }

  .form-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: #333;
  }

  .form-input-wrap { position: relative; }

  .form-input {
    width: 100%;
    padding: 13px 44px 13px 16px;
    border: 1.5px solid #e2e2e2;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #1a1a1a;
    background: #fafafa;
    outline: none;
    transition: border-color .2s, background .2s, box-shadow .2s;
  }
  .form-input:focus {
    border-color: #610000;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(97,0,0,.07);
  }
  .form-input.error {
    border-color: #e53e3e;
  }

  .form-input-icon {
    position: absolute;
    right: 14px; top: 50%;
    transform: translateY(-50%);
    color: #bbb;
    pointer-events: none;
    transition: color .2s;
  }
  .form-input:focus ~ .form-input-icon { color: #610000; }

  .form-eye-btn {
    position: absolute;
    right: 14px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    cursor: pointer; padding: 0;
    color: #bbb;
    display: flex; align-items: center;
    transition: color .2s;
  }
  .form-eye-btn:hover { color: #610000; }

  .form-error {
    font-size: 11px;
    color: #e53e3e;
    margin-top: 2px;
  }

  /* options row */
  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: -4px;
  }

  .form-remember {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    font-size: 13px;
    color: #555;
    user-select: none;
  }
  .form-remember input[type=checkbox] {
    width: 15px; height: 15px;
    accent-color: #610000;
    cursor: pointer;
  }

  .form-forgot {
    font-size: 12px;
    color: #003299;
    text-decoration: none;
    font-weight: 500;
    background: none; border: none; cursor: pointer;
    padding: 0;
    transition: color .2s;
  }
  .form-forgot:hover { color: #610000; text-decoration: underline; }

  /* submit button */
  .btn-login {
    width: 100%;
    padding: 14px;
    background: #610000;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: .04em;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background .2s, transform .12s, box-shadow .2s;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
  }
  .btn-login::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,243,115,.15) 0%, transparent 60%);
    pointer-events: none;
  }
  .btn-login:hover:not(:disabled) {
    background: #7a0000;
    box-shadow: 0 8px 24px rgba(97,0,0,.28);
    transform: translateY(-1px);
  }
  .btn-login:active:not(:disabled) { transform: translateY(0); }
  .btn-login:disabled { opacity: .65; cursor: not-allowed; }

  /* divider */
  .login-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 4px 0;
  }
  .login-divider hr {
    flex: 1; border: none; border-top: 1px solid #eee;
  }
  .login-divider span {
    font-size: 11px; color: #bbb; text-transform: uppercase; letter-spacing: .1em;
  }

  /* accent bar at bottom of card */
  .login-card-foot {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    color: #aaa;
  }
  .login-card-foot strong {
    color: #610000;
    font-weight: 600;
  }

  /* loading spinner */
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .65s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* success state */
  .success-overlay {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    animation: fadeUp .4s ease both;
  }
  .success-icon {
    width: 64px; height: 64px;
    background: #FFF373;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .success-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 700; color: #1a1a1a;
    margin-bottom: 8px;
  }
  .success-sub { font-size: 13px; color: #888; }

  /* accent yellow line under card header */
  .accent-line {
    width: 40px; height: 3px;
    background: #FFF373;
    border-radius: 2px;
    margin-top: 14px;
  }

  @media (max-width: 768px) {
    .login-left { display: none; }
    .login-right { padding: 32px 24px; }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = STYLE;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  const validate = () => {
    const e = {};
    if (!email)               e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password)            e.password = "Password is required";
    else if (password.length < 6)         e.password = "Minimum 6 characters";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setLoading(true);
    try {
      console.log('Sending login request:', { email, password });
      const response = await authAPI.login({ email, password });
      
      // Update AuthContext with user data and token
      if (response.data && response.data.accessToken) {
        await login(response.data.user, response.data.accessToken);
      } else {
        throw new Error('Invalid response structure from server');
      }
      
      setLoading(false);
      setSuccess(true);
      
      // Redirect to dashboard after success animation
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
    }
  };

  return (
    <div className="login-root">

      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div className="brand-block">
          {/* Logo */}
          <div className="brand-logo" style={{ justifyContent: 'center', display: 'flex', width: '240px', backgroundColor: 'white', padding: '8px', margin: '55px auto 0 auto' }}>
            <img src="/logo.png" alt="Datalogix Logo" style={{ width: '220px', height: '60px' }} />
          </div>

          {/* Headline */}
          <div className="brand-headline">
            Manage payroll<br/>
            with <em>precision</em><br/>
            and ease.
          </div>
          <p className="brand-sub">
            A complete payroll management platform built for teams that value accuracy, transparency, and speed.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right">
        <div className="login-card">

          {success ? (
            <div className="success-overlay">
              <div className="success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#610000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="success-title">Welcome back!</div>
              <div className="success-sub">Redirecting to your dashboard…</div>
            </div>
          ) : (
            <>
              <div className="login-card-header">
                <div className="login-greeting">Payroll System</div>
                <div className="login-title">Sign in to<br/>your account</div>
                <div className="accent-line" />
                <div className="login-desc" style={{ marginTop:"12px" }}>
                  Enter your credentials to access the dashboard
                </div>
              </div>

              <form className="login-form" onSubmit={handleSubmit} noValidate>

                {/* General Error */}
                {errors.general && (
                  <div style={{ 
                    backgroundColor: '#fee', 
                    color: '#c53030', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    fontSize: '14px',
                    border: '1px solid #fed7d7'
                  }}>
                    {errors.general}
                  </div>
                )}

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="form-input-wrap">
                    <input
                      className={`form-input${errors.email ? " error" : ""}`}
                      type="email"
                      placeholder="you@datalogix.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(v=>({...v,email:""})); }}
                      autoComplete="email"
                    />
                    <span className="form-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                  </div>
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="form-input-wrap">
                    <input
                      className={`form-input${errors.password ? " error" : ""}`}
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(v=>({...v,password:""})); }}
                      autoComplete="current-password"
                    />
                    <button type="button" className="form-eye-btn" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>

                {/* Submit */}
                <button type="submit" className="btn-login" disabled={loading}>
                  {loading ? (
                    <><div className="spinner" /> Signing in…</>
                  ) : (
                    <>
                      Sign In
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
