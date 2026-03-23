import { useState, useMemo, useEffect } from 'react';
import Calendar from './components/Calendar';
import DoctorPanel from './components/DoctorPanel';
import BookingList from './components/BookingList';
import Login from './components/Login';
import { supabase } from './lib/supabase';
import './App.scss';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Derived role flags ───────────────────────────────────────────────────────
  const isDoctor = userRole?.role === 'clinic' && userRole?.doctorId !== 'admin';
  const isAdmin   = userRole?.role === 'clinic' && userRole?.doctorId === 'admin';
  const isPatient = userRole?.role === 'patient';

  // ── Restore session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      // Load doctors from DB first (always needed)
      const { data: doctorRows } = await supabase.from('doctors').select('*').order('id');
      if (doctorRows) setDoctors(doctorRows);

      // Check for existing Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user is a doctor
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id, name, color, avatar')
          .eq('auth_user_id', session.user.id)
          .single();

        if (doctor) {
          setUserRole({ role: 'clinic', doctorId: doctor.id, doctorName: doctor.name, doctorColor: doctor.color, doctorAvatar: doctor.avatar });
          setIsAuthenticated(true);
          setSessionLoading(false);
          return;
        }

        // Otherwise it's a patient
        const meta = session.user.user_metadata || {};
        setUserRole({
          role: 'patient',
          patientId: session.user.id,
          patientName: `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || session.user.email,
          email: session.user.email,
        });
        setIsAuthenticated(true);
        setSessionLoading(false);
        return;
      }

      // Check for admin session in localStorage
      try {
        const saved = localStorage.getItem('paws_staff_role');
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserRole(parsed);
          setIsAuthenticated(true);
        }
      } catch { /* ignore */ }

      setSessionLoading(false);
    }

    restoreSession();
  }, []);

  // ── Load bookings from Supabase ──────────────────────────────────────────────
  const fetchBookings = async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, doctors(name, color, avatar, specialty), profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data.map(b => ({
        id: b.id,
        doctorId: b.doctor_id,
        doctorName: b.doctors?.name || b.doctor_name,
        specialty: b.doctors?.specialty || b.specialty,
        doctorColor: b.doctors?.color || b.doctor_color,
        doctorAvatar: b.doctors?.avatar || b.doctor_avatar,
        date: b.date,
        hour: b.hour,
        slot: b.slot,
        status: b.status,
        patientName: b.profiles?.full_name || b.patient_name,
        patientEmail: b.profiles?.email || b.patient_email,
      })));
    } else if (error) {
      console.error('Error fetching bookings:', error.message);
    }
    setLoadingBookings(false);
  };

  useEffect(() => {
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Calendar dots ─────────────────────────────────────────────────────────────
  const bookedDates = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (isDoctor && b.doctorId !== userRole.doctorId) return;
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings, isDoctor, userRole]);

  // ── Booking actions ───────────────────────────────────────────────────────────
  const handleBook = async (booking) => {
    if (!isAuthenticated) {
      setPendingBooking(booking);
      setShowLogin(true);
      return;
    }
    await insertBooking(booking, userRole);
  };

  async function insertBooking(booking, user) {
    const row = {
      doctor_id:     booking.doctorId,
      user_id:       user?.patientId || null,
      date:          booking.date,
      hour:          booking.hour,
      slot:          booking.slot,
      status:        'pending',
    };

    const { error } = await supabase.from('bookings').insert([row]);
    if (error) {
      console.error('Error inserting booking:', error.message);
    } else {
      await fetchBookings(); // Always manually refetch after mutation
    }
  }

  const handleCancel = async (id) => {
    await supabase.from('bookings').delete().eq('id', id);
    await fetchBookings();
  };

  const handleApprove = async (id) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
    await fetchBookings();
  };

  const handleReject = async (id) => {
    await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
    await fetchBookings();
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  const handleLogin = async (user) => {
    setUserRole(user);
    setIsAuthenticated(true);
    setShowLogin(false);

    // Persist staff/doctor role in localStorage
    if (user.role === 'clinic') {
      localStorage.setItem('paws_staff_role', JSON.stringify(user));
    }

    if (pendingBooking && (user.role === 'patient' || user.doctorId === 'admin')) {
      await insertBooking(pendingBooking, user);
      setPendingBooking(null);
    } else if (pendingBooking) {
      setPendingBooking(null);
    }
  };

  const handleSignOut = async () => {
    if (isPatient) await supabase.auth.signOut();
    localStorage.removeItem('paws_staff_role'); // clear staff session too
    setIsAuthenticated(false);
    setUserRole(null);
  };

  // Block rendering until we know the auth state
  if (sessionLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fffdf5' }}>
        <span style={{ fontSize: '2rem' }}>🐾</span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__logo">
            <span className="app__logo-icon">🐾</span>
            <span>PawsCalendar</span>
          </div>
          <div className="app__stats">
            <span className="app__stat">
              <span className="app__stat-n">
                {userRole?.doctorName || userRole?.patientName || (isPatient ? 'Patient' : '')}
              </span>
            </span>
            {isDoctor && (
              <span className="app__stat" style={{marginLeft: '10px', padding: '4px 10px', background: 'rgba(242, 124, 89, 0.1)', borderRadius: '20px', color: '#f27c59', fontWeight: 'bold', fontSize: '0.75rem'}}>
                Doctor Mode
              </span>
            )}
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                style={{marginLeft: '15px', background: 'transparent', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'}}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                style={{marginLeft: '15px', background: 'transparent', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'}}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="app__main">
        <div className="app__left">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={(date) => setSelectedDate(date === selectedDate ? null : date)}
            entriesByDate={bookedDates}
          />
          {!isDoctor && (
            <DoctorPanel
              selectedDate={selectedDate}
              bookings={bookings}
              onBook={handleBook}
              userRole={userRole}
              doctors={doctors}
            />
          )}
        </div>

        <div className="app__right">
          <BookingList
            bookings={bookings}
            selectedDate={selectedDate}
            onCancel={handleCancel}
            onApprove={handleApprove}
            onReject={handleReject}
            userRole={userRole}
            loading={loadingBookings}
          />
        </div>
      </main>

      {/* Login Modal */}
      {showLogin && (
        <Login
          isModal={true}
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      <div className="app__glow" />
    </div>
  );
}
