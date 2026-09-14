// scripts/migrate-auth.js
//
// Script administrativo para migrar usuarios al sistema de Supabase Auth.
// Uso EXCLUSIVO local. Requiere la service_role key en .env.local.
//
// Uso:
//   node scripts/migrate-auth.js list              → Lista usuarios actuales
//   node scripts/migrate-auth.js wipe              → Elimina TODOS los usuarios
//   node scripts/migrate-auth.js create-demo       → Crea 4 usuarios demo
//   node scripts/migrate-auth.js verify            → Verifica estado
//
// ⚠️ NUNCA correr 'wipe' en producción sin backup.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ============================================================
// 1. Cargar variables de .env.local manualmente
// ============================================================
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ No existe .env.local');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.REACT_APP_SUPABASE_URL_DEV || env.REACT_APP_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY_DEV;

if (!SUPABASE_URL) {
  console.error('❌ Falta REACT_APP_SUPABASE_URL_DEV o REACT_APP_SUPABASE_URL en .env.local');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY_DEV en .env.local');
  process.exit(1);
}

// ============================================================
// 2. Cliente con service_role (bypasea RLS y auth.admin)
// ============================================================
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================
// 3. Utilidades
// ============================================================
function log(msg) { console.log(msg); }
function ok(msg) { console.log('✅ ' + msg); }
function warn(msg) { console.warn('⚠️  ' + msg); }
function err(msg) { console.error('❌ ' + msg); }

const DEMO_USERS = [
  { usuario: 'owner',   nombre: 'Owner',   apellido: 'Demo', rol: 'Owner',   password: 'Demo1234!' },
  { usuario: 'admin',   nombre: 'Admin',   apellido: 'Demo', rol: 'Admin',   password: 'Demo1234!' },
  { usuario: 'lider',   nombre: 'Lider',   apellido: 'Demo', rol: 'Lider',   password: 'Demo1234!' },
  { usuario: 'portico', nombre: 'Portico', apellido: 'Demo', rol: 'Portico', password: 'Demo1234!' },
];

function emailFor(usuario) {
  return `${usuario}@docxentra.internal`;
}

// ============================================================
// 4. Comando: list
// ============================================================
async function cmdList() {
  log('\n=== USUARIOS EN public.usuarios ===');
  const { data: pubUsers, error: e1 } = await supabase
    .from('usuarios')
    .select('id, usuario, nombre, apellido, rol, activo, auth_user_id')
    .order('usuario');
  if (e1) { err(e1.message); return; }
  console.table(pubUsers || []);

  log('\n=== USUARIOS EN auth.users ===');
  const { data: authData, error: e2 } = await supabase.auth.admin.listUsers();
  if (e2) { err(e2.message); return; }
  const authList = (authData?.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    rol: u.user_metadata?.rol || '-',
    creado: u.created_at?.slice(0, 10),
  }));
  console.table(authList);
}

// ============================================================
// 5. Comando: wipe
// ============================================================
async function cmdWipe() {
  warn('Esto va a ELIMINAR TODOS los usuarios de auth.users Y public.usuarios.');
  warn('Solo se debe correr en docxentra-dev.');
  const confirm = process.argv.includes('--yes') ? 'yes' : null;
  if (confirm !== 'yes') {
    err('Falta el flag --yes. Ejemplo: node scripts/migrate-auth.js wipe --yes');
    process.exit(1);
  }

  log('\n1. Borrando usuario_permisos...');
  const { error: pErr } = await supabase
    .from('usuario_permisos')
    .delete()
    .neq('usuario_id', '00000000-0000-0000-0000-000000000000');
  if (pErr) warn('usuario_permisos: ' + pErr.message);
  else ok('usuario_permisos vaciada');

  log('\n2. Borrando usuario_favoritos...');
  const { error: fErr } = await supabase
    .from('usuario_favoritos')
    .delete()
    .neq('usuario_id', '00000000-0000-0000-0000-000000000000');
  if (fErr) warn('usuario_favoritos: ' + fErr.message);
  else ok('usuario_favoritos vaciada');

  log('\n3. Borrando auth.users...');
  const { data: authData, error: eList } = await supabase.auth.admin.listUsers();
  if (eList) { err(eList.message); return; }
  const users = authData?.users || [];
  log(`   Encontrados: ${users.length} usuarios en Auth`);
  let deleted = 0;
  for (const u of users) {
    const { error: dErr } = await supabase.auth.admin.deleteUser(u.id);
    if (dErr) warn(`No se pudo borrar ${u.email}: ${dErr.message}`);
    else { deleted++; log(`   Borrado: ${u.email}`); }
  }
  ok(`${deleted} usuarios borrados de auth.users`);

  log('\n4. Borrando public.usuarios...');
  const { error: pubErr } = await supabase
    .from('usuarios')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (pubErr) { err('usuarios: ' + pubErr.message); return; }
  ok('public.usuarios vaciada');

  log('\n✅ Wipe completado. Ahora corré: node scripts/migrate-auth.js create-demo');
}

