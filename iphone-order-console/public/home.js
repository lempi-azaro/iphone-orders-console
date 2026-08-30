import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { IPHONE_MODELS, findModel, storageLabel } from "./iphone-data.js";

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

Chart.register(ChartDataLabels);

// Placeholder display name until user profiles are wired up.
const DISPLAY_NAME = "Dal";
document.getElementById("greeting").textContent = `Welcome Back, ${DISPLAY_NAME}`;

const money = (n) => Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const esc = (str) => { const d = document.createElement("div"); d.textContent = str ?? ""; return d.innerHTML; };

const ACCENT = "#2f5d50";
const PALETTE = ["#f77f00", "#2563eb", "#7c3aed", "#0d9488", "#e11d48", "#eab308"];

let inventoryCache = [];
let suppliersCache = [];

async function loadDashboard() {
  const [{ data: orders, error: ordersErr }, { data: inventory, error: invErr }, { data: settingsRow }, { data: suppliers }] = await Promise.all([
    supabase.from("orders").select("status, price, iphone_model, created_at"),
    supabase.from("inventory").select("*, suppliers(name)").order("quantity", { ascending: true }),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  if (ordersErr || invErr) {
    console.error(ordersErr?.message || invErr?.message);
    return;
  }

  inventoryCache = inventory;
  suppliersCache = suppliers ?? [];

  if (settingsRow?.store_name) document.getElementById("brand-name-text").textContent = settingsRow.store_name;

  const { data: myStaffRow } = await supabase.from("staff").select("role").eq("id", session.user.id).maybeSingle();
  const isAdmin = myStaffRow?.role === "admin";
  document.getElementById("add-inventory-btn").hidden = !isAdmin;

  // ---- Stat cards ----
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + Number(o.price), 0);
  const refunded = orders.filter((o) => o.status === "refunded").length;
  const inventoryValue = inventory.reduce((s, i) => s + Number(i.unit_price ?? 0) * i.quantity, 0);

  // Active alert = below reorder point AND not acknowledged since the last stock change.
  const activeAlerts = inventory.filter((i) => isAlertActive(i));

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-revenue").textContent = money(revenue);
  document.getElementById("stat-inventory-value").textContent = money(inventoryValue);
  document.getElementById("stat-refunded").textContent = refunded;
  document.getElementById("stat-lowstock").textContent = activeAlerts.length;

  renderStatusChart(orders);
  renderModelChart(orders);
  renderTrendChart(orders);
  renderLowStock(inventory, isAdmin);
  populateSupplierSelect(suppliersCache);
}

function isAlertActive(item) {
  return item.quantity <= item.reorder_threshold && !item.low_stock_acknowledged;
}

function renderStatusChart(orders) {
  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
  const counts = statuses.map((s) => orders.filter((o) => o.status === s).length);

  new Chart(document.getElementById("status-chart"), {
    type: "doughnut",
    data: { labels: statuses.map(titleCase), datasets: [{ data: counts, backgroundColor: PALETTE, borderWidth: 0 }] },
    options: {
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 12 } } },
        datalabels: {
          color: "#fff", font: { weight: "700", size: 12 },
          formatter: (value, ctx) => {
            if (!value) return null;
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            return total ? Math.round((value / total) * 100) + "%" : null;
          },
        },
      },
    },
  });
}

function renderModelChart(orders) {
  const models = ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17", "iPhone Air"];
  const counts = models.map((m) => orders.filter((o) => o.iphone_model.startsWith(m)).length);

  new Chart(document.getElementById("category-chart"), {
    type: "bar",
    data: { labels: models, datasets: [{ data: counts, backgroundColor: ACCENT, borderRadius: 6, maxBarThickness: 60 }] },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: { anchor: "end", align: "top", color: ACCENT, font: { weight: "700", size: 12 }, formatter: (v) => (v > 0 ? v : null) },
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      layout: { padding: { top: 18 } },
    },
  });
}

