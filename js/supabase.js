// js/supabase.js

const SUPABASE_URL = "https://tgomqxlndzbxyqutjird.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_1dhd0GnZLOWT-vPxbbyDDw_hOmkmpBA";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase connected:", window.supabaseClient);