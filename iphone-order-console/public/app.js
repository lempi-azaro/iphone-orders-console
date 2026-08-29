import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { IPHONE_MODELS, findModel, storageLabel } from "./iphone-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

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

let orders = [];
let sortKey = null;
let sortDir = 1;
let currentPage = 1;
const PAGE_SIZE = 20;
const tbody = document.getElementById("orders-tbody");
const countEl = document.getElementById("order-count");
const toast = document.getElementById("save-toast");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const pagePrevBtn = document.getElementById("page-prev");
const pageNextBtn = document.getElementById("page-next");
const pageIndicator = document.getElementById("page-indicator");
const paginationSummary = document.getElementById("pagination-summary");

const money = (n) => Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderStats(list) {
  const total = list.length;
  const revenue = list.reduce((sum, o) => sum + Number(o.price), 0);
  const pending = list.filter((o) => o.status === "pending").length;
  const transit = list.filter((o) => o.status === "processing" || o.status === "shipped").length;
  const delivered = list.filter((o) => o.status === "delivered").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-revenue").textContent = money(revenue);
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-transit").textContent = transit;
  document.getElementById("stat-delivered").textContent = delivered;
}

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.hidden = false;
  toast.style.borderColor = isError ? "var(--danger)" : "var(--accent)";
  toast.style.color = isError ? "var(--danger)" : "var(--accent)";
  setTimeout(() => (toast.hidden = true), 2500);
}

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
    console.error(error.message);
    return;
  }
  orders = data;
  render();
}

function render() {
  renderStats(orders);

  const q = searchInput.value.trim().toLowerCase();
  const statusQ = statusFilter.value;

  let filtered = orders.filter((o) => {
    const matchesQ =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.iphone_model.toLowerCase().includes(q);
    const matchesStatus = !statusQ || o.status === statusQ;
    return matchesQ && matchesStatus;
  });

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv ?? "").toLowerCase(); }
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }

  countEl.textContent = filtered.length;

  document.querySelectorAll("th.sortable .sort-arrow").forEach((el) => (el.textContent = ""));
  if (sortKey) {
    const th = document.querySelector(`th[data-sort="${sortKey}"] .sort-arrow`);
    if (th) th.textContent = sortDir === 1 ? "▲" : "▼";
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationSummary.textContent = filtered.length === 0
    ? "No orders"
    : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`;
  pagePrevBtn.disabled = currentPage <= 1;
  pageNextBtn.disabled = currentPage >= totalPages;

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="muted center">No orders match.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems
    .map(
      (o, i) => `
    <tr data-id="${o.id}" style="animation-delay: ${Math.min(i * 18, 200)}ms">
      <td>${esc(o.order_number)}</td>
      <td>
        <div>${esc(o.customer_name)}</div>
        <div class="muted">${esc(o.customer_email)}</div>
      </td>
      <td>${esc(o.shipping_address)}</td>
      <td>${esc(o.iphone_model)}</td>
      <td>${esc(o.model_year)}</td>
      <td>${esc(storageLabel(o.storage_gb))}</td>
      <td>${esc(o.color)}</td>
      <td>${esc(o.condition.replace("_", " "))}</td>
      <td>${o.battery_health != null ? esc(o.battery_health) + "%" : "—"}</td>
      <td>${money(o.price)}</td>
      <td>
        <select class="status-select status-${o.status}" data-field="status">
          ${["pending", "processing", "shipped", "delivered", "cancelled"]
            .map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>
      </td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit row-edit">✎ Edit</button>
          <button class="action-btn delete row-delete">🗑 Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

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
      await loadOrders();
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

searchInput.addEventListener("input", () => { currentPage = 1; render(); });
statusFilter.addEventListener("change", () => { currentPage = 1; render(); });
document.getElementById("refresh-btn").addEventListener("click", loadOrders);

document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = 1; }
    currentPage = 1;
    render();
  });
});

pagePrevBtn.addEventListener("click", () => { currentPage -= 1; render(); });
pageNextBtn.addEventListener("click", () => { currentPage += 1; render(); });

const dialog = document.getElementById("order-dialog");
const dialogTitle = document.getElementById("dialog-title");
const orderForm = document.getElementById("order-form");
const formError = document.getElementById("form-error");

const fields = [
  "order_number", "customer_name", "customer_email", "shipping_address",
  "iphone_model", "model_year", "storage_gb", "color", "condition",
  "battery_health", "price", "status",
];

const modelSelect = document.getElementById("f-iphone_model");
const storageSelect = document.getElementById("f-storage_gb");
const colorSelect = document.getElementById("f-color");
const yearInput = document.getElementById("f-model_year");
const conditionSelect = document.getElementById("f-condition");
const batteryInput = document.getElementById("f-battery_health");

modelSelect.innerHTML = [...IPHONE_MODELS]
  .reverse()
  .map((m) => `<option value="${m.name}">${m.name} (${m.year})</option>`)
  .join("");

function refreshStorageAndColor(preserve = {}) {
  const model = findModel(modelSelect.value) ?? IPHONE_MODELS[0];
  yearInput.value = model.year;

  storageSelect.innerHTML = model.storage
    .map((gb) => `<option value="${gb}">${storageLabel(gb)}</option>`)
    .join("");
  if (preserve.storage_gb && model.storage.includes(Number(preserve.storage_gb))) {
    storageSelect.value = preserve.storage_gb;
  }

  colorSelect.innerHTML = model.colors
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  if (preserve.color && model.colors.includes(preserve.color)) {
    colorSelect.value = preserve.color;
  }
}

modelSelect.addEventListener("change", () => refreshStorageAndColor());

conditionSelect.addEventListener("change", () => {
  const isNew = conditionSelect.value === "new";
  batteryInput.disabled = isNew;
  batteryInput.value = isNew ? "" : batteryInput.value || 90;
});

function openDialog(order = null) {
  formError.textContent = "";
  dialogTitle.textContent = order ? `Edit ${order.order_number}` : "Add order";
  document.getElementById("f-id").value = order?.id ?? "";

  fields.forEach((f) => {
    if (["iphone_model", "storage_gb", "color", "model_year"].includes(f)) return;
    document.getElementById(`f-${f}`).value = order ? order[f] ?? "" : "";
  });

  modelSelect.value = order?.iphone_model ?? IPHONE_MODELS[IPHONE_MODELS.length - 1].name;
  refreshStorageAndColor({ storage_gb: order?.storage_gb, color: order?.color });

  const isNew = conditionSelect.value === "new";
  batteryInput.disabled = isNew;

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

await loadOrders();
