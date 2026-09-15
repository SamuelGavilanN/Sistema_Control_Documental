// src/lib/supabase.ts
//
// Cliente de Supabase. Lee las credenciales desde variables de entorno
// (REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY).
//
// En local / Codespaces: usa los valores de .env.local (apunta a DEV).
// En Vercel Preview: usa los valores de Preview (apunta a DEV).
// En Vercel Production: usa los valores de Production (apunta a PROD).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('[supabase] Falta REACT_APP_SUPABASE_URL. Revisá .env.local');
}
if (!supabaseKey) {
  throw new Error('[supabase] Falta REACT_APP_SUPABASE_ANON_KEY. Revisá .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Log solo en desarrollo para saber a dónde apunta
if (process.env.NODE_ENV === 'development') {
  console.log('[supabase] Apuntando a:', supabaseUrl);
}
