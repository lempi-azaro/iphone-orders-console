import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import {
  IPHONE_MODELS,
  IPHONE_SERIES,
  findModel,
  modelSeries,
  modelsForSeries,
  storageLabel,
  estimatePriceAndBattery,
} from "./iphone-data.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.href = "index.html";

document.getElementById("user-email").textContent = session?.user?.email ?? "";

supabase.auth.onAuthStateChange((event, currentSession) => {
  if (event === "SIGNED_OUT" || !currentSession) window.location.href = "index.html";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

const { data: myStaffRow } = await supabase
  .from("staff")
  .select("role")
  .eq("id", session.user.id)
  .maybeSingle();

const isAdmin = myStaffRow?.role === "admin";

const { data: brandSettings } = await supabase
  .from("app_settings")
  .select("store_name, currency_symbol")
  .eq("id", 1)
  .maybeSingle();

if (brandSettings?.store_name) {
  document.getElementById("brand-name-text").textContent = brandSettings.store_name;
}

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
const variantFilter = document.getElementById("variant-filter");
const conditionFilter = document.getElementById("condition-filter");
const storageFilter = document.getElementById("storage-filter");
const colorFilter = document.getElementById("color-filter");
const unitStatusFilter = document.getElementById("unit-status-filter");
const batteryFilter = document.getElementById("battery-filter");
const pagePrevBtn = document.getElementById("page-prev");
const pageNextBtn = document.getElementById("page-next");
const pageIndicator = document.getElementById("page-indicator");
const paginationSummary = document.getElementById("pagination-summary");

let CURRENCY = brandSettings?.currency_symbol ?? "RM";

const money = (number) =>
  `${CURRENCY} ${Number(number).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const titleCase = (value) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function esc(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function setSelectOptions(select, placeholder, values, labelForValue = (value) => value) {
  const currentValue = select.value;

  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    values
      .map((value) => `<option value="${value}">${labelForValue(value)}</option>`)
      .join("");

  if (values.includes(currentValue)) {
    select.value = currentValue;
  }
}

function refreshDependentFilters() {
  const modelsInSeries = modelFilter.value
    ? modelsForSeries(modelFilter.value)
    : IPHONE_MODELS;

  setSelectOptions(
    variantFilter,
    "All Variants",
    modelsInSeries.map((model) => model.name),
  );

  variantFilter.disabled = !modelFilter.value;

  const validModels = variantFilter.value
    ? modelsInSeries.filter((model) => model.name === variantFilter.value)
    : modelsInSeries;

  const validStorages = [...new Set(validModels.flatMap((model) => model.storage))]
    .sort((a, b) => a - b);

  const validColors = [...new Set(validModels.flatMap((model) => model.colors))]
    .sort();

  setSelectOptions(storageFilter, "All Storage", validStorages, storageLabel);
  setSelectOptions(colorFilter, "All Colors", validColors);
}

setSelectOptions(modelFilter, "All iPhone Series", IPHONE_SERIES);
refreshDependentFilters();

function renderStats(list) {
  const total = list.length;
  const revenue = list.reduce((sum, order) => sum + Number(order.price), 0);
  const pending = list.filter((order) => order.status === "pending").length;
  const transit = list.filter(
    (order) => order.status === "processing" || order.status === "shipped",
  ).length;
  const delivered = list.filter((order) => order.status === "delivered").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-revenue").textContent = money(revenue);
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-transit").textContent = transit;
  document.getElementById("stat-delivered").textContent = delivered;
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.borderColor = isError ? "var(--danger)" : "var(--accent)";
  toast.style.color = isError ? "var(--danger)" : "var(--accent)";
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
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
  const searchQuery = searchInput.value.trim().toLowerCase();
  const statusQuery = statusFilter.value;
  const modelQuery = modelFilter.value;
  const variantQuery = variantFilter.value;
  const conditionQuery = conditionFilter.value;
  const storageQuery = storageFilter.value;
  const colorQuery = colorFilter.value;
  const unitStatusQuery = unitStatusFilter.value;
  const batteryQuery = batteryFilter.value;

  let filtered = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.order_number.toLowerCase().includes(searchQuery) ||
      order.customer_name.toLowerCase().includes(searchQuery) ||
      order.iphone_model.toLowerCase().includes(searchQuery);

    const matchesStatus = !statusQuery || order.status === statusQuery;

    const matchesModel =
      !modelQuery ||
      (variantQuery
        ? order.iphone_model === variantQuery
        : modelSeries(order.iphone_model) === modelQuery);

    const matchesCondition = !conditionQuery || order.condition === conditionQuery;
    const matchesStorage = !storageQuery || order.storage_gb === Number(storageQuery);
    const matchesColor = !colorQuery || order.color === colorQuery;
    const matchesUnitStatus = !unitStatusQuery || order.unit_status === unitStatusQuery;

    const matchesBattery =
      !batteryQuery ||
      (order.battery_health != null &&
        ((batteryQuery === "above90" && order.battery_health > 90) ||
          (batteryQuery === "80to89" &&
            order.battery_health >= 80 &&
            order.battery_health <= 89) ||
          (batteryQuery === "below80" && order.battery_health < 80)));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesModel &&
      matchesCondition &&
      matchesStorage &&
      matchesColor &&
      matchesUnitStatus &&
      matchesBattery
    );
  });

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue ?? "").toLowerCase();
      }

      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (aValue < bValue) return -1 * sortDir;
      if (aValue > bValue) return 1 * sortDir;

      return 0;
    });
  }

  return filtered;
}

function render() {
  renderStats(orders);

  const filtered = getFiltered();
  countEl.textContent = filtered.length;

  document
    .querySelectorAll("th.sortable .sort-arrow")
    .forEach((element) => {
      element.textContent = "";
    });

  if (sortKey) {
    const heading = document.querySelector(
      `th[data-sort="${sortKey}"] .sort-arrow`,
    );

    if (heading) {
      heading.textContent = sortDir === 1 ? "▲" : "▼";
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  paginationSummary.textContent =
    filtered.length === 0
      ? "No Orders"
      : `Showing ${start + 1} to ${Math.min(
          start + PAGE_SIZE,
          filtered.length,
        )} of ${filtered.length}`;

  pagePrevBtn.disabled = currentPage <= 1;
  pageNextBtn.disabled = currentPage >= totalPages;

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="muted center">No Orders Match.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems
    .map(
      (order, index) => `
      <tr data-id="${order.id}" style="animation-delay: ${Math.min(index * 18, 200)}ms">
        <td>${esc(order.order_number)}</td>
        <td>
          <div>${esc(order.customer_name)}</div>
          <div class="muted">${esc(order.customer_email)}</div>
        </td>
        <td>${esc(order.shipping_address)}</td>
        <td>${esc(order.iphone_model)}</td>
        <td>${esc(order.model_year)}</td>
        <td>${esc(storageLabel(order.storage_gb))}</td>
        <td>${esc(order.color)}</td>
        <td>${esc(titleCase(order.condition))}</td>
        <td>${order.battery_health != null ? `${esc(order.battery_health)}%` : "N/A"}</td>
        <td>${money(order.price)}</td>
        <td>
          <select class="status-select status-${order.status}" data-field="status">
            ${["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
              .map(
                (status) =>
                  `<option value="${status}" ${
                    status === order.status ? "selected" : ""
                  }>${titleCase(status)}</option>`,
              )
              .join("")}
          </select>
        </td>
        <td>
          <select class="status-select unit-status-select status-${order.unit_status}" data-field="unit_status">
            ${["available", "reserved", "sold", "under_repair"]
              .map(
                (status) =>
                  `<option value="${status}" ${
                    status === order.unit_status ? "selected" : ""
                  }>${titleCase(status)}</option>`,
              )
              .join("")}
          </select>
        </td>
        <td>
          <div class="action-cell">
            <button class="action-btn edit row-edit">Edit</button>
            <button class="action-btn delete row-delete" ${
              isAdmin ? "" : "hidden"
            }>Delete</button>
          </div>
        </td>
      </tr>`,
    )
    .join("");

  tbody.querySelectorAll(".status-select[data-field='status']").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const id = event.target.closest("tr").dataset.id;

      const { error } = await supabase
        .from("orders")
        .update({ status: event.target.value })
        .eq("id", id);

      if (error) {
        showToast("Could not save status change.", true);
        return;
      }

      showToast("Status updated.");
      await loadOrders();
    });
  });

  tbody
    .querySelectorAll(".status-select[data-field='unit_status']")
    .forEach((select) => {
      select.addEventListener("change", async (event) => {
        const id = event.target.closest("tr").dataset.id;

        const { error } = await supabase
          .from("orders")
          .update({ unit_status: event.target.value })
          .eq("id", id);

        if (error) {
          showToast("Could not save unit status change.", true);
          return;
        }

        showToast("Unit status updated.");
        await loadOrders();
      });
    });

  tbody.querySelectorAll(".row-edit").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.closest("tr").dataset.id;
      openDialog(orders.find((order) => order.id === id));
    });
  });

  tbody.querySelectorAll(".row-delete").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const id = event.target.closest("tr").dataset.id;

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

searchInput.addEventListener("input", () => {
  currentPage = 1;
  render();
});

[
  statusFilter,
  conditionFilter,
  storageFilter,
  colorFilter,
  unitStatusFilter,
  batteryFilter,
].forEach((element) => {
  element.addEventListener("change", () => {
    currentPage = 1;
    render();
  });
});

modelFilter.addEventListener("change", () => {
  variantFilter.value = "";
  refreshDependentFilters();
  currentPage = 1;
  render();
});

variantFilter.addEventListener("change", () => {
  refreshDependentFilters();
  currentPage = 1;
  render();
});

document.getElementById("refresh-btn").addEventListener("click", loadOrders);

document.querySelectorAll("th.sortable").forEach((heading) => {
  heading.addEventListener("click", () => {
    const key = heading.dataset.sort;

    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }

    currentPage = 1;
    render();
  });
});

pagePrevBtn.addEventListener("click", () => {
  currentPage -= 1;
  render();
});

pageNextBtn.addEventListener("click", () => {
  currentPage += 1;
  render();
});

document.getElementById("export-csv-btn").addEventListener("click", () => {
  const rows = getFiltered();

  const headers = [
    "Order Number",
    "Customer Name",
    "Customer Email",
    "Shipping Address",
    "Model",
    "Year",
    "Storage GB",
    "Color",
    "Condition",
    "Battery Health",
    "Price RM",
    "Order Status",
    "Unit Status",
    "Created At",
  ];

  const csvEscape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [headers.join(",")];

  rows.forEach((order) => {
    lines.push(
      [
        order.order_number,
        order.customer_name,
        order.customer_email,
        order.shipping_address,
        order.iphone_model,
        order.model_year,
        order.storage_gb,
        order.color,
        titleCase(order.condition),
        order.battery_health ?? "",
        order.price,
        titleCase(order.status),
        titleCase(order.unit_status),
        order.created_at,
      ]
        .map(csvEscape)
        .join(","),
    );
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `iphone-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
});

const dialog = document.getElementById("order-dialog");
const dialogTitle = document.getElementById("dialog-title");
const orderForm = document.getElementById("order-form");
const formError = document.getElementById("form-error");
const orderNumberSuffix = document.getElementById("f-order_number_suffix");

const fields = [
  "customer_name",
  "customer_email",
  "shipping_address",
  "iphone_model",
  "model_year",
  "storage_gb",
  "color",
  "condition",
  "battery_health",
  "price",
  "status",
  "unit_status",
];

const modelSelect = document.getElementById("f-iphone_model");
const storageSelect = document.getElementById("f-storage_gb");
const colorSelect = document.getElementById("f-color");
const yearInput = document.getElementById("f-model_year");
const conditionSelect = document.getElementById("f-condition");
const batteryInput = document.getElementById("f-battery_health");

modelSelect.innerHTML = [...IPHONE_MODELS]
  .reverse()
  .map((model) => `<option value="${model.name}">${model.name} (${model.year})</option>`)
  .join("");

function refreshStorageAndColor(preserve = {}) {
  const model = findModel(modelSelect.value) ?? IPHONE_MODELS[0];

  yearInput.value = model.year;

  storageSelect.innerHTML = model.storage
    .map((storage) => `<option value="${storage}">${storageLabel(storage)}</option>`)
    .join("");

  if (
    preserve.storage_gb &&
    model.storage.includes(Number(preserve.storage_gb))
  ) {
    storageSelect.value = preserve.storage_gb;
  }

  colorSelect.innerHTML = model.colors
    .map((color) => `<option value="${color}">${color}</option>`)
    .join("");

  if (preserve.color && model.colors.includes(preserve.color)) {
    colorSelect.value = preserve.color;
  }
}

modelSelect.addEventListener("change", () => {
  refreshStorageAndColor();
});

conditionSelect.addEventListener("change", () => {
  const isNew = conditionSelect.value === "new";

  batteryInput.disabled = isNew;
  batteryInput.value = isNew ? "" : batteryInput.value || 90;
});

function nextOrderSuffix() {
  const numbers = orders
    .map((order) => parseInt(order.order_number.replace("ORD-", ""), 10))
    .filter((number) => !Number.isNaN(number));

  const nextNumber = (numbers.length ? Math.max(...numbers) : 1000) + 1;

  return String(nextNumber).padStart(4, "0");
}

function openDialog(order = null) {
  formError.textContent = "";
  dialogTitle.textContent = order
    ? `Edit ${order.order_number}`
    : "Add Order";

  document.getElementById("f-id").value = order?.id ?? "";

  orderNumberSuffix.value = order
    ? order.order_number.replace("ORD-", "")
    : nextOrderSuffix();

  fields.forEach((field) => {
    if (["iphone_model", "storage_gb", "color", "model_year"].includes(field)) {
      return;
    }

    document.getElementById(`f-${field}`).value = order
      ? order[field] ?? ""
      : "";
  });

  if (!order) {
    document.getElementById("f-unit_status").value = "reserved";
  }

  modelSelect.value =
    order?.iphone_model ?? IPHONE_MODELS[IPHONE_MODELS.length - 1].name;

  refreshStorageAndColor({
    storage_gb: order?.storage_gb,
    color: order?.color,
  });

  batteryInput.disabled = conditionSelect.value === "new";

  const resultElement = document.getElementById("estimate-result");
  resultElement.classList.remove("visible");
  resultElement.textContent = "";

  document.getElementById("est-years").value = "";

  dialog.showModal();
}

document.getElementById("add-order-btn").addEventListener("click", () => {
  openDialog();
});

document.getElementById("cancel-btn").addEventListener("click", () => {
  dialog.close();
});

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

  const resultElement = document.getElementById("estimate-result");

  resultElement.classList.add("visible");
  resultElement.textContent =
    `Suggested: RM ${result.estimatedPrice.toLocaleString()}, about ${result.estimatedBattery}% battery ` +
    `(condition score ${result.conditionScore} of 100, about ${result.ageYears} years old). ` +
    "Fields have been filled in. Adjust if needed.";
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";

  const suffix = orderNumberSuffix.value.trim();

  if (!/^\d{4}$/.test(suffix)) {
    formError.textContent = "Order number must be exactly 4 digits.";
    return;
  }

  const id = document.getElementById("f-id").value;
  const payload = { order_number: `ORD-${suffix}` };

  fields.forEach((field) => {
    const element = document.getElementById(`f-${field}`);
    let value = element.value;

    if (["model_year", "storage_gb", "battery_health"].includes(field)) {
      value = value === "" ? null : Number(value);
    }

    if (field === "price") {
      value = Number(value);
    }

    payload[field] = value;
  });

  if (payload.condition === "new") {
    payload.battery_health = null;
  }

  const query = id
    ? supabase.from("orders").update(payload).eq("id", id)
    : supabase.from("orders").insert(payload);

  const { error } = await query;

  if (error) {
    formError.textContent =
      "Could not save: " +
      (error.code === "23505"
        ? "order number already exists."
        : "check the fields and try again.");

    return;
  }

  dialog.close();
  showToast(id ? "Order updated." : "Order added.");
  await loadOrders();
});

await loadOrders();

async function updateAlertsBadge() {
  const { data } = await supabase
    .from("inventory")
    .select("quantity, reorder_threshold, low_stock_acknowledged");

  const count = (data ?? []).filter(
    (item) =>
      item.quantity <= item.reorder_threshold &&
      !item.low_stock_acknowledged,
  ).length;

  const badge = document.getElementById("alerts-badge");

  if (!badge) return;

  if (count > 0) {
    badge.textContent = count;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

updateAlertsBadge();
