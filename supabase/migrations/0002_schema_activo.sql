--
-- PostgreSQL database dump
--

\restrict sYwJgAYG44mcFklJpL48UOy1jtWeGALr0ONxghIo1tzlNrBFmauyQLpjXSTTXhb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Ubuntu 17.11-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: generar_id_documento_sd(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_id_documento_sd(prefijo text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  secuencia INT;
  anio TEXT;
  mes TEXT;
  dia TEXT;
  correlativo TEXT;
BEGIN
  anio := to_char(now(), 'YY');
  mes := to_char(now(), 'MM');
  dia := to_char(now(), 'DD');
  
  -- Obtener el siguiente número de secuencia (crea la secuencia si no existe)
  PERFORM 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'sd01_documentos_id_seq';
  IF NOT FOUND THEN
    CREATE SEQUENCE public.sd01_documentos_id_seq;
  END IF;
  
  SELECT nextval('public.sd01_documentos_id_seq') INTO secuencia;
  correlativo := LPAD(secuencia::TEXT, 6, '0');
  
  RETURN prefijo || anio || mes || dia || correlativo;
END;
$$;


--
-- Name: generar_id_documento_sd01(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_id_documento_sd01() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  fecha TEXT;
  correlativo INTEGER;
BEGIN
  fecha := TO_CHAR(NOW(), 'DDMMYYYY');
  SELECT COUNT(*) + 1 INTO correlativo FROM sd01_documentos
  WHERE id_documento LIKE 'SD01-' || fecha || '%';
  RETURN 'SD01-' || fecha || '-' || LPAD(correlativo::TEXT, 4, '0');
END;
$$;


--
-- Name: generar_numero_auditoria(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_numero_auditoria() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  fecha TEXT;
  ultimo_num INTEGER;
BEGIN
  fecha := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_tarea, '^AUD' || fecha, ''), '')::INTEGER), 0) + 1
  INTO ultimo_num FROM ad_auditorias WHERE numero_tarea LIKE 'AUD' || fecha || '%';
  RETURN 'AUD' || fecha || LPAD(ultimo_num::TEXT, 3, '0');
END;
$$;


--
-- Name: generar_numero_devolucion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_numero_devolucion() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  fecha TEXT;
  correlativo INTEGER;
  nuevo_numero TEXT;
BEGIN
  fecha := TO_CHAR(NOW(), 'DDMMYYYY');
  
  SELECT COUNT(*) + 1 INTO correlativo
  FROM rd01_devoluciones
  WHERE id_pallet LIKE 'DEV' || fecha || '%';
  
  nuevo_numero := 'DEV' || fecha || LPAD(correlativo::TEXT, 6, '0');
  
  RETURN nuevo_numero;
END;
$$;


--
-- Name: generar_numero_empaque(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_numero_empaque() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  fecha TEXT;
  ultimo_num INTEGER;
  numero_empaque TEXT;
BEGIN
  fecha := TO_CHAR(CURRENT_DATE, 'DDMMYY');
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(e.numero_empaque, '^DIR' || fecha, ''), '')::INTEGER), 0) + 1
  INTO ultimo_num
  FROM ed01_empaques e
  WHERE e.numero_empaque LIKE 'DIR' || fecha || '%';
  
  numero_empaque := 'DIR' || fecha || LPAD(ultimo_num::TEXT, 5, '0');
  
  RETURN numero_empaque;
END;
$$;


--
-- Name: generar_numero_pallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_numero_pallet() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  fecha TEXT;
  correlativo INTEGER;
  nuevo_numero TEXT;
BEGIN
  fecha := TO_CHAR(NOW(), 'DDMMYYYY');
  
  SELECT COUNT(*) + 1 INTO correlativo
  FROM rd01_pallets
  WHERE id_pallet LIKE 'PAL' || fecha || '%';
  
  nuevo_numero := 'PAL' || fecha || LPAD(correlativo::TEXT, 6, '0');
  
  RETURN nuevo_numero;
END;
$$;


--
-- Name: obtener_siguiente_empaque(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_siguiente_empaque() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_empaque TEXT;
  v_lote_id UUID;
  v_empaque_id UUID;
BEGIN
  -- Buscar lote activo
  SELECT id INTO v_lote_id FROM ed04_lotes WHERE activo = true LIMIT 1;
  
  IF v_lote_id IS NULL THEN
    RAISE EXCEPTION 'No hay lote activo';
  END IF;
  
  -- Buscar siguiente empaque no usado
  SELECT id, numero_empaque INTO v_empaque_id, v_empaque
  FROM ed04_lote_empaques
  WHERE lote_id = v_lote_id AND usado = false
  ORDER BY creado_en ASC
  LIMIT 1;
  
  IF v_empaque_id IS NULL THEN
    RAISE EXCEPTION 'No hay empaques disponibles en el lote';
  END IF;
  
  -- Marcar como usado
  UPDATE ed04_lote_empaques SET usado = true, usado_en = NOW() WHERE id = v_empaque_id;
  
  -- Actualizar contador
  UPDATE ed04_lotes SET empaques_usados = empaques_usados + 1 WHERE id = v_lote_id;
  
  RETURN v_empaque;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: conductores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conductores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    numero_documento text,
    telefono text,
    empresa text,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ed01_empaques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ed01_empaques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estado character varying(20) DEFAULT 'Finalizado'::character varying,
    numero_tarea character varying(30) NOT NULL,
    numero_empaque character varying(20) NOT NULL,
    codigo_local character varying(10) NOT NULL,
    nombre_local character varying(200) NOT NULL,
    cantidad_bultos integer DEFAULT 0 NOT NULL,
    cantidad_pallet integer DEFAULT 0 NOT NULL,
    observacion text,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now(),
    modificado_por uuid,
    modificado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT ed01_empaques_estado_check CHECK (((estado)::text = ANY ((ARRAY['Editando'::character varying, 'Finalizado'::character varying, 'Cancelado'::character varying])::text[])))
);


--
-- Name: ed04_lote_empaques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ed04_lote_empaques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lote_id uuid,
    numero_empaque text NOT NULL,
    usado boolean DEFAULT false,
    usado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ed04_lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ed04_lotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_lote text NOT NULL,
    fecha_registro date DEFAULT CURRENT_DATE,
    usuario_registro uuid,
    total_empaques integer DEFAULT 0,
    empaques_usados integer DEFAULT 0,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: frecuencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frecuencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dia_carga text NOT NULL,
    drop_local text,
    codigo_local text NOT NULL,
    nombre_local text,
    cantidad_estimada_despacho integer DEFAULT 0,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_local character varying(10) NOT NULL,
    nombre_local character varying(200) NOT NULL,
    drop_local character varying(50),
    zona character varying(100),
    correo character varying(255),
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: patentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patentes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_patente text NOT NULL,
    tipo_vehiculo text DEFAULT 'Otro'::text,
    cantidad_sellos integer DEFAULT 1,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: pedidos_especiales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos_especiales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo_pedido text NOT NULL,
    numero_tarea text NOT NULL,
    codigo_local text,
    nombre_local text,
    fecha_pedido date DEFAULT CURRENT_DATE NOT NULL,
    estado text DEFAULT 'Pendiente'::text NOT NULL,
    etiqueta_generada boolean DEFAULT false,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: sd01_bultos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd01_bultos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid,
    documento_id text,
    origen_carga text NOT NULL,
    tipo_documento text,
    numero_documento text,
    cantidad integer DEFAULT 0 NOT NULL,
    observacion text,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: sd01_documento_locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd01_documento_locales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_id text NOT NULL,
    codigo_local text NOT NULL,
    nombre_local text,
    fecha_entrega date,
    hora_entrega text,
    sello_trasero text,
    cantidad_pallet integer DEFAULT 0,
    total_carga integer DEFAULT 0,
    creado_en timestamp with time zone DEFAULT now(),
    cantidad_solicitada integer DEFAULT 0,
    modificado_por text,
    modificado_en timestamp with time zone
);


--
-- Name: sd01_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd01_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_documento text NOT NULL,
    conductor_id uuid,
    patente_principal_id uuid,
    patente_adicional_id uuid,
    fecha_programacion date,
    sello_lateral text,
    sello_adicional text,
    administrativo text,
    observaciones text,
    estado text DEFAULT 'Pendiente'::text,
    asignado_a uuid,
    iniciado_en timestamp with time zone,
    finalizado_en timestamp with time zone,
    cancelado_en timestamp with time zone,
    creado_por uuid,
    modificado_por text,
    creado_en timestamp with time zone DEFAULT now(),
    modificado_en timestamp with time zone,
    fecha_inicio timestamp with time zone
);


--
-- Name: sd04_locales_analisis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd04_locales_analisis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_local text NOT NULL,
    nombre_local text,
    drop_local text,
    zona text,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ticket_notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_notificaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    usuario_id uuid,
    visto boolean DEFAULT false,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ticket_respuestas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_respuestas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    mensaje text NOT NULL,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_ticket character varying(20) NOT NULL,
    area character varying(30) DEFAULT 'Portico'::character varying NOT NULL,
    tipo_problema character varying(50) NOT NULL,
    prioridad character varying(20) DEFAULT 'Media'::character varying,
    numero_empaque character varying(20),
    descripcion text NOT NULL,
    estado character varying(20) DEFAULT 'Abierto'::character varying,
    creado_por uuid,
    asignado_a uuid,
    creado_en timestamp with time zone DEFAULT now(),
    resuelto_en timestamp with time zone,
    cerrado_en timestamp with time zone
);


--
-- Name: usuario_favoritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_favoritos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    transaccion_id text NOT NULL,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: usuario_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_permisos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    transaccion_id character varying(30) NOT NULL,
    activo boolean DEFAULT true
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    usuario character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    rol character varying(50) NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['Auditor'::character varying, 'Portico'::character varying, 'Lider'::character varying, 'Administrativo'::character varying, 'Admin'::character varying, 'Owner'::character varying])::text[])))
);


--
-- Name: ut02_capturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut02_capturas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tarea_id uuid,
    bom_sku text NOT NULL,
    cantidad_sistema integer DEFAULT 0,
    capturado_por uuid,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ut02_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut02_inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_empaque text NOT NULL,
    cod_destino text,
    destino text,
    estado text DEFAULT 'Pendiente'::text,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ut02_inventario_boms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut02_inventario_boms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empaque_id uuid,
    bom_sku text NOT NULL,
    cantidad_maxima integer DEFAULT 1,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ut02_tarea_empaques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut02_tarea_empaques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tarea_id uuid,
    numero_empaque text NOT NULL,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ut02_tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ut02_tareas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_tarea text NOT NULL,
    cod_local text,
    local text,
    estado text DEFAULT 'Pendiente'::text,
    total_bultos_sistema integer DEFAULT 0,
    total_bultos_revisados integer DEFAULT 0,
    auditor uuid,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now(),
    iniciado_en timestamp with time zone,
    finalizado_en timestamp with time zone
);


--
-- Name: wms_actas_cd01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wms_actas_cd01 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    acta text NOT NULL,
    cod_local text NOT NULL,
    cantidad integer DEFAULT 0,
    creado_en timestamp with time zone DEFAULT now(),
    fecha_programacion date
);


--
-- Name: wms_carga_consolidada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wms_carga_consolidada (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drop_local text NOT NULL,
    cantidad integer DEFAULT 0,
    actualizado_en timestamp with time zone DEFAULT now()
);


--
-- Name: ed01_empaques ed01_empaques_numero_empaque_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed01_empaques
    ADD CONSTRAINT ed01_empaques_numero_empaque_key UNIQUE (numero_empaque);


--
-- Name: ed01_empaques ed01_empaques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed01_empaques
    ADD CONSTRAINT ed01_empaques_pkey PRIMARY KEY (id);


--
-- Name: ed04_lote_empaques ed04_lote_empaques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed04_lote_empaques
    ADD CONSTRAINT ed04_lote_empaques_pkey PRIMARY KEY (id);


