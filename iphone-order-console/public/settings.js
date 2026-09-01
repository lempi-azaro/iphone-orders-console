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

const isAdminHolder = { value: false };

// ---- Business Profile (admin only, enforced by RLS; hidden here too for clarity) ----
async function loadSettings() {
  const [{ data: staff }, { data: settingsRow }] = await Promise.all([
    supabase.from("staff").select("role").eq("id", session.user.id).maybeSingle(),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const isAdmin = staff?.role === "admin";
  isAdminHolder.value = isAdmin;
  document.getElementById("save-settings-btn").disabled = !isAdmin;
  document.getElementById("store-name").disabled = !isAdmin;
  document.getElementById("currency-symbol").disabled = !isAdmin;
  document.getElementById("low-stock-threshold").disabled = !isAdmin;
  document.getElementById("admin-only-note").hidden = isAdmin;
  document.getElementById("suppliers-card").hidden = !isAdmin;
  document.getElementById("add-supplier-btn").hidden = !isAdmin;

  if (settingsRow) {
    document.getElementById("store-name").value = settingsRow.store_name ?? "";
    document.getElementById("currency-symbol").value = settingsRow.currency_symbol ?? "RM";
    document.getElementById("low-stock-threshold").value = settingsRow.low_stock_threshold ?? 5;
    if (settingsRow.store_name) document.getElementById("brand-name-text").textContent = settingsRow.store_name;
  }

  if (isAdmin) await loadSuppliers();
}

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  const msg = document.getElementById("settings-msg");
  const storeName = document.getElementById("store-name").value.trim();
  const currency = document.getElementById("currency-symbol").value.trim() || "RM";
  const threshold = Number(document.getElementById("low-stock-threshold").value);

  const { error } = await supabase
    .from("app_settings")
    .update({ store_name: storeName, currency_symbol: currency, low_stock_threshold: threshold })
    .eq("id", 1);

  msg.textContent = error ? "Could not save settings." : "Settings saved.";
  msg.style.color = error ? "var(--danger)" : "var(--accent)";
});

await loadSettings();

// ---- Security ----
document.getElementById("sign-out-others-btn").addEventListener("click", async () => {
  const msg = document.getElementById("sign-out-others-msg");
  const { error } = await supabase.auth.signOut({ scope: "others" });
  msg.textContent = error ? "Could not sign out other sessions." : "Signed out of all other sessions.";
  msg.style.color = error ? "var(--danger)" : "var(--accent)";
});

// ---- Suppliers (admin only) ----
const esc = (str) => { const d = document.createElement("div"); d.textContent = str ?? ""; return d.innerHTML; };

async function loadSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  const tbody = document.getElementById("suppliers-tbody");
  if (error) { tbody.innerHTML = `<tr><td colspan="5" class="muted">Could not load suppliers.</td></tr>`; return; }

  tbody.innerHTML = (data ?? []).length
    ? data.map((s) => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>${esc(s.contact_name ?? "")}</td>
        <td class="muted">${esc(s.email ?? "")}</td>
        <td>${esc(s.phone ?? "")}</td>
        <td><button class="ghost-btn small-btn delete-supplier-btn" data-id="${s.id}" style="color: var(--danger); border-color: var(--danger);">Delete</button></td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="muted">No suppliers yet.</td></tr>`;

  tbody.querySelectorAll(".delete-supplier-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this supplier?")) return;
      const { error } = await supabase.from("suppliers").delete().eq("id", btn.dataset.id);
      if (error) { alert("Could not delete: " + error.message); return; }
      await loadSuppliers();
    });
  });
}

document.getElementById("add-supplier-btn").addEventListener("click", async () => {
  const msg = document.getElementById("supplier-msg");
  const name = document.getElementById("new-supplier-name").value.trim();
  if (!name) { msg.textContent = "Enter at least a supplier name."; msg.style.color = "var(--danger)"; return; }

  const { error } = await supabase.from("suppliers").insert({
    name,
    contact_name: document.getElementById("new-supplier-contact").value.trim() || null,
    email: document.getElementById("new-supplier-email").value.trim() || null,
    phone: document.getElementById("new-supplier-phone").value.trim() || null,
  });

  if (error) { msg.textContent = "Could not add supplier."; msg.style.color = "var(--danger)"; return; }
  msg.textContent = "Supplier added.";
  msg.style.color = "var(--accent)";
  ["new-supplier-name", "new-supplier-contact", "new-supplier-email", "new-supplier-phone"].forEach((id) => (document.getElementById(id).value = ""));
  await loadSuppliers();
});

// ---- Data export ----
function downloadCsv(filename, headers, rows) {
  const csvEscape = (val) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("export-inventory-btn").addEventListener("click", async () => {
  const { data } = await supabase.from("inventory").select("*, suppliers(name)");
  downloadCsv(
    `inventory-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Model", "Storage GB", "Color", "Condition", "Quantity", "Reorder Threshold", "Unit Price", "Supplier"],
    (data ?? []).map((i) => [i.iphone_model, i.storage_gb, i.color, i.condition, i.quantity, i.reorder_threshold, i.unit_price ?? "", i.suppliers?.name ?? ""])
  );
});

document.getElementById("export-suppliers-btn").addEventListener("click", async () => {
  const { data } = await supabase.from("suppliers").select("*");
  downloadCsv(
    `suppliers-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Name", "Contact", "Email", "Phone", "Address"],
    (data ?? []).map((s) => [s.name, s.contact_name ?? "", s.email ?? "", s.phone ?? "", s.address ?? ""])
  );
});

async function updateAlertsBadge() {
  const { data } = await supabase.from("inventory").select("quantity, reorder_threshold, low_stock_acknowledged");
  const count = (data ?? []).filter((i) => i.quantity <= i.reorder_threshold && !i.low_stock_acknowledged).length;
  const badge = document.getElementById("alerts-badge");
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.hidden = false; } else { badge.hidden = true; }
}
updateAlertsBadge();
