import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.href = "index.html";
document.getElementById("user-email").textContent = session?.user?.email ?? "";
document.getElementById("account-email").textContent = session?.user?.email ?? "";

supabase.auth.onAuthStateChange((event, s) => {
  if (event === "SIGNED_OUT" || !s) window.location.href = "index.html";
});
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ---- Password change (available to every user, this is their own account) ----
document.getElementById("save-password-btn").addEventListener("click", async () => {
  const pwd = document.getElementById("new-password").value;
  const msg = document.getElementById("password-msg");
  if (!pwd) { msg.textContent = "Enter a new password first."; return; }
  if (pwd.length < 8) { msg.textContent = "Password must be at least 8 characters."; return; }

  const { error } = await supabase.auth.updateUser({ password: pwd });
  msg.textContent = error ? "Could not update password." : "Password updated.";
  msg.style.color = error ? "var(--danger)" : "var(--accent)";
  if (!error) document.getElementById("new-password").value = "";
});

// ---- Business Profile (admin only, enforced by RLS; hidden here too for clarity) ----
async function loadSettings() {
  const [{ data: staff }, { data: settingsRow }] = await Promise.all([
    supabase.from("staff").select("role").eq("id", session.user.id).maybeSingle(),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const isAdmin = staff?.role === "admin";
  document.getElementById("save-settings-btn").disabled = !isAdmin;
  document.getElementById("store-name").disabled = !isAdmin;
  document.getElementById("low-stock-threshold").disabled = !isAdmin;
  document.getElementById("admin-only-note").hidden = isAdmin;

  if (settingsRow) {
    document.getElementById("store-name").value = settingsRow.store_name ?? "";
    document.getElementById("low-stock-threshold").value = settingsRow.low_stock_threshold ?? 5;
    if (settingsRow.store_name) document.getElementById("brand-name-text").textContent = settingsRow.store_name;
  }
}

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  const msg = document.getElementById("settings-msg");
  const storeName = document.getElementById("store-name").value.trim();
  const threshold = Number(document.getElementById("low-stock-threshold").value);

  const { error } = await supabase
    .from("app_settings")
    .update({ store_name: storeName, low_stock_threshold: threshold })
    .eq("id", 1);

  msg.textContent = error ? "Could not save settings." : "Settings saved.";
  msg.style.color = error ? "var(--danger)" : "var(--accent)";
});

await loadSettings();