--
-- Name: ed04_lotes ed04_lotes_id_lote_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed04_lotes
    ADD CONSTRAINT ed04_lotes_id_lote_key UNIQUE (id_lote);


--
-- Name: ed04_lotes ed04_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed04_lotes
    ADD CONSTRAINT ed04_lotes_pkey PRIMARY KEY (id);


--
-- Name: frecuencias frecuencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frecuencias
    ADD CONSTRAINT frecuencias_pkey PRIMARY KEY (id);


--
-- Name: locales locales_codigo_local_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales
    ADD CONSTRAINT locales_codigo_local_key UNIQUE (codigo_local);


--
-- Name: locales locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales
    ADD CONSTRAINT locales_pkey PRIMARY KEY (id);


--
-- Name: pedidos_especiales pedidos_especiales_numero_tarea_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_especiales
    ADD CONSTRAINT pedidos_especiales_numero_tarea_key UNIQUE (numero_tarea);


--
-- Name: pedidos_especiales pedidos_especiales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_especiales
    ADD CONSTRAINT pedidos_especiales_pkey PRIMARY KEY (id);


--
-- Name: sd01_bultos sd01_bultos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_bultos
    ADD CONSTRAINT sd01_bultos_pkey PRIMARY KEY (id);


--
-- Name: conductores sd01_conductores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conductores
    ADD CONSTRAINT sd01_conductores_pkey PRIMARY KEY (id);


--
-- Name: sd01_documento_locales sd01_documento_locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documento_locales
    ADD CONSTRAINT sd01_documento_locales_pkey PRIMARY KEY (id);


--
-- Name: sd01_documentos sd01_documentos_id_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_id_documento_key UNIQUE (id_documento);


--
-- Name: sd01_documentos sd01_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_pkey PRIMARY KEY (id);


--
-- Name: patentes sd01_patentes_numero_patente_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patentes
    ADD CONSTRAINT sd01_patentes_numero_patente_key UNIQUE (numero_patente);


--
-- Name: patentes sd01_patentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patentes
    ADD CONSTRAINT sd01_patentes_pkey PRIMARY KEY (id);


--
-- Name: sd04_locales_analisis sd04_locales_analisis_codigo_local_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd04_locales_analisis
    ADD CONSTRAINT sd04_locales_analisis_codigo_local_key UNIQUE (codigo_local);


--
-- Name: sd04_locales_analisis sd04_locales_analisis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd04_locales_analisis
    ADD CONSTRAINT sd04_locales_analisis_pkey PRIMARY KEY (id);


--
-- Name: ticket_notificaciones ticket_notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_notificaciones
    ADD CONSTRAINT ticket_notificaciones_pkey PRIMARY KEY (id);


--
-- Name: ticket_respuestas ticket_respuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_respuestas
    ADD CONSTRAINT ticket_respuestas_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_numero_ticket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_numero_ticket_key UNIQUE (numero_ticket);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: usuario_favoritos usuario_favoritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_favoritos
    ADD CONSTRAINT usuario_favoritos_pkey PRIMARY KEY (id);


--
-- Name: usuario_favoritos usuario_favoritos_usuario_id_transaccion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_favoritos
    ADD CONSTRAINT usuario_favoritos_usuario_id_transaccion_id_key UNIQUE (usuario_id, transaccion_id);


--
-- Name: usuario_permisos usuario_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_pkey PRIMARY KEY (id);


--
-- Name: usuario_permisos usuario_permisos_usuario_id_transaccion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_usuario_id_transaccion_id_key UNIQUE (usuario_id, transaccion_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_usuario_key UNIQUE (usuario);


--
-- Name: ut02_capturas ut02_capturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_capturas
    ADD CONSTRAINT ut02_capturas_pkey PRIMARY KEY (id);


--
-- Name: ut02_inventario_boms ut02_inventario_boms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_inventario_boms
    ADD CONSTRAINT ut02_inventario_boms_pkey PRIMARY KEY (id);


--
-- Name: ut02_inventario ut02_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_inventario
    ADD CONSTRAINT ut02_inventario_pkey PRIMARY KEY (id);


--
-- Name: ut02_tarea_empaques ut02_tarea_empaques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tarea_empaques
    ADD CONSTRAINT ut02_tarea_empaques_pkey PRIMARY KEY (id);


--
-- Name: ut02_tareas ut02_tareas_numero_tarea_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tareas
    ADD CONSTRAINT ut02_tareas_numero_tarea_key UNIQUE (numero_tarea);


--
-- Name: ut02_tareas ut02_tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tareas
    ADD CONSTRAINT ut02_tareas_pkey PRIMARY KEY (id);


--
-- Name: wms_actas_cd01 wms_actas_cd01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wms_actas_cd01
    ADD CONSTRAINT wms_actas_cd01_pkey PRIMARY KEY (id);


--
-- Name: wms_carga_consolidada wms_carga_consolidada_drop_local_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wms_carga_consolidada
    ADD CONSTRAINT wms_carga_consolidada_drop_local_key UNIQUE (drop_local);


--
-- Name: wms_carga_consolidada wms_carga_consolidada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wms_carga_consolidada
    ADD CONSTRAINT wms_carga_consolidada_pkey PRIMARY KEY (id);


--
-- Name: idx_ed01_creado_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed01_creado_en ON public.ed01_empaques USING btree (creado_en DESC);


--
-- Name: idx_ed01_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed01_estado ON public.ed01_empaques USING btree (estado);


--
-- Name: idx_ed01_numero_empaque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed01_numero_empaque ON public.ed01_empaques USING btree (numero_empaque);


--
-- Name: idx_ed04_lote_empaques_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed04_lote_empaques_lote ON public.ed04_lote_empaques USING btree (lote_id);


--
-- Name: idx_ed04_lote_empaques_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed04_lote_empaques_numero ON public.ed04_lote_empaques USING btree (numero_empaque);


--
-- Name: idx_ed04_lote_empaques_usado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed04_lote_empaques_usado ON public.ed04_lote_empaques USING btree (usado);


--
-- Name: idx_ed04_lotes_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ed04_lotes_activo ON public.ed04_lotes USING btree (activo);


--
-- Name: idx_pedidos_especiales_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_especiales_estado ON public.pedidos_especiales USING btree (estado);


--
-- Name: idx_pedidos_especiales_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_especiales_fecha ON public.pedidos_especiales USING btree (fecha_pedido);


--
-- Name: idx_sd01_bultos_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_bultos_documento_id ON public.sd01_bultos USING btree (documento_id);


--
-- Name: idx_sd01_bultos_local_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_bultos_local_id ON public.sd01_bultos USING btree (local_id);


--
-- Name: idx_sd01_conductores_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_conductores_activo ON public.conductores USING btree (activo);


--
-- Name: idx_sd01_documento_locales_documento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documento_locales_documento ON public.sd01_documento_locales USING btree (documento_id);


--
-- Name: idx_sd01_documentos_asignado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documentos_asignado ON public.sd01_documentos USING btree (asignado_a);


--
-- Name: idx_sd01_documentos_conductor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documentos_conductor ON public.sd01_documentos USING btree (conductor_id);


--
-- Name: idx_sd01_documentos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documentos_estado ON public.sd01_documentos USING btree (estado);


--
-- Name: idx_sd01_documentos_id_documento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documentos_id_documento ON public.sd01_documentos USING btree (id_documento);


--
-- Name: idx_sd01_documentos_patente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_documentos_patente ON public.sd01_documentos USING btree (patente_principal_id);


--
-- Name: idx_sd01_patentes_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd01_patentes_activo ON public.patentes USING btree (activo);


--
-- Name: idx_usuario_favoritos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_favoritos_usuario ON public.usuario_favoritos USING btree (usuario_id);


--
-- Name: idx_ut02_capturas_tarea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_capturas_tarea ON public.ut02_capturas USING btree (tarea_id);


--
-- Name: idx_ut02_inventario_boms_empaque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_inventario_boms_empaque ON public.ut02_inventario_boms USING btree (empaque_id);


--
-- Name: idx_ut02_inventario_empaque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_inventario_empaque ON public.ut02_inventario USING btree (numero_empaque);


--
-- Name: idx_ut02_tarea_empaques_tarea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_tarea_empaques_tarea ON public.ut02_tarea_empaques USING btree (tarea_id);


--
-- Name: idx_ut02_tareas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_tareas_estado ON public.ut02_tareas USING btree (estado);


--
-- Name: idx_ut02_tareas_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ut02_tareas_numero ON public.ut02_tareas USING btree (numero_tarea);


--
-- Name: ed01_empaques ed01_empaques_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed01_empaques
    ADD CONSTRAINT ed01_empaques_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: ed01_empaques ed01_empaques_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed01_empaques
    ADD CONSTRAINT ed01_empaques_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.usuarios(id);


--
-- Name: ed04_lote_empaques ed04_lote_empaques_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed04_lote_empaques
    ADD CONSTRAINT ed04_lote_empaques_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.ed04_lotes(id) ON DELETE CASCADE;


--
-- Name: ed04_lotes ed04_lotes_usuario_registro_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ed04_lotes
    ADD CONSTRAINT ed04_lotes_usuario_registro_fkey FOREIGN KEY (usuario_registro) REFERENCES public.usuarios(id);


--
-- Name: sd01_bultos sd01_bultos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_bultos
    ADD CONSTRAINT sd01_bultos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: sd01_bultos sd01_bultos_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_bultos
    ADD CONSTRAINT sd01_bultos_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.sd01_documento_locales(id) ON DELETE CASCADE;


--
-- Name: sd01_documento_locales sd01_documento_locales_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documento_locales
    ADD CONSTRAINT sd01_documento_locales_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.sd01_documentos(id_documento);


--
-- Name: sd01_documentos sd01_documentos_asignado_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id);


