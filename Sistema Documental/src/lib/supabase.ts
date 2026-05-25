import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jeabsljwaghhyxjpaslv.supabase.co';
const supabaseKey = 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G';

export const supabase = createClient(supabaseUrl, supabaseKey);