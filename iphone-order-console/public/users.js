import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.href = "index.html";
document.getElementById("user-email").textContent = session?.user?.email ?? "";

supabase.auth.onAuthStateChange((event, s) => {
  if (event === "SIGNED_OUT" || !s) window.location.href = "index.html";
});
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const esc = (str) => { const d = document.createElement("div"); d.textContent = str ?? ""; return d.innerHTML; };

async function loadUsers() {
  const { data: staff, error } = await supabase.from("staff").select("*").order("full_name");
  if (error) {
    document.getElementById("admin-list").innerHTML = `<p class="muted">Could not load users.</p>`;
    return;
  }

  const admins = staff.filter((s) => s.role === "admin");
  const staffMembers = staff.filter((s) => s.role === "staff");

  document.getElementById("admin-list").innerHTML = admins.length
    ? admins.map(renderUserRow).join("")
    : `<p class="muted">No admins yet.</p>`;
  document.getElementById("staff-list").innerHTML = staffMembers.length
    ? staffMembers.map(renderUserRow).join("")
    : `<p class="muted">No staff yet.</p>`;

  // Show the Add User form only to admins. This mirrors the database-level
  // RLS policy, which is the real enforcement; hiding the form here is just
  // for a cleaner experience, not the security boundary itself.
  const me = staff.find((s) => s.id === session.user.id);
  if (me?.role === "admin") {
    document.getElementById("add-user-card").hidden = false;
  }
}

function renderUserRow(s) {
  return `<div class="low-stock-row"><span>${esc(s.full_name)}<span class="muted"> (${esc(s.email)})</span></span></div>`;
}

async function loadActivity() {
  const [{ data: audit, error }, { data: staff }] = await Promise.all([
    supabase.from("orders_audit").select("*").order("changed_at", { ascending: false }).limit(30),
    supabase.from("staff").select("id, full_name"),
  ]);

  const listEl = document.getElementById("activity-list");
  if (error || !audit || audit.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 0 18px 14px;">No Activity Yet.</p>`;
    return;
  }

  const nameById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));
  const verbMap = { insert: "Added", update: "Updated", delete: "Deleted" };

  listEl.innerHTML = audit
    .map((a) => {
      const who = nameById.get(a.changed_by) ?? "Unknown User";
      const orderNum = a.new_data?.order_number ?? a.old_data?.order_number ?? "an order";
      const when = new Date(a.changed_at).toLocaleString();
      const verb = verbMap[a.action] ?? titleCase(a.action);
      return `<div class="low-stock-row"><span>${esc(who)} ${esc(verb)} ${esc(orderNum)}</span><span class="muted">${esc(when)}</span></div>`;
    })
    .join("");
}

// ---- Add User (admin only) ----
// Uses a second, isolated Supabase client with persistSession disabled so
// creating a new login does not touch or replace the admin's own session
// in this browser. Nothing here uses a service role key.
document.getElementById("add-user-btn").addEventListener("click", async () => {
  const msg = document.getElementById("add-user-msg");
  const name = document.getElementById("new-user-name").value.trim();
  const email = document.getElementById("new-user-email").value.trim();
  const password = document.getElementById("new-user-password").value;
  const role = document.getElementById("new-user-role").value;

  if (!name || !email || password.length < 8) {
    msg.textContent = "Fill in name, email, and a password of at least 8 characters.";
    msg.style.color = "var(--danger)";
    return;
  }

  const isolatedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({ email, password });
  if (signUpError) {
    msg.textContent = "Could not create login: " + signUpError.message;
    msg.style.color = "var(--danger)";
    return;
  }

  const newUserId = signUpData.user?.id;
  if (!newUserId) {
    msg.textContent = "Account created, but could not confirm the new user ID. Check Supabase Authentication.";
    msg.style.color = "var(--danger)";
    return;
  }

  const { error: staffError } = await supabase
    .from("staff")
    .insert({ id: newUserId, full_name: name, email, role });

  if (staffError) {
    msg.textContent = "Login created, but adding to the staff directory failed: " + staffError.message;
    msg.style.color = "var(--danger)";
    return;
  }

  msg.textContent = "User added.";
  msg.style.color = "var(--accent)";
  document.getElementById("new-user-name").value = "";
  document.getElementById("new-user-email").value = "";
  document.getElementById("new-user-password").value = "";
  await loadUsers();
});

await loadUsers();
await loadActivity();