// ============================================================
// 6. Comando: create-demo
// ============================================================
async function cmdCreateDemo() {
  log('\n=== CREANDO USUARIOS DEMO EN AUTH ===\n');
  for (const u of DEMO_USERS) {
    const email = emailFor(u.usuario);
    log(`→ Creando ${u.usuario} (${email}) con rol ${u.rol}...`);

    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        rol: u.rol,
        nombre: u.nombre,
        apellido: u.apellido,
      },
    });
    if (cErr) {
      err(`  Error creando en Auth: ${cErr.message}`);
      continue;
    }
    const authUserId = created.user.id;
    log(`  Auth user creado: ${authUserId}`);

    const { error: pErr } = await supabase.from('usuarios').insert([{
      auth_user_id: authUserId,
      nombre: u.nombre,
      apellido: u.apellido,
      usuario: u.usuario,
      password: 'MIGRATED_TO_AUTH',
      rol: u.rol,
      activo: true,
    }]);
    if (pErr) {
      err(`  Error insertando en public.usuarios: ${pErr.message}`);
      await supabase.auth.admin.deleteUser(authUserId);
      continue;
    }
    ok(`  ${u.usuario} completo`);
  }

  log('\n✅ Usuarios demo creados. Credenciales:');
  DEMO_USERS.forEach((u) => {
    log(`   Usuario: ${u.usuario.padEnd(10)} Password: ${u.password}   Rol: ${u.rol}`);
  });
  log('\n   IMPORTANTE: estos passwords son solo para dev.');
  log('   En producción se generan aleatorios y se comunican por mesa de ayuda.');
}

// ============================================================
// 7. Comando: verify
// ============================================================
async function cmdVerify() {
  log('\n=== VERIFICACIÓN DE ESTADO ===\n');

  const { data: pubUsers } = await supabase
    .from('usuarios')
    .select('usuario, rol, auth_user_id, activo');
  const { data: authData } = await supabase.auth.admin.listUsers();

  log(`Usuarios en public.usuarios:  ${pubUsers?.length || 0}`);
  log(`Usuarios en auth.users:       ${authData?.users?.length || 0}`);

  const conAuth = (pubUsers || []).filter((u) => u.auth_user_id).length;
  log(`Usuarios con auth_user_id:    ${conAuth}`);

  if (pubUsers?.length === authData?.users?.length && conAuth === pubUsers?.length) {
    ok('Estado consistente');
  } else {
    warn('Hay inconsistencias. Revisar con: node scripts/migrate-auth.js list');
  }

  log('\n=== PRUEBA DE LOGIN (admin) ===');
  const { data: signIn, error: sErr } = await supabase.auth.signInWithPassword({
    email: 'admin@docxentra.internal',
    password: 'Demo1234!',
  });
  if (sErr) {
    err('Login falló: ' + sErr.message);
  } else {
    ok('Login exitoso');
    log(`  user.id: ${signIn.user.id}`);
    log(`  user.rol: ${signIn.user.user_metadata?.rol}`);
    log(`  session.access_token: ${signIn.session.access_token.slice(0, 30)}...`);
  }
}

// ============================================================
// 8. Dispatch
// ============================================================
async function main() {
  const cmd = process.argv[2];
  log(`\n🔧 migrate-auth.js — comando: ${cmd || '(ninguno)'}`);
  log(`   Supabase URL: ${SUPABASE_URL}`);

  switch (cmd) {
    case 'list':        await cmdList(); break;
    case 'wipe':        await cmdWipe(); break;
    case 'create-demo': await cmdCreateDemo(); break;
    case 'verify':      await cmdVerify(); break;
    default:
      log('\nUso:');
      log('  node scripts/migrate-auth.js list');
      log('  node scripts/migrate-auth.js wipe --yes');
      log('  node scripts/migrate-auth.js create-demo');
      log('  node scripts/migrate-auth.js verify');
      break;
  }
}

main().catch((e) => { err(e.message); process.exit(1); });