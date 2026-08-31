import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { storageLabel } from "./iphone-data.js";

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

const esc = (str) => { const d = document.createElement("div"); d.textContent = str ?? ""; return d.innerHTML; };
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (iso) => new Date(iso).toLocaleDateString();
const itemName = (i) => `${i.iphone_model} ${storageLabel(i.storage_gb)} ${i.color}`;
const sku = (i) => i.id.slice(0, 8).toUpperCase();

async function loadAlerts() {
  const { data: brandSettings } = await supabase.from("app_settings").select("store_name").eq("id", 1).maybeSingle();
  if (brandSettings?.store_name) document.getElementById("brand-name-text").textContent = brandSettings.store_name;

  const [{ data: inventory }, { data: audit }] = await Promise.all([
    supabase.from("inventory").select("*"),
    supabase.from("inventory_audit").select("*").order("changed_at", { ascending: false }).limit(500),
  ]);

  const openItems = (inventory ?? []).filter((i) => i.quantity <= i.reorder_threshold);
  const unacknowledged = openItems.filter((i) => !i.low_stock_acknowledged);

  // Update nav badge
  const badge = document.getElementById("alerts-badge");
  if (unacknowledged.length > 0) {
    badge.textContent = unacknowledged.length;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  document.getElementById("open-summary").textContent =
    `${openItems.length} Active, ${unacknowledged.length} Unacknowledged`;

  const ackAllBtn = document.getElementById("ack-all-btn");
  if (unacknowledged.length > 0) {
    ackAllBtn.hidden = false;
    ackAllBtn.textContent = `Acknowledge All (${unacknowledged.length})`;
  } else {
    ackAllBtn.hidden = true;
  }

  // Find the most recent crossing event per item (old.quantity > old.reorder AND new.quantity <= new.reorder)
  const crossingByItem = new Map();
  const recoveryByItem = new Map();
  (audit ?? []).forEach((a) => {
    if (!a.old_data || !a.new_data) return;
    const wasAbove = a.old_data.quantity > a.old_data.reorder_threshold;
    const nowBelow = a.new_data.quantity <= a.new_data.reorder_threshold;
    const wasBelow = a.old_data.quantity <= a.old_data.reorder_threshold;
    const nowAbove = a.new_data.quantity > a.new_data.reorder_threshold;

    if (wasAbove && nowBelow && !crossingByItem.has(a.inventory_id)) {
      crossingByItem.set(a.inventory_id, a);
    }
    if (wasBelow && nowAbove && !recoveryByItem.has(a.inventory_id)) {
      recoveryByItem.set(a.inventory_id, a);
    }
  });

  renderOpen(openItems, crossingByItem);
  renderResolved(inventory ?? [], recoveryByItem);
}

function renderOpen(openItems, crossingByItem) {
  const listEl = document.getElementById("open-list");
  if (openItems.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 0 18px 14px;">No Open Alerts.</p>`;
    return;
  }

  listEl.innerHTML = openItems
    .map((i) => {
      const outOfStock = i.quantity === 0;
      const crossing = crossingByItem.get(i.id);
      const detail = crossing
        ? `${sku(i)} · Fell To ${crossing.new_data.quantity} Against A Reorder Point Of ${crossing.new_data.reorder_threshold} On ${fmtDate(crossing.changed_at)} · Now ${i.quantity} On Hand`
        : `${sku(i)} · Below Reorder Point Of ${i.reorder_threshold} · Now ${i.quantity} On Hand`;

      return `
      <div class="low-stock-row">
        <span>
          <strong>${esc(itemName(i))}</strong>
          <span class="status-pill ${outOfStock ? "pill-danger" : "pill-warning"}">${outOfStock ? "Out Of Stock" : "Low Stock"}</span>
          <span class="status-pill ${i.low_stock_acknowledged ? "pill-muted" : "pill-new"}">${i.low_stock_acknowledged ? "Acknowledged" : "New"}</span>
          <br /><span class="muted" style="font-size: 12px;">${detail}</span>
        </span>
        ${i.low_stock_acknowledged
          ? ""
          : `<button class="ghost-btn small-btn ack-btn" data-id="${i.id}">Acknowledge</button>`}
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".ack-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await supabase.from("inventory").update({ low_stock_acknowledged: true }).eq("id", btn.dataset.id);
      await loadAlerts();
    });
  });
}

function renderResolved(inventory, recoveryByItem) {
  const listEl = document.getElementById("resolved-list");
  const inventoryById = new Map(inventory.map((i) => [i.id, i]));

  const resolved = [...recoveryByItem.entries()]
    .filter(([id]) => {
      const item = inventoryById.get(id);
      return item && item.quantity > item.reorder_threshold; // still resolved right now
    })
    .map(([id, a]) => ({ item: inventoryById.get(id), resolvedAt: a.changed_at }))
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt))
    .slice(0, 8);

  if (resolved.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 0 18px 14px;">Nothing Resolved Yet.</p>`;
    return;
  }

  listEl.innerHTML = resolved
    .map(
      ({ item, resolvedAt }) => `
      <div class="low-stock-row">
        <span>${esc(itemName(item))}</span>
        <span class="muted">Resolved ${fmtDate(resolvedAt)}</span>
      </div>`
    )
    .join("");
}

document.getElementById("ack-all-btn").addEventListener("click", async () => {
  const { data: inventory } = await supabase.from("inventory").select("id, quantity, reorder_threshold, low_stock_acknowledged");
  const ids = (inventory ?? [])
    .filter((i) => i.quantity <= i.reorder_threshold && !i.low_stock_acknowledged)
    .map((i) => i.id);
  if (ids.length === 0) return;
  await supabase.from("inventory").update({ low_stock_acknowledged: true }).in("id", ids);
  await loadAlerts();
});

await loadAlerts();
