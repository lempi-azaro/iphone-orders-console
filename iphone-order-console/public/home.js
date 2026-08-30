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

Chart.register(ChartDataLabels);

const money = (n) => Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const ACCENT = "#2f5d50";
const PALETTE = ["#2f5d50", "#8a5a13", "#2b5aa3", "#276b3a", "#a3392b", "#5a3e9e"];

async function loadDashboard() {
  const [{ data: orders, error: ordersErr }, { data: inventory, error: invErr }, { data: settingsRow }] = await Promise.all([
    supabase.from("orders").select("status, price, category"),
    supabase.from("inventory").select("*").order("quantity", { ascending: true }),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (ordersErr || invErr) {
    console.error(ordersErr?.message || invErr?.message);
    return;
  }

  if (settingsRow?.store_name) document.getElementById("store-title").textContent = settingsRow.store_name;

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

  // ---- Orders by status (donut, percentage always shown on the slice) ----
  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
  const statusCounts = statuses.map((s) => orders.filter((o) => o.status === s).length);

  new Chart(document.getElementById("status-chart"), {
    type: "doughnut",
    data: {
      labels: statuses.map(titleCase),
      datasets: [{ data: statusCounts, backgroundColor: PALETTE, borderWidth: 0 }],
    },
    options: {
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 12 } } },
        datalabels: {
          color: "#fff",
          font: { weight: "700", size: 12 },
          formatter: (value, ctx) => {
            if (!value) return null;
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            return total ? Math.round((value / total) * 100) + "%" : null;
          },
        },
      },
    },
  });

  // ---- Orders by category (bar, count always shown above the bar) ----
  const categories = ["Standard", "Pro", "Pro Max"];
  const categoryCounts = categories.map((c) => orders.filter((o) => o.category === c).length);

  new Chart(document.getElementById("category-chart"), {
    type: "bar",
    data: {
      labels: categories,
      datasets: [{ data: categoryCounts, backgroundColor: ACCENT, borderRadius: 6, maxBarThickness: 60 }],
    },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end", align: "top", color: "#2f5d50", font: { weight: "700", size: 12 },
          formatter: (value) => (value > 0 ? value : null),
        },
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      layout: { padding: { top: 18 } },
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
          <span>${esc(i.iphone_model)}, ${i.storage_gb >= 1024 ? "1TB" : i.storage_gb + "GB"}, ${esc(i.color)}, ${esc(titleCase(i.condition))}</span>
          <span class="qty-badge ${critical ? "critical" : ""}">${i.quantity} Left</span>
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
