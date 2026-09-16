-- supabase/migrations/0005_rls_temporal_authenticated.sql
--
-- FASE 3 - RLS temporal.
-- Habilita RLS en las 25 tablas y agrega política permisiva `authenticated_allow_all`.
-- Esta política se REEMPLAZA por las reales en Fase 4.
--
-- Ejecutar en DEV (docxentra-dev) mientras migramos los módulos.

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'conductores', 'ed01_empaques', 'ed04_lote_empaques', 'ed04_lotes',
    'frecuencias', 'locales', 'patentes', 'pedidos_especiales',
    'sd01_bultos', 'sd01_documento_locales', 'sd01_documentos',
    'sd04_locales_analisis', 'ticket_notificaciones', 'ticket_respuestas',
    'tickets', 'usuario_favoritos', 'usuario_permisos', 'usuarios',
    'ut02_capturas', 'ut02_inventario', 'ut02_inventario_boms',
    'ut02_tarea_empaques', 'ut02_tareas', 'wms_actas_cd01',
    'wms_carga_consolidada'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_allow_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "authenticated_allow_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Verificar
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;