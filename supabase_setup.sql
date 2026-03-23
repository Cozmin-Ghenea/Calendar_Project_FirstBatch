

-- ⚠️ WARNING: The lines below will RESET your tables for testing.
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;


-- ==========================================
-- 1️⃣ CREATE TABLES
-- ==========================================

-- 🩺 Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    specialty text NOT NULL,
    color text DEFAULT '#F27C59', -- Matching your veterinary app theme color
    avatar text,
    created_at timestamp WITH time zone DEFAULT now()
);

-- 👤 Profiles (Patients/Users) Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text NOT NULL,
    phone text,
    created_at timestamp WITH time zone DEFAULT now()
);

-- 📅 Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    hour integer NOT NULL, -- e.g. 9 for 09:00
    slot text NOT NULL,   -- e.g. "09:00 – 10:00"
    status text CHECK (status IN ('pending', 'confirmed', 'rejected')) DEFAULT 'pending',
    created_at timestamp WITH time zone DEFAULT now()
);

-- 🔒 Disable RLS for easier testing in Development
ALTER TABLE IF EXISTS public.doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings DISABLE ROW LEVEL SECURITY;


-- ==========================================
-- 2️⃣ INSERT DUMMY DATA FOR TESTING
-- ==========================================

-- 🩺 Insert Dummy Doctors (Fixed UUIDs for reference)
INSERT INTO public.doctors (id, name, specialty, color, avatar) VALUES
('d1111111-1111-1111-1111-111111111111', 'Dr. Adrian Popescu', 'Chirurgie Veterinară', '#F27C59', 'AP'),
('d2222222-2222-2222-2222-222222222222', 'Dr. Elena Radu', 'Dermatologie', '#10b981', 'ER'),
('d3333333-3333-3333-3333-333333333333', 'Dr. Mihai Vasilescu', 'Medicină Generală', '#3b82f6', 'MV')
ON CONFLICT (id) DO NOTHING;

-- 👤 Insert Dummy Profiles (Patients)
INSERT INTO public.profiles (id, email, full_name, phone) VALUES
('c1111111-1111-1111-1111-111111111111', 'patient1@gmail.com', 'Ion Popescu', '0722123456'),
('c2222222-2222-2222-2222-222222222222', 'patient2@gmail.com', 'Ana Georgiana', '0733123456'),
('c3333333-3333-3333-3333-333333333333', 'patient3@gmail.com', 'George Iancu', '0744123456')
ON CONFLICT (id) DO NOTHING;

-- 📅 Insert Dummy Bookings (Dates are relative to "today")
INSERT INTO public.bookings (doctor_id, user_id, date, hour, slot, status) VALUES
-- Tomorrow's bookings
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', CURRENT_DATE + 1, 9,  '09:00 – 10:00', 'confirmed'),
('d1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 1, 10, '10:00 – 11:00', 'pending'),
-- Day after tomorrow
('d2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', CURRENT_DATE + 2, 11, '11:00 – 12:00', 'confirmed'),
-- Today's bookings
('d3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', CURRENT_DATE,     14, '14:00 – 15:00', 'confirmed'),
-- More bookings
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', CURRENT_DATE + 3, 15, '15:00 – 16:00', 'pending'),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', CURRENT_DATE + 1, 12, '12:00 – 13:00', 'confirmed'),
('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', CURRENT_DATE + 2, 10, '10:00 – 11:00', 'pending')
ON CONFLICT (id) DO NOTHING;


-- ==========================================
-- 3️⃣ AUTOMAGIC USER PROFILE CREATION (BONUS)
-- ==========================================
-- This trigger ensures that when a new user signs up via Supabase Auth,
-- a row is automatically inserted into `public.profiles` for them.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To prevent errors if you run the script multiple times
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
