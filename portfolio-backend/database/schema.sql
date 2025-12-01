-- Portfolio Database Schema for Supabase

-- 1. Profile table
CREATE TABLE IF NOT EXISTS profile (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  description TEXT,
  photo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default profile data
INSERT INTO profile (name, email, role, description) VALUES
('Salomé Rodríguez Moscoso', 
 'salomerodriguezmoscoso@gmail.com', 
 'Estudiante y desarrolladora en formación',
 'Desarrolladora en crecimiento con experiencia en proyectos académicos y personales utilizando React, Node.js, PostgreSQL y Supabase. Interesada en diseño web, interfaces usables y accesibles, dashboards y sistemas de gestión.');

-- 2. Skills table
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default skills
INSERT INTO skills (name, category) VALUES
('React', 'Frontend'),
('Bootstrap', 'Frontend'),
('Tailwind', 'Frontend'),
('Consumo de APIs', 'Frontend'),
('Componentización', 'Frontend'),
('Animaciones (Framer Motion)', 'Frontend'),
('Diseño de dashboards', 'Frontend'),
('Node.js', 'Backend'),
('Express', 'Backend'),
('JWT', 'Backend'),
('Manejo de rutas y controladores', 'Backend'),
('Django (bases conceptuales)', 'Backend'),
('PostgreSQL', 'Base de datos'),
('Supabase', 'Base de datos'),
('Modelado de tablas y triggers', 'Base de datos'),
('Construcción de sistemas CRUD', 'Base de datos'),
('Acompañamiento académico y socioeducativo', 'Otras'),
('Elaboración de informes, relatorías y fichas', 'Otras'),
('Manejo de Git y GitHub', 'Otras');

-- 3. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image TEXT,
  link TEXT,
  technologies TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default projects
INSERT INTO projects (title, description, technologies, link) VALUES
('Sistema académico con RA Manager', 
 'Sistema integral de gestión de Resultados de Aprendizaje (RAs) para instituciones educativas. Plataforma completa que permite a coordinadores, docentes y estudiantes gestionar asignatars, actividades, calificaciones y realizar seguimiento detallado de RAs con visualizaciones en tiempo real.',
 ARRAY['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Django', 'Bootstrap'],
 'https://github.com/Salome98342/RA_Final'),
('Dashboard con React', 
 'Dashboard interactivo con gráficas en tiempo real, análisis de datos y visualizaciones modernas. Incluye métricas de desempeño, reportes personalizados y diseño responsivo.',
 ARRAY['React', 'Chart.js', 'Bootstrap', 'Axios'],
 '#'),
('App de tienda escolar (Maida''s)', 
 'Sistema de gestión para tienda escolar con módulos de ventas, créditos, productos y clientes. Desarrollo de módulos de ventas, créditos, productos y clientes con React + Node + PostgreSQL.',
 ARRAY['React', 'Node.js', 'Express', 'PostgreSQL'],
 '#');

-- 4. Messages table (for contact form)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for security
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for read access (public can read)
CREATE POLICY "Enable read access for all users" ON profile FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON skills FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);

-- Create policy for messages (anyone can insert)
CREATE POLICY "Enable insert for all users" ON messages FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
