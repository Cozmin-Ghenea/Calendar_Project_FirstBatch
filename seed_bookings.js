import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zmbaplixtyyjlrddogrs.supabase.co';
const supabaseAnonKey = 'sb_publishable_zGOgJgUEx5nz-lCw6E2t6Q_9JXBIGmD';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Fetching doctors from DB...');
  const { data: doctors, error: dError } = await supabase.from('doctors').select('*');
  if (dError || !doctors || doctors.length === 0) {
    console.error('No doctors found in DB. Did you run the Seeding SQL script?', dError);
    return;
  }

  console.log(`Found ${doctors.length} doctors. Creating bookings...`);

  const patients = [
    { name: 'Ion Popescu', email: 'ion.popescu@gmail.com' },
    { name: 'Elena Radu', email: 'elena.radu@yahoo.com' },
    { name: 'Mihai Vasilescu', email: 'mihai.v@gmail.com' },
    { name: 'Ana Georgiana', email: 'ana.g@gmail.com' },
    { name: 'George Iancu', email: 'george.iancu@gmail.com' }
  ];

  const today = new Date();
  const bookings = [];

  // Create 10 bookings for some dates this/next week
  for (let i = 1; i <= 10; i++) {
    const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
    const randomPatient = patients[Math.floor(Math.random() * patients.length)];
    
    // Choose a date between today and 5 days from now
    const d = new Date();
    d.setDate(today.getDate() + Math.floor(Math.random() * 6)); 
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Choose random hour 8-17
    const hour = Math.floor(Math.random() * 10) + 8; 

    bookings.push({
      doctor_id:    randomDoctor.id,
      doctor_name:  randomDoctor.name,
      specialty:    randomDoctor.specialty || 'Medicină Generală',
      doctor_color: randomDoctor.color || '#34d399',
      doctor_avatar: randomDoctor.avatar || 'DR',
      date:         dateStr,
      hour:         hour,
      slot:         `${String(hour).padStart(2, '0')}:00 – ${String(hour+1).padStart(2, '0')}:00`,
      status:       Math.random() > 0.3 ? 'confirmed' : 'pending',
      patient_name:  randomPatient.name,
      patient_email: randomPatient.email
    });
  }

  console.log('Inserting into bookings table...');
  const { error: bError } = await supabase.from('bookings').insert(bookings);

  if (bError) {
    console.error('Error inserting bookings:', bError.message);
  } else {
    console.log('Successfully inserted 10 mock bookings! 🎉');
  }
}

seed();
