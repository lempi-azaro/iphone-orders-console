import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { IPHONE_MODELS, findModel, storageLabel, estimatePriceAndBattery } from "./iphone-data.js";

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

const { data: myStaffRow } = await supabase.from("staff").select("role").eq("id", session.user.id).maybeSingle();
const isAdmin = myStaffRow?.role === "admin";

const { data: brandSettings } = await supabase.from("app_settings").select("store_name, currency_symbol").eq("id", 1).maybeSingle();
if (brandSettings?.store_name) document.getElementById("brand-name-text").textContent = brandSettings.store_name;

// ---- State ----
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
const modelFilter = document.getElementById("model-filter");
const conditionFilter = document.getElementById("condition-filter");
const storageFilter = document.getElementById("storage-filter");
const colorFilter = document.getElementById("color-filter");
const unitStatusFilter = document.getElementById("unit-status-filter");
const batteryFilter = document.getElementById("battery-filter");

// Populate Color and Storage filters from every value that actually
// appears across the iPhone lineup, deduplicated.
const allStorages = [...new Set(IPHONE_MODELS.flatMap((m) => m.storage))].sort((a, b) => a - b);
storageFilter.innerHTML += allStorages.map((gb) => `<option value="${gb}">${storageLabel(gb)}</option>`).join("");

const allColors = [...new Set(IPHONE_MODELS.flatMap((m) => m.colors))].sort();
colorFilter.innerHTML += allColors.map((c) => `<option value="${c}">${c}</option>`).join("");
const pagePrevBtn = document.getElementById("page-prev");
const pageNextBtn = document.getElementById("page-next");
const pageIndicator = document.getElementById("page-indicator");
const paginationSummary = document.getElementById("pagination-summary");

let CURRENCY = brandSettings?.currency_symbol ?? "RM";
const money = (n) => `${CURRENCY} ${Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
  tbody.innerHTML = `<tr><td colspan="13" class="muted center">Loading Orders</td></tr>`;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="13" class="muted center">Could not load orders.</td></tr>`;
    console.error(error.message);
    return;
  }
  orders = data;
  render();
}

