import { useState } from 'react';
import styles from './BookingList.module.scss';

const FILTERS = ['Toate', 'Azi', 'Această Săptămână'];

function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKeys(d) {
    const keys = new Set();
    for (let i = 0; i < 7; i++) {
        const day = new Date(d);
        day.setDate(d.getDate() + i);
        keys.add(toDateKey(day));
    }
    return keys;
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d).toLocaleDateString('ro-RO', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

export default function BookingList({ bookings, selectedDate, onCancel, onApprove, onReject, userRole }) {
    const [filter, setFilter] = useState('Toate');
    const [removingIds, setRemovingIds] = useState(new Set());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);
    const weekKeys = getWeekKeys(today);

    // Helper to check if a booking is strictly in the past (before today, or today but hour passed)
    const isBookingInPast = (dateStr, hour) => {
        const now = new Date();
        const [y, m, d] = dateStr.split('-');
        const slotDate = new Date(y, m - 1, d);
        slotDate.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        return slotDate < now;
    };

    // Filter logic based on user role
    const roleFiltered = bookings.filter(b => {
        if (userRole?.role === 'clinic' && userRole?.doctorId !== 'admin') {
            return b.doctorId === userRole.doctorId; // Doctor sees only their appointments
        }
        if (userRole?.role === 'patient') {
            return b.patientEmail === userRole.email; // Patient sees ONLY their own
        }
        return true; // Admin sees all
    });

    const filtered = roleFiltered.filter(b => {
        if (selectedDate) return b.date === selectedDate;
        if (filter === 'Azi') return b.date === todayKey;
        if (filter === 'Această Săptămână') return weekKeys.has(b.date);
        return true;
    });

    // Sort by date (newest first), then hour (newest first)
    const sorted = [...filtered].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.hour - a.hour;
    });

    const handleCancel = (id) => {
        setRemovingIds(prev => new Set([...prev, id]));
        setTimeout(() => {
            onCancel(id);
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 350);
    };

    // Guest view
    if (!userRole) {
        return (
            <div className={styles.bookings}>
                <div className={styles.bookings__header}>
                    <h3>Lista de Programări</h3>
                </div>
                <div className={styles.bookings__scroll}>
                    <div className={styles.bookings__empty}>
                        <div className={styles.icon}>👋</div>
                        <p>Bine ai venit!<br />Selectează o dată și un medic din stânga pentru a face o programare.<br/><br/>Loghează-te pentru a-ți vedea propriile programări.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.bookings}>
            <div className={styles.bookings__header}>
                <h3>{selectedDate ? `Programări pentru ${formatDate(selectedDate)}` : 'Programările Mele'}</h3>
                <span className={styles.count}>{filtered.length}</span>
            </div>

            {/* Hide normal filters if a specific date is selected from the calendar */}
            {!selectedDate && (
                <div className={styles.bookings__filters}>
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`${styles['bookings__filter-btn']} ${filter === f ? styles['bookings__filter-btn--active'] : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.bookings__scroll}>
                {sorted.length === 0 ? (
                    <div className={styles.bookings__empty}>
                        <div className={styles.icon}>📋</div>
                        {selectedDate ? (
                            <p>Nicio programare pentru data de {formatDate(selectedDate)}.</p>
                        ) : (
                            <p>Nicio programare încă.<br />Alege o dată și un doctor din stânga!</p>
                        )}
                    </div>
                ) : (
                    sorted.map(booking => {
                        const isPast = isBookingInPast(booking.date, booking.hour);
                        
                        return (
                            <div
                                key={booking.id}
                                className={`${styles.card} ${removingIds.has(booking.id) ? styles['card--removing'] : ''} ${isPast ? styles['card--history'] : ''}`}
                            >
                                {/* Doctor avatar */}
                                <div
                                    className={styles.card__avatar}
                                    style={{ background: isPast ? '#a6a19a' : booking.doctorColor }}
                                >
                                    {booking.doctorAvatar}
                                </div>

                                {/* Info */}
                                <div className={styles.card__body}>
                                    <div className={styles.card__name}>{booking.doctorName} {isPast && <span style={{fontSize: '0.65rem', fontWeight: 'normal', color: '#a6a19a'}}>(History)</span>}</div>
                                    <div className={styles.card__specialty}>{booking.specialty}</div>
                                    {booking.patientName && (
                                        <div className={styles.card__patient}>
                                            👤 {booking.patientName}
                                            {booking.patientEmail && <span style={{opacity: 0.6, marginLeft: 6, fontSize: '0.7rem'}}>{booking.patientEmail}</span>}
                                        </div>
                                    )}
                                    <div className={styles.card__meta}>
                                        <span>📅 {formatDate(booking.date)}</span>
                                        <span className={styles.card__time_badge}>
                                            🕐 {booking.slot}
                                        </span>
                                        {booking.status && (
                                            <span className={`${styles.card__status} ${styles['card__status--' + booking.status]} ${isPast ? styles['card__status--past'] : ''}`}>
                                                {booking.status === 'pending' ? 'În Așteptare' : 
                                                 booking.status === 'confirmed' ? 'Confirmat' : 'Refuzat'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions (Only show if NOT in the past) */}
                                {!isPast && (
                                    <div className={styles.card__actions}>
                                        {userRole?.role === 'clinic' && booking.status === 'pending' ? (
                                            <>
                                                <button
                                                    className={styles['card__action-btn--approve']}
                                                    onClick={() => onApprove(booking.id)}
                                                    title="Acceptă programarea"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className={styles['card__action-btn--reject']}
                                                    onClick={() => onReject(booking.id)}
                                                    title="Refuză programarea"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        ) : (
                                            /* Patient can only cancel pending requests (or maybe anytime) */
                                            (!userRole || userRole.role === 'patient' || userRole.doctorId === 'admin') && (
                                                <button
                                                    className={styles.card__cancel}
                                                    onClick={() => handleCancel(booking.id)}
                                                    title="Șterge / Anulează programarea"
                                                >
                                                    ✕
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
