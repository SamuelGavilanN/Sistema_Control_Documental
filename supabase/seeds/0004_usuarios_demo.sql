-- ============================================
-- USUARIOS DEMO para desarrollo
-- Password de los 3: demo1234
-- ============================================

INSERT INTO public.usuarios (nombre, apellido, usuario, password, rol, activo) VALUES
  ('Owner',   'Demo', 'owner',   'demo1234', 'Owner',   true),
  ('Admin',   'Demo', 'admin',   'demo1234', 'Admin',   true),
  ('Auditor', 'Demo', 'auditor', 'demo1234', 'Auditor', true);