--
-- Name: sd01_documentos sd01_documentos_conductor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_conductor_id_fkey FOREIGN KEY (conductor_id) REFERENCES public.conductores(id);


--
-- Name: sd01_documentos sd01_documentos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: sd01_documentos sd01_documentos_patente_adicional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_patente_adicional_id_fkey FOREIGN KEY (patente_adicional_id) REFERENCES public.patentes(id);


--
-- Name: sd01_documentos sd01_documentos_patente_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd01_documentos
    ADD CONSTRAINT sd01_documentos_patente_principal_id_fkey FOREIGN KEY (patente_principal_id) REFERENCES public.patentes(id);


--
-- Name: ticket_notificaciones ticket_notificaciones_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_notificaciones
    ADD CONSTRAINT ticket_notificaciones_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_notificaciones ticket_notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_notificaciones
    ADD CONSTRAINT ticket_notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: ticket_respuestas ticket_respuestas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_respuestas
    ADD CONSTRAINT ticket_respuestas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: ticket_respuestas ticket_respuestas_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_respuestas
    ADD CONSTRAINT ticket_respuestas_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_asignado_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id);


--
-- Name: tickets tickets_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: usuario_favoritos usuario_favoritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_favoritos
    ADD CONSTRAINT usuario_favoritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuario_permisos usuario_permisos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: ut02_capturas ut02_capturas_capturado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_capturas
    ADD CONSTRAINT ut02_capturas_capturado_por_fkey FOREIGN KEY (capturado_por) REFERENCES public.usuarios(id);


--
-- Name: ut02_capturas ut02_capturas_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_capturas
    ADD CONSTRAINT ut02_capturas_tarea_id_fkey FOREIGN KEY (tarea_id) REFERENCES public.ut02_tareas(id) ON DELETE CASCADE;


--
-- Name: ut02_inventario_boms ut02_inventario_boms_empaque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_inventario_boms
    ADD CONSTRAINT ut02_inventario_boms_empaque_id_fkey FOREIGN KEY (empaque_id) REFERENCES public.ut02_inventario(id) ON DELETE CASCADE;


--
-- Name: ut02_inventario ut02_inventario_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_inventario
    ADD CONSTRAINT ut02_inventario_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: ut02_tarea_empaques ut02_tarea_empaques_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tarea_empaques
    ADD CONSTRAINT ut02_tarea_empaques_tarea_id_fkey FOREIGN KEY (tarea_id) REFERENCES public.ut02_tareas(id) ON DELETE CASCADE;


