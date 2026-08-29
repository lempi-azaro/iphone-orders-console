// ============================================================
// PUBLIC config only. The anon key below is DESIGNED to be public
// (it's the "publishable" key) — it has no power on its own because
// every table it touches is locked down with Row Level Security (see
// schema.sql). NEVER put the Supabase "service_role" key here or in
// any frontend file — that key bypasses RLS entirely.
// ============================================================
export const SUPABASE_URL = "https://egmedvnahdprvnozoblp.supabase.co/rest/v1/";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWVkdm5haGRwcnZub3pvYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTQ2MjUsImV4cCI6MjEwMzU3MDYyNX0.mJ1OcpOMafPew8IBnMXass53d05duHOxb6_D9IlqXZ4";
