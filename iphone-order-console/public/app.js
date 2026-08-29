import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---- Session guard: no valid session -> back to login ----
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = "index.html";
}
document.getElementById("user-email").textContent = session?.user?.email ?? "";

supabase.auth.onAuthStateChange((event, s) => {
  if (event === "SIGNED_OUT" || !s) window.location.href = "index.html";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ---- State ----
let orders = [];
const tbody = document.getElementById("orders-tbody");
const countEl = document.getElementById("order-count");
const toast = document.getElementById("save-toast");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.hidden = false;
  toast.style.borderColor = isError ? "var(--danger)" : "var(--accent)";
  toast.style.color = isError ? "var(--danger)" : "var(--accent)";
  setTimeout(() => (toast.hidden = true), 2500);
}

// Escape any user-entered text before it goes into innerHTML — otherwise
// a name/address field like `<img onerror=...>` is a stored XSS attack.
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

async function loadOrders() {
  tbody.innerHTML = `<tr><td colspan="12" class="muted center">Loading orders…</td></tr>`;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="12" class="muted center">Could not load orders.</td></tr>`;
    console.error(error.message); // never log tokens/passwords — only safe error text
    return;
  }
  orders = data;
  render();
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const statusQ = statusFilter.value;

  const filtered = orders.filter((o) => {
    const matchesQ =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.iphone_model.toLowerCase().includes(q);
    const matchesStatus = !statusQ || o.status === statusQ;
    return matchesQ && matchesStatus;
  });

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="muted center">No orders match.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (o) => `
    <tr data-id="${o.id}">
      <td>${esc(o.order_number)}</td>
      <td>
        <div>${esc(o.customer_name)}</div>
        <div class="muted">${esc(o.customer_email)}</div>
      </td>
      <td>${esc(o.shipping_address)}</td>
      <td>${esc(o.iphone_model)}</td>
      <td>${esc(o.model_year)}</td>
      <td>${esc(o.storage_gb)} GB</td>
      <td>${esc(o.color)}</td>
      <td>${esc(o.condition.replace("_", " "))}</td>
      <td>${o.battery_health ?? "—"}</td>
      <td>${Number(o.price).toFixed(2)}</td>
      <td>
        <select class="status-select" data-field="status">
          ${["pending", "processing", "shipped", "delivered", "cancelled"]
            .map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>
      </td>
      <td>
        <button class="row-edit ghost-btn">Edit</button>
        <button class="row-delete">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  // Inline status change -> save immediately, refetch to confirm persistence
  tbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      const { error } = await supabase
        .from("orders")
        .update({ status: e.target.value })
        .eq("id", id);
      if (error) {
        showToast("Could not save status change.", true);
        return;
      }
      showToast("Status updated.");
      await loadOrders(); // re-pull from DB so a page refresh always matches this view
    });
  });

  tbody.querySelectorAll(".row-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest("tr").dataset.id;
      openDialog(orders.find((o) => o.id === id));
    });
  });

  tbody.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      if (!confirm("Delete this order? This cannot be undone.")) return;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) {
        showToast("Could not delete order.", true);
        return;
      }
      showToast("Order deleted.");
      await loadOrders();
    });
  });
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
document.getElementById("refresh-btn").addEventListener("click", loadOrders);

// ---- Add / Edit dialog ----
const dialog = document.getElementById("order-dialog");
const dialogTitle = document.getElementById("dialog-title");
const orderForm = document.getElementById("order-form");
const formError = document.getElementById("form-error");

const fields = [
  "order_number", "customer_name", "customer_email", "shipping_address",
  "iphone_model", "model_year", "storage_gb", "color", "condition",
  "battery_health", "price", "status",
];

function openDialog(order = null) {
  formError.textContent = "";
  dialogTitle.textContent = order ? `Edit ${order.order_number}` : "Add order";
  document.getElementById("f-id").value = order?.id ?? "";
  fields.forEach((f) => {
    document.getElementById(`f-${f}`).value = order ? order[f] ?? "" : "";
  });
  dialog.showModal();
}

document.getElementById("add-order-btn").addEventListener("click", () => openDialog());
document.getElementById("cancel-btn").addEventListener("click", () => dialog.close());

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const id = document.getElementById("f-id").value;
  const payload = {};
  fields.forEach((f) => {
    const el = document.getElementById(`f-${f}`);
    let v = el.value;
    if (["model_year", "storage_gb", "battery_health"].includes(f)) v = v === "" ? null : Number(v);
    if (f === "price") v = Number(v);
    payload[f] = v;
  });

  // Basic client-side sanity check (defense in depth — the real
  // constraints live in the database via CHECK constraints).
  if (payload.condition === "new") payload.battery_health = null;

  const query = id
    ? supabase.from("orders").update(payload).eq("id", id)
    : supabase.from("orders").insert(payload);

  const { error } = await query;
  if (error) {
    formError.textContent = "Could not save: " + (error.code === "23505" ? "order # already exists." : "check the fields and try again.");
    return;
  }

  dialog.close();
  showToast(id ? "Order updated." : "Order added.");
  await loadOrders();
});

// Initial load
await loadOrders();
