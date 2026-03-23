import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.scss';

// ─── Staff (Doctor) Login ──────────────────────────────────────────────────────
function StaffLogin({ onLogin, setError, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Admin shortcut (kept local)
    if (email === 'admin' && password === 'admin') {
      onLogin({ role: 'clinic', doctorId: 'admin', doctorName: 'Reception / Admin' });
      setLoading(false);
      return;
    }

    // Sign in via Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    // Check if this user is a doctor
    const { data: doctor, error: dbError } = await supabase
      .from('doctors')
      .select('id, name, specialty, avatar, color')
      .eq('auth_user_id', data.user.id)
      .single();

    if (dbError || !doctor) {
      // Not a doctor — sign them out so their session isn't polluted
      await supabase.auth.signOut();
      setError('No doctor profile found for this account.');
      setLoading(false);
      return;
    }

    onLogin({ role: 'clinic', doctorId: doctor.id, doctorName: doctor.name, doctorColor: doctor.color, doctorAvatar: doctor.avatar });
    setLoading(false);
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="login-form__error">{error}</div>}
      <div className="login-form__group">
        <label htmlFor="staff-email">Email / Username</label>
        <input type="text" id="staff-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="andrei.popescu@pawsclinic.ro or admin" required />
      </div>
      <div className="login-form__group">
        <label htmlFor="staff-password">Password</label>
        <input type="password" id="staff-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      </div>
      <button type="submit" className="login-form__button" disabled={loading}>
        {loading ? 'Signing In…' : 'Sign In as Staff'}
      </button>
    </form>
  );
}

// ─── Patient Login ─────────────────────────────────────────────────────────────
function PatientLogin({ onLogin, setError, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    setLoading(false);

    if (authError) { setError(authError.message); return; }

    const meta = data.user?.user_metadata || {};
    onLogin({
      role: 'patient',
      patientId: data.user.id,
      patientName: `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || data.user.email,
      email: data.user.email,
    });
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="login-form__error">{error}</div>}
      <div className="login-form__group">
        <label htmlFor="patient-email">Email</label>
        <input type="email" id="patient-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
      </div>
      <div className="login-form__group">
        <label htmlFor="patient-password">Password</label>
        <input type="password" id="patient-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      </div>
      <button type="submit" className="login-form__button login-form__button--patient" disabled={loading}>
        {loading ? 'Signing In…' : 'Sign In as Patient 🐾'}
      </button>
    </form>
  );
}

// ─── Patient Register ──────────────────────────────────────────────────────────
function PatientRegister({ onLogin, setError, error }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
    });

    setLoading(false);
    if (authError) { setError(authError.message); return; }

    const meta = data.user?.user_metadata || {};
    onLogin({
      role: 'patient',
      patientId: data.user.id,
      patientName: `${meta.first_name} ${meta.last_name}`.trim(),
      email: data.user.email,
    });
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="login-form__error">{error}</div>}
      <div className="login-form__row">
        <div className="login-form__group">
          <label htmlFor="reg-first">First Name</label>
          <input type="text" id="reg-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ion" required />
        </div>
        <div className="login-form__group">
          <label htmlFor="reg-last">Last Name</label>
          <input type="text" id="reg-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Popescu" required />
        </div>
      </div>
      <div className="login-form__group">
        <label htmlFor="reg-email">Email</label>
        <input type="email" id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
      </div>
      <div className="login-form__group">
        <label htmlFor="reg-password">Password</label>
        <input type="password" id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
      </div>
      <div className="login-form__group">
        <label htmlFor="reg-confirm">Confirm Password</label>
        <input type="password" id="reg-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
      </div>
      <button type="submit" className="login-form__button login-form__button--patient" disabled={loading}>
        {loading ? 'Creating Account…' : 'Create Account & Book 🐾'}
      </button>
    </form>
  );
}

// ─── Main Login Component ──────────────────────────────────────────────────────
export default function Login({ onLogin, isModal, onClose }) {
  const [view, setView] = useState('patient-login');
  const [error, setError] = useState('');
  const switchView = (v) => { setView(v); setError(''); };

  return (
    <div className={isModal ? 'login-modal-overlay' : 'login-container'}>
      <div className={`login-card ${isModal ? 'login-card--modal' : ''}`}>
        {isModal && <button className="login-modal-close" onClick={onClose} aria-label="Close">✕</button>}

        <div className="login-card__header">
          <div className="login-card__logo">
            <span className="login-card__logo-icon">🐾</span>
            <span>PawsCalendar</span>
          </div>
          <p className="login-card__subtitle">
            {view === 'staff' ? 'Staff / Doctor Login' : view === 'patient-login' ? 'Patient Sign In' : 'Create Patient Account'}
          </p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${view === 'patient-login' ? 'login-tab--active' : ''}`} onClick={() => switchView('patient-login')}>Patient Sign In</button>
          <button className={`login-tab ${view === 'patient-register' ? 'login-tab--active' : ''}`} onClick={() => switchView('patient-register')}>Register</button>
          <button className={`login-tab ${view === 'staff' ? 'login-tab--active' : ''}`} onClick={() => switchView('staff')}>Staff</button>
        </div>

        {view === 'staff' && <StaffLogin onLogin={onLogin} setError={setError} error={error} />}
        {view === 'patient-login' && <PatientLogin onLogin={onLogin} setError={setError} error={error} />}
        {view === 'patient-register' && <PatientRegister onLogin={onLogin} setError={setError} error={error} />}
      </div>
      {!isModal && <div className="app__glow" />}
    </div>
  );
}
