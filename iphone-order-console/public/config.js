// ============================================================
// PUBLIC config only. The anon key below is DESIGNED to be public
// (it's the "publishable" key) — it has no power on its own because
// every table it touches is locked down with Row Level Security (see
// schema.sql). NEVER put the Supabase "service_role" key here or in
// any frontend file — that key bypasses RLS entirely.
// ============================================================
export const SUPABASE_URL = "https://egmedvnahdprvnozoblp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_OBWp3EqN1c9cga57bpBlhg_ScVL3BHP";
