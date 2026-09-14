# Plan de Migración a Supabase Auth

> Documento de diseño para migrar Docxentra del login custom
> (tabla `usuarios` + password en texto plano) a Supabase Auth.
>
> **Estado:** Diseño aprobado · **Aplica a:** docxentra-dev primero, docxentra-prod después
> **Última actualización:** 2026-09-14

---

## 1. Objetivo

Reemplazar el sistema de autenticación actual por Supabase Auth para lograr:

- Passwords hasheados (bcrypt) en lugar de texto plano.
- JWT real por usuario, no la anon key.
- RLS basado en `auth.uid()` y roles, no en `USING true`.
- Posibilidad de cerrar sesión, refrescar tokens y auditar accesos.

---

## 2. Estado actual

### 2.1. Login
- `Login.tsx` envía `usuario` + `password` en texto plano a la tabla `usuarios`.
- Comparación de password en texto plano en el frontend (`auth.ts`).
- Se guarda el usuario completo en `localStorage`.
- **Sin JWT real.** Todas las requests usan la anon key hardcodeada.

### 2.2. Base de datos
- Tabla `usuarios` con 8 columnas:
  - `id uuid PK`, `nombre`, `apellido`, `usuario`, `password`, `rol`, `activo`, `creado_en`
- **33 usuarios** en prod, de los cuales **10-15 activos**.

### 2.3. Roles actuales (prod)
| Rol | Cantidad |
|---|---|
| Admin | 17 |
| Administrativo | 5 |
| Auditor | 4 |
| Portico | 4 |
| Lider | 2 |
| Owner | 1 |

### 2.4. RLS
- 10/25 tablas con RLS activo, todas con políticas `USING (true)`.
- 15/25 tablas sin RLS.
- **Ninguna política usa `auth.uid()`.**

### 2.5. Archivos con credenciales hardcodeadas
- **20 archivos** contienen la URL + anon key de prod.
- **11 archivos** hacen `fetch(API_URL + ...)` directo.

---

## 3. Estrategia elegida: Wipe & Recreate

**En lugar de migrar usuarios existentes, se van a eliminar y recrear con Auth.**

### 3.1. Justificación
- Passwords están en texto plano → no se pueden migrar a Auth (bcrypt).
- Solo 10-15 usuarios activos.
- El negocio acepta recrear usuarios manualmente.
- Elimina toda la complejidad de mapeo de IDs legacy.

### 3.2. Proceso de recreación
1. Se eliminan todos los usuarios de `usuarios` **y** de `auth.users`.
2. Se crean nuevos usuarios en Supabase Auth (vía script local con `service_role`).
3. Se inserta el registro espejo en `usuarios` con `auth_user_id`.
4. Se asigna password temporal conocida.
5. Se comunica a cada usuario su nueva credencial vía mesa de ayuda.
6. Usuario entra, cambia password (implementación futura).

---

## 4. Roles finales

| Rol | Acceso |
|---|---|
| **Owner** | Total. Único que puede gestionar usuarios Admin/Owner. |
| **Admin** | Casi total. No puede borrar Owners. |
| **Lider** | Operativo. Escritura en transacciones SD, lectura general. |
| **Portico** | Limitado. Solo ED03 (BT Portico) + lectura de catálogos. |

### Mapeo de roles viejos (si no se aplica wipe)
| Rol viejo | Rol nuevo |
|---|---|
| Owner | Owner |
| Admin | Admin |
| Administrativo | **Admin** |
| Auditor | **Admin** |
| Lider | Lider |
| Portico | Portico |

> Con wipe & recreate, esta tabla queda solo como referencia histórica.

---

## 5. Modelo de datos

### 5.1. Cambios en `public.usuarios`

```sql
ALTER TABLE public.usuarios
  ADD COLUMN auth_user_id uuid UNIQUE
  REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);

-- Se mantiene `id uuid PK` para compatibilidad con FKs existentes.
-- La columna `password` se elimina después del cutover.
-- Se mantienen `nombre`, `apellido`, `usuario`, `rol`, `activo`.