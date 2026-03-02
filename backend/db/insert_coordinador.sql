-- Insertar nuevo coordinador para prácticas
INSERT INTO coordinador (nombre, codigo_coordinador, contrasenia_coord, correo) 
VALUES 
  ('María Fernanda López', 'COORD-002', 'Admin123456', 'mariaf.lopez@univalle.edu.co')
ON CONFLICT (codigo_coordinador) DO NOTHING;
