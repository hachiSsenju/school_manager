/*
  # School Management System Schema

  1. New Tables
    - `schools`
      - `id` (uuid, primary key)
      - `name` (text, school name)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `created_at` (timestamptz)
    
    - `teachers`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `subject` (text)
      - `salary` (numeric)
      - `hire_date` (date)
      - `created_at` (timestamptz)
    
    - `students`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `first_name` (text)
      - `last_name` (text)
      - `date_of_birth` (date)
      - `email` (text)
      - `phone` (text)
      - `parent_name` (text)
      - `parent_phone` (text)
      - `class_level` (text)
      - `enrollment_date` (date)
      - `created_at` (timestamptz)
    
    - `finances`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `type` (text, 'income' or 'expense')
      - `category` (text)
      - `amount` (numeric)
      - `description` (text)
      - `date` (date)
      - `created_at` (timestamptz)
    
    - `report_cards`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `teacher_id` (uuid, foreign key to teachers)
      - `subject` (text)
      - `grade` (numeric)
      - `semester` (text)
      - `year` (text)
      - `comments` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage data
*/

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read schools"
  ON schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert schools"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update schools"
  ON schools FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete schools"
  ON schools FOR DELETE
  TO authenticated
  USING (true);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  subject text,
  salary numeric DEFAULT 0,
  hire_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teachers"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update teachers"
  ON teachers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete teachers"
  ON teachers FOR DELETE
  TO authenticated
  USING (true);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  email text,
  phone text,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  class_level text NOT NULL,
  enrollment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- Create finances table
CREATE TABLE IF NOT EXISTS finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read finances"
  ON finances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert finances"
  ON finances FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update finances"
  ON finances FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete finances"
  ON finances FOR DELETE
  TO authenticated
  USING (true);

-- Create report_cards table
CREATE TABLE IF NOT EXISTS report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  subject text NOT NULL,
  grade numeric NOT NULL CHECK (grade >= 0 AND grade <= 20),
  semester text NOT NULL,
  year text NOT NULL,
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read report_cards"
  ON report_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert report_cards"
  ON report_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update report_cards"
  ON report_cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete report_cards"
  ON report_cards FOR DELETE
  TO authenticated
  USING (true);