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

const money = (n) => Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACCENT = "#2f5d50";
const PALETTE = ["#2f5d50", "#8a5a13", "#2b5aa3", "#276b3a", "#a3392b", "#5a3e9e"];

async function loadDashboard() {
  const [{ data: orders, error: ordersErr }, { data: inventory, error: invErr }, { data: settingsRows }] = await Promise.all([
    supabase.from("orders").select("status, price, category"),
    supabase.from("inventory").select("*").order("quantity", { ascending: true }),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (ordersErr || invErr) {
    console.error(ordersErr?.message || invErr?.message);
    return;
  }

  const threshold = settingsRows?.low_stock_threshold ?? 5;
  if (settingsRows?.store_name) document.getElementById("store-title").textContent = settingsRows.store_name;

  // ---- Stat cards ----
  const total = orders.length;
  const revenue = orders.reduce((s, o) => s + Number(o.price), 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const refunded = orders.filter((o) => o.status === "refunded").length;
  const lowStockItems = inventory.filter((i) => i.quantity <= i.reorder_threshold);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-revenue").textContent = money(revenue);
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-refunded").textContent = refunded;
  document.getElementById("stat-lowstock").textContent = lowStockItems.length;

  // ---- Orders by status (donut) ----
  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
  const statusCounts = statuses.map((s) => orders.filter((o) => o.status === s).length);

  new Chart(document.getElementById("status-chart"), {
    type: "doughnut",
    data: {
      labels: statuses.map((s) => s[0].toUpperCase() + s.slice(1)),
      datasets: [{ data: statusCounts, backgroundColor: PALETTE, borderWidth: 0 }],
    },
    options: { plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 12 } } } } },
  });

  // ---- Orders by category (bar) ----
  const categories = ["Standard", "Pro", "Pro Max"];
  const categoryCounts = categories.map((c) => orders.filter((o) => o.category === c).length);

  new Chart(document.getElementById("category-chart"), {
    type: "bar",
    data: {
      labels: categories,
      datasets: [{ data: categoryCounts, backgroundColor: ACCENT, borderRadius: 6, maxBarThickness: 60 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });

  // ---- Low stock list ----
  const listEl = document.getElementById("low-stock-list");
  if (lowStockItems.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 0 18px 14px;">Nothing is low on stock right now.</p>`;
  } else {
    listEl.innerHTML = lowStockItems
      .map((i) => {
        const critical = i.quantity <= Math.floor(i.reorder_threshold / 2);
        return `
        <div class="low-stock-row">
          <span>${esc(i.iphone_model)} · ${i.storage_gb >= 1024 ? "1TB" : i.storage_gb + "GB"} · ${esc(i.color)} · ${esc(i.condition.replace("_", " "))}</span>
          <span class="qty-badge ${critical ? "critical" : ""}">${i.quantity} left</span>
        </div>`;
      })
      .join("");
  }
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

await loadDashboard();
