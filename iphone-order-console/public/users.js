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

const { data: brandSettings } = await supabase.from("app_settings").select("store_name").eq("id", 1).maybeSingle();
if (brandSettings?.store_name) document.getElementById("brand-name-text").textContent = brandSettings.store_name;

const esc = (str) => { const d = document.createElement("div"); d.textContent = str ?? ""; return d.innerHTML; };

let isCurrentUserAdmin = false;

async function loadTeam() {
  const [{ data: staff, error }, { data: orderAudit }, { data: invAudit }] = await Promise.all([
    supabase.from("staff").select("*").order("full_name"),
    supabase.from("orders_audit").select("changed_by"),
    supabase.from("inventory_audit").select("changed_by"),
  ]);

  if (error) {
    document.getElementById("team-tbody").innerHTML = `<tr><td colspan="5" class="muted">Could not load users.</td></tr>`;
    return;
  }

  // Movements = every logged action (order or inventory) attributed to this user.
  const movementCounts = new Map();
  [...(orderAudit ?? []), ...(invAudit ?? [])].forEach((row) => {
    if (!row.changed_by) return;
    movementCounts.set(row.changed_by, (movementCounts.get(row.changed_by) ?? 0) + 1);
  });

  document.getElementById("team-count").textContent = `${staff.length} Account${staff.length === 1 ? "" : "s"}.`;

  const me = staff.find((s) => s.id === session.user.id);
  isCurrentUserAdmin = me?.role === "admin";
  document.getElementById("add-user-card").hidden = !isCurrentUserAdmin;

  const noteEl = document.getElementById("team-note");
  if (!me) {
    noteEl.textContent = "Your account is not yet in the team directory, so role changes and adding users are unavailable to you here. Ask an existing admin to add you, or add yourself directly in Supabase (Table Editor > staff).";
    noteEl.hidden = false;
  } else if (!isCurrentUserAdmin) {
    noteEl.textContent = "You're signed in as Staff. Only Administrators can change roles or remove users.";
    noteEl.hidden = false;
  } else {
    noteEl.hidden = true;
  }

  document.getElementById("team-tbody").innerHTML = staff.length
    ? staff.map((s) => renderRow(s, movementCounts.get(s.id) ?? 0)).join("")
    : `<tr><td colspan="5" class="muted">No users yet.</td></tr>`;

  document.querySelectorAll(".role-select").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      if (!isCurrentUserAdmin) return;
      const { error } = await supabase.from("staff").update({ role: e.target.value }).eq("id", e.target.dataset.id);
      if (error) { alert("Could not update role: " + error.message); await loadTeam(); return; }
      await loadTeam();
    });
  });

  document.querySelectorAll(".delete-user-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this user's access? This does not delete their login.")) return;
      const { error } = await supabase.from("staff").delete().eq("id", btn.dataset.id);
      if (error) { alert("Could not remove user: " + error.message); return; }
      await loadTeam();
    });
  });
}

function renderRow(s, movements) {
  const isMe = s.id === session.user.id;
  return `
    <tr>
      <td>${esc(s.full_name)}${isMe ? '<span class="you-badge">You</span>' : ""}</td>
      <td class="muted">${esc(s.email)}</td>
      <td>${movements}</td>
      <td>
        <select class="role-select" data-id="${s.id}" ${isCurrentUserAdmin ? "" : "disabled"}>
          <option value="admin" ${s.role === "admin" ? "selected" : ""}>Administrator</option>
          <option value="staff" ${s.role === "staff" ? "selected" : ""}>Staff</option>
        </select>
      </td>
      <td>${isCurrentUserAdmin && !isMe ? `<button class="ghost-btn small-btn delete-user-btn" data-id="${s.id}" style="color: var(--danger); border-color: var(--danger);">Delete</button>` : ""}</td>
    </tr>`;
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
    msg.textContent = "Account created, but could not confirm the new user ID.";
    msg.style.color = "var(--danger)";
    return;
  }

  const { error: staffError } = await supabase.from("staff").insert({ id: newUserId, full_name: name, email, role });
  if (staffError) {
    msg.textContent = "Login created, but adding to the team failed: " + staffError.message;
    msg.style.color = "var(--danger)";
    return;
  }

  msg.textContent = "User added.";
  msg.style.color = "var(--accent)";
  document.getElementById("new-user-name").value = "";
  document.getElementById("new-user-email").value = "";
  document.getElementById("new-user-password").value = "";
  await loadTeam();
});

await loadTeam();