--
-- Name: ut02_tareas ut02_tareas_auditor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tareas
    ADD CONSTRAINT ut02_tareas_auditor_fkey FOREIGN KEY (auditor) REFERENCES public.usuarios(id);


--
-- Name: ut02_tareas ut02_tareas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ut02_tareas
    ADD CONSTRAINT ut02_tareas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: ed01_empaques anon_all_ed01; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_ed01 ON public.ed01_empaques TO anon USING (true) WITH CHECK (true);


--
-- Name: ticket_notificaciones anon_all_notificaciones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_notificaciones ON public.ticket_notificaciones TO anon USING (true) WITH CHECK (true);


--
-- Name: usuario_permisos anon_all_permisos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_permisos ON public.usuario_permisos TO anon USING (true) WITH CHECK (true);


--
-- Name: ticket_respuestas anon_all_respuestas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_respuestas ON public.ticket_respuestas TO anon USING (true) WITH CHECK (true);


--
-- Name: tickets anon_all_tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_tickets ON public.tickets TO anon USING (true) WITH CHECK (true);


--
-- Name: locales anon_insert_locales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_locales ON public.locales FOR INSERT TO anon WITH CHECK (true);


--
-- Name: usuarios anon_insert_usuarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_usuarios ON public.usuarios FOR INSERT TO anon WITH CHECK (true);


--
-- Name: locales anon_select_locales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select_locales ON public.locales FOR SELECT TO anon USING (true);


--
-- Name: usuarios anon_select_usuarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select_usuarios ON public.usuarios FOR SELECT TO anon USING (true);


--
-- Name: frecuencias delete_frecuencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_frecuencias ON public.frecuencias FOR DELETE USING (true);


--
-- Name: pedidos_especiales delete_pedidos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_pedidos ON public.pedidos_especiales FOR DELETE USING (true);


--
-- Name: sd04_locales_analisis delete_sd04; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_sd04 ON public.sd04_locales_analisis FOR DELETE USING (true);


--
-- Name: ed01_empaques; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ed01_empaques ENABLE ROW LEVEL SECURITY;

--
-- Name: frecuencias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.frecuencias ENABLE ROW LEVEL SECURITY;

--
-- Name: frecuencias insert_frecuencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_frecuencias ON public.frecuencias FOR INSERT WITH CHECK (true);


--
-- Name: pedidos_especiales insert_pedidos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_pedidos ON public.pedidos_especiales FOR INSERT WITH CHECK (true);


--
-- Name: sd04_locales_analisis insert_sd04; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_sd04 ON public.sd04_locales_analisis FOR INSERT WITH CHECK (true);


--
-- Name: locales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos_especiales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos_especiales ENABLE ROW LEVEL SECURITY;

--
-- Name: sd04_locales_analisis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sd04_locales_analisis ENABLE ROW LEVEL SECURITY;

--
-- Name: frecuencias select_frecuencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_frecuencias ON public.frecuencias FOR SELECT USING (true);


--
-- Name: pedidos_especiales select_pedidos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_pedidos ON public.pedidos_especiales FOR SELECT USING (true);


--
-- Name: sd04_locales_analisis select_sd04; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_sd04 ON public.sd04_locales_analisis FOR SELECT USING (true);


--
-- Name: ticket_notificaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_notificaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_respuestas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_respuestas ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: frecuencias update_frecuencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_frecuencias ON public.frecuencias FOR UPDATE USING (true);


--
-- Name: pedidos_especiales update_pedidos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_pedidos ON public.pedidos_especiales FOR UPDATE USING (true);


--
-- Name: sd04_locales_analisis update_sd04; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_sd04 ON public.sd04_locales_analisis FOR UPDATE USING (true);


--
-- Name: usuario_permisos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuario_permisos ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict sYwJgAYG44mcFklJpL48UOy1jtWeGALr0ONxghIo1tzlNrBFmauyQLpjXSTTXhb

