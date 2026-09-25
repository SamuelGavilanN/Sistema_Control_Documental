-- supabase/migrations/0006_rls_real_por_rol.sql
--
-- FASE 4: RLS real basado en rol del JWT.
-- Reemplaza las políticas permisivas `authenticated_allow_all` por
-- políticas que verifican el rol del usuario vía public.auth_rol().
--
-- Roles válidos: 'Owner', 'Admin', 'Lider', 'Portico'
--
-- Aplicar en dev (docxentra-dev) → probar → aplicar en prod.

-- ============================================
-- Función auxiliar
-- ============================================
CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'rol'),
    (auth.jwt() -> 'raw_user_meta_data' ->> 'rol')
  )
$$;

-- ============================================
-- Nivel 1: Maestras (Owner, Admin para escritura)
-- ============================================
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'locales','conductores','patentes','frecuencias',
    'sd04_locales_analisis','usuario_permisos'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_allow_all" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.auth_rol() IN (''Owner'',''Admin''))', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.auth_rol() IN (''Owner'',''Admin'')) WITH CHECK (public.auth_rol() IN (''Owner'',''Admin''))', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.auth_rol() IN (''Owner'',''Admin''))', t, t);
  END LOOP;
END $$;

-- ============================================
-- Usuarios (DELETE solo Owner)
-- ============================================
DROP POLICY IF EXISTS "anon_select_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "anon_insert_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "authenticated_select_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "authenticated_allow_all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.auth_rol() IN ('Owner','Admin'));
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated USING (public.auth_rol() IN ('Owner','Admin')) WITH CHECK (public.auth_rol() IN ('Owner','Admin'));
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated USING (public.auth_rol() = 'Owner');

-- ============================================
-- Nivel B1: uso operativo general (INSERT/UPDATE todos)
-- ============================================
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'tickets','ticket_notificaciones','ticket_respuestas',
    'pedidos_especiales','usuario_favoritos'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_allow_all" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.auth_rol() IN (''Owner'',''Admin''))', t, t);
  END LOOP;
END $$;

-- ============================================
-- Niveles B2 + B3 (Owner, Admin, Lider)
-- ============================================
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'ed01_empaques','ed04_lotes','ed04_lote_empaques',
    'sd01_documentos','sd01_documento_locales','sd01_bultos',
    'wms_actas_cd01','wms_carga_consolidada',
    'ut02_tareas','ut02_capturas','ut02_inventario',
    'ut02_inventario_boms','ut02_tarea_empaques'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_allow_all" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.auth_rol() IN (''Owner'',''Admin'',''Lider''))', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.auth_rol() IN (''Owner'',''Admin'',''Lider'')) WITH CHECK (public.auth_rol() IN (''Owner'',''Admin'',''Lider''))', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.auth_rol() IN (''Owner'',''Admin''))', t, t);
  END LOOP;
END $$;