function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();
  const statusQ = statusFilter.value;
  const modelQ = modelFilter.value;
  const conditionQ = conditionFilter.value;
  const storageQ = storageFilter.value;
  const colorQ = colorFilter.value;
  const unitStatusQ = unitStatusFilter.value;
  const batteryQ = batteryFilter.value;

  let filtered = orders.filter((o) => {
    const matchesQ =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.iphone_model.toLowerCase().includes(q);
    const matchesStatus = !statusQ || o.status === statusQ;
    const matchesModel = !modelQ || o.iphone_model.startsWith(modelQ);
    const matchesCondition = !conditionQ || o.condition === conditionQ;
    const matchesStorage = !storageQ || o.storage_gb === Number(storageQ);
    const matchesColor = !colorQ || o.color === colorQ;
    const matchesUnitStatus = !unitStatusQ || o.unit_status === unitStatusQ;
    const matchesBattery =
      !batteryQ ||
      (o.battery_health != null &&
        ((batteryQ === "above90" && o.battery_health > 90) ||
          (batteryQ === "80to89" && o.battery_health >= 80 && o.battery_health <= 89) ||
          (batteryQ === "below80" && o.battery_health < 80)));
    return matchesQ && matchesStatus && matchesModel && matchesCondition && matchesStorage && matchesColor && matchesUnitStatus && matchesBattery;
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

  return filtered;
}

function render() {
  renderStats(orders);
  const filtered = getFiltered();

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
    ? "No Orders"
    : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`;
  pagePrevBtn.disabled = currentPage <= 1;
  pageNextBtn.disabled = currentPage >= totalPages;

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="muted center">No Orders Match.</td></tr>`;
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
      <td>${esc(titleCase(o.condition))}</td>
      <td>${o.battery_health != null ? esc(o.battery_health) + "%" : "N/A"}</td>
      <td>${money(o.price)}</td>
      <td>
        <select class="status-select status-${o.status}" data-field="status">
          ${["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
            .map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${titleCase(s)}</option>`)
            .join("")}
        </select>
      </td>
      <td>
        <select class="status-select unit-status-select status-${o.unit_status}" data-field="unit_status">
          ${["available", "reserved", "sold", "under_repair"]
            .map((s) => `<option value="${s}" ${s === o.unit_status ? "selected" : ""}>${titleCase(s)}</option>`)
            .join("")}
        </select>
      </td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit row-edit">Edit</button>
          <button class="action-btn delete row-delete" ${isAdmin ? "" : "hidden"}>Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".status-select[data-field='status']").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      const { error } = await supabase.from("orders").update({ status: e.target.value }).eq("id", id);
      if (error) { showToast("Could not save status change.", true); return; }
      showToast("Status updated.");
      await loadOrders();
    });
  });

  tbody.querySelectorAll(".status-select[data-field='unit_status']").forEach((sel) => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      const { error } = await supabase.from("orders").update({ unit_status: e.target.value }).eq("id", id);
      if (error) { showToast("Could not save unit status change.", true); return; }
      showToast("Unit status updated.");
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
      if (error) { showToast("Could not delete order.", true); return; }
      showToast("Order deleted.");
      await loadOrders();
    });
  });
}

searchInput.addEventListener("input", () => { currentPage = 1; render(); });
[statusFilter, modelFilter, conditionFilter, storageFilter, colorFilter, unitStatusFilter, batteryFilter].forEach((el) => {
  el.addEventListener("change", () => { currentPage = 1; render(); });
});
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

// ---- CSV export (exports whatever the current filters show) ----
document.getElementById("export-csv-btn").addEventListener("click", () => {
  const rows = getFiltered();
  const headers = [
    "Order Number", "Customer Name", "Customer Email", "Shipping Address",
    "Model", "Year", "Storage GB", "Color", "Condition", "Battery Health",
    "Price RM", "Order Status", "Unit Status", "Created At",
  ];
  const csvEscape = (val) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  rows.forEach((o) => {
    lines.push([
      o.order_number, o.customer_name, o.customer_email, o.shipping_address,
      o.iphone_model, o.model_year, o.storage_gb, o.color, titleCase(o.condition),
      o.battery_health ?? "", o.price, titleCase(o.status), titleCase(o.unit_status), o.created_at,
    ].map(csvEscape).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `iphone-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---- Add / Edit dialog ----
const dialog = document.getElementById("order-dialog");
const dialogTitle = document.getElementById("dialog-title");
const orderForm = document.getElementById("order-form");
const formError = document.getElementById("form-error");
const orderNumberSuffix = document.getElementById("f-order_number_suffix");

const fields = [
  "customer_name", "customer_email", "shipping_address",
  "iphone_model", "model_year", "storage_gb", "color", "condition",
  "battery_health", "price", "status", "unit_status",
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

function nextOrderSuffix() {
  const numbers = orders
    .map((o) => parseInt(o.order_number.replace("ORD-", ""), 10))
    .filter((n) => !isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
  return String(next).padStart(4, "0");
}

function openDialog(order = null) {
  formError.textContent = "";
  dialogTitle.textContent = order ? `Edit ${order.order_number}` : "Add Order";
  document.getElementById("f-id").value = order?.id ?? "";
  orderNumberSuffix.value = order ? order.order_number.replace("ORD-", "") : nextOrderSuffix();

  fields.forEach((f) => {
    if (["iphone_model", "storage_gb", "color", "model_year"].includes(f)) return;
    document.getElementById(`f-${f}`).value = order ? order[f] ?? "" : "";
  });

  if (!order) document.getElementById("f-unit_status").value = "reserved";

  modelSelect.value = order?.iphone_model ?? IPHONE_MODELS[IPHONE_MODELS.length - 1].name;
  refreshStorageAndColor({ storage_gb: order?.storage_gb, color: order?.color });

  const isNew = conditionSelect.value === "new";
  batteryInput.disabled = isNew;

  const resultEl = document.getElementById("estimate-result");
  resultEl.classList.remove("visible");
  resultEl.textContent = "";
  document.getElementById("est-years").value = "";

  dialog.showModal();
}

document.getElementById("add-order-btn").addEventListener("click", () => openDialog());
document.getElementById("cancel-btn").addEventListener("click", () => dialog.close());

document.getElementById("run-estimate-btn").addEventListener("click", () => {
  const model = findModel(modelSelect.value);
  if (!model) return;

  const yearsRaw = document.getElementById("est-years").value;
  const result = estimatePriceAndBattery(model, storageSelect.value, {
    screenCondition: document.getElementById("est-screen").value,
    bodyCondition: document.getElementById("est-body").value,
    partsReplaced: document.getElementById("est-parts").value,
    faceIdWorks: document.getElementById("est-faceid").checked,
    cameraWorks: document.getElementById("est-camera").checked,
    chargingPortWorks: document.getElementById("est-charging").checked,
    waterDamage: document.getElementById("est-water").checked,
    yearsUsed: yearsRaw === "" ? null : Number(yearsRaw),
  });

  document.getElementById("f-price").value = result.estimatedPrice;
  if (conditionSelect.value !== "new") {
    batteryInput.value = result.estimatedBattery;
  }

  const resultEl = document.getElementById("estimate-result");
  resultEl.classList.add("visible");
  resultEl.textContent =
    `Suggested: RM ${result.estimatedPrice.toLocaleString()}, about ${result.estimatedBattery}% battery ` +
    `(condition score ${result.conditionScore} of 100, about ${result.ageYears} years old). ` +
    `Fields have been filled in. Adjust if needed.`;
});

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const suffix = orderNumberSuffix.value.trim();
  if (!/^\d{4}$/.test(suffix)) {
    formError.textContent = "Order number must be exactly 4 digits.";
    return;
  }

  const id = document.getElementById("f-id").value;
  const payload = { order_number: `ORD-${suffix}` };
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
    formError.textContent = "Could not save: " + (error.code === "23505" ? "order number already exists." : "check the fields and try again.");
    return;
  }

  dialog.close();
  showToast(id ? "Order updated." : "Order added.");
  await loadOrders();
});

await loadOrders();

async function updateAlertsBadge() {
  const { data } = await supabase.from("inventory").select("quantity, reorder_threshold, low_stock_acknowledged");
  const count = (data ?? []).filter((i) => i.quantity <= i.reorder_threshold && !i.low_stock_acknowledged).length;
  const badge = document.getElementById("alerts-badge");
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.hidden = false; } else { badge.hidden = true; }
}
updateAlertsBadge();
