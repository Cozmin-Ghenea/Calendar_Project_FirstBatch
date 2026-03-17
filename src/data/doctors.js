export const WORK_HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // [8, 9, ..., 17]

/**
 * Generate busy slots for a doctor on a specific date.
 * Uses a deterministic pseudo-random function based on doctorId + dateString.
 */
function seededRand(seed) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export function getBusySlotsForDoctor(doctorId, dateStr) {
  const base = dateStr.split('-').reduce((acc, part, i) => acc + parseInt(part) * (i + 1), 0);
  const seed = base * doctorId;

  const busySlots = new Set();
  WORK_HOURS.forEach((hour, idx) => {
    const rand = seededRand(seed + idx * 13);
    if (rand < 0.30) busySlots.add(hour);
  });

  return busySlots;
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatSlot(hour) {
  return `${formatHour(hour)} – ${formatHour(hour + 1)}`;
}