function renderTrendChart(orders) {
  const weeks = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    weeks.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
  }

  const counts = weeks.map((w) => orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= w.start && d < w.end;
  }).length);

  new Chart(document.getElementById("trend-chart"), {
    type: "line",
    data: {
      labels: weeks.map((w) => w.label),
      datasets: [{ data: counts, borderColor: ACCENT, backgroundColor: "rgba(47,93,80,0.12)", fill: true, tension: 0.3, pointRadius: 3 }],
    },
    options: {
      plugins: { legend: { display: false }, datalabels: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderLowStock(inventory, isAdmin) {
  const lowStockItems = inventory.filter((i) => i.quantity <= i.reorder_threshold);
  const listEl = document.getElementById("low-stock-list");

  if (lowStockItems.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 0 18px 14px;">Nothing Is Low On Stock Right Now.</p>`;
    return;
  }

  listEl.innerHTML = lowStockItems
    .map((i) => {
      const critical = i.quantity <= Math.floor(i.reorder_threshold / 2);
      const active = isAlertActive(i);
      return `
      <div class="low-stock-row">
        <span>
          ${esc(i.iphone_model)}, ${i.storage_gb >= 1024 ? "1TB" : i.storage_gb + "GB"}, ${esc(i.color)}, ${esc(titleCase(i.condition))}
          ${i.suppliers?.name ? `<span class="muted">(${esc(i.suppliers.name)})</span>` : ""}
        </span>
        <span class="low-stock-actions">
          <span class="qty-badge ${critical ? "critical" : ""}">${i.quantity} Left</span>
          ${active
            ? `<button class="ghost-btn small-btn ack-btn" data-id="${i.id}">Acknowledge</button>`
            : `<span class="muted small-btn">Acknowledged</span>`}
          <button class="ghost-btn small-btn edit-inv-btn" data-id="${i.id}" ${isAdmin ? "" : "hidden"}>Edit</button>
        </span>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".ack-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { error } = await supabase
        .from("inventory")
        .update({ low_stock_acknowledged: true, low_stock_acknowledged_at: new Date().toISOString() })
        .eq("id", btn.dataset.id);
      if (!error) await loadDashboard();
    });
  });

  listEl.querySelectorAll(".edit-inv-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = inventoryCache.find((i) => i.id === btn.dataset.id);
      openInventoryDialog(item);
    });
  });
}

function populateSupplierSelect(suppliers) {
  const sel = document.getElementById("inv-supplier");
  sel.innerHTML = `<option value="">None</option>` + suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
}

// ---- Add / Edit inventory dialog ----
const invDialog = document.getElementById("inventory-dialog");
const invForm = document.getElementById("inventory-form");
const invModelSelect = document.getElementById("inv-model");
const invStorageSelect = document.getElementById("inv-storage");
const invColorSelect = document.getElementById("inv-color");

invModelSelect.innerHTML = [...IPHONE_MODELS].reverse().map((m) => `<option value="${m.name}">${m.name} (${m.year})</option>`).join("");

function refreshInvStorageAndColor(preserve = {}) {
  const model = findModel(invModelSelect.value) ?? IPHONE_MODELS[0];
  invStorageSelect.innerHTML = model.storage.map((gb) => `<option value="${gb}">${storageLabel(gb)}</option>`).join("");
  if (preserve.storage_gb && model.storage.includes(Number(preserve.storage_gb))) invStorageSelect.value = preserve.storage_gb;
  invColorSelect.innerHTML = model.colors.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (preserve.color && model.colors.includes(preserve.color)) invColorSelect.value = preserve.color;
}

invModelSelect.addEventListener("change", () => refreshInvStorageAndColor());

function openInventoryDialog(item = null) {
  document.getElementById("inventory-form-error").textContent = "";
  document.getElementById("inventory-dialog-title").textContent = item ? "Edit Inventory Item" : "Add Inventory Item";
  document.getElementById("inv-id").value = item?.id ?? "";
  document.getElementById("inv-condition").value = item?.condition ?? "new";
  document.getElementById("inv-quantity").value = item?.quantity ?? 0;
  document.getElementById("inv-reorder").value = item?.reorder_threshold ?? 5;
  document.getElementById("inv-price").value = item?.unit_price ?? "";
  document.getElementById("inv-supplier").value = item?.supplier_id ?? "";

  invModelSelect.value = item?.iphone_model ?? IPHONE_MODELS[IPHONE_MODELS.length - 1].name;
  refreshInvStorageAndColor({ storage_gb: item?.storage_gb, color: item?.color });

  invDialog.showModal();
}

document.getElementById("add-inventory-btn").addEventListener("click", () => openInventoryDialog());
document.getElementById("inventory-cancel-btn").addEventListener("click", () => invDialog.close());

invForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("inventory-form-error");
  errorEl.textContent = "";

  const id = document.getElementById("inv-id").value;
  const payload = {
    iphone_model: invModelSelect.value,
    storage_gb: Number(invStorageSelect.value),
    color: invColorSelect.value,
    condition: document.getElementById("inv-condition").value,
    quantity: Number(document.getElementById("inv-quantity").value),
    reorder_threshold: Number(document.getElementById("inv-reorder").value),
    unit_price: document.getElementById("inv-price").value === "" ? null : Number(document.getElementById("inv-price").value),
    supplier_id: document.getElementById("inv-supplier").value || null,
  };

  const query = id
    ? supabase.from("inventory").update(payload).eq("id", id)
    : supabase.from("inventory").insert(payload);

  const { error } = await query;
  if (error) {
    errorEl.textContent = "Could not save inventory item. Check the fields and try again.";
    return;
  }

  invDialog.close();
  await loadDashboard();
});

await loadDashboard();
