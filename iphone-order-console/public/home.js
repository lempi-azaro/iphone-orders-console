import {
  IPHONE_MODELS,
  getModelSeriesList,
  getVariantsForSeries,
  loadSavedOrders,
  saveOrders,
  storageLabel
} from './iphone-data.js';

document.addEventListener('DOMContentLoaded', () => {
  let orders = loadSavedOrders();

  const seriesFilter = document.getElementById('seriesFilter');
  const variantFilter = document.getElementById('variantFilter');
  const storageFilter = document.getElementById('storageFilter');
  const colorFilter = document.getElementById('colorFilter');
  const ordersBody = document.getElementById('ordersBody');
  const exportBtn = document.getElementById('exportCsvBtn');

  const orderFormCard = document.getElementById('orderFormCard');
  const toggleOrderFormBtn = document.getElementById('toggleOrderFormBtn');
  const cancelOrderFormBtn = document.getElementById('cancelOrderFormBtn');
  const orderForm = document.getElementById('orderForm');

  const formSeries = document.getElementById('formSeries');
  const formVariant = document.getElementById('formVariant');
  const formStorage = document.getElementById('formStorage');
  const formColor = document.getElementById('formColor');

  // Populate Series Filters
  const seriesList = getModelSeriesList();
  seriesList.forEach(s => {
    seriesFilter.appendChild(new Option(s, s));
    formSeries.appendChild(new Option(s, s));
  });

  // Filter Cascade Handlers
  seriesFilter.addEventListener('change', () => {
    populateVariants(seriesFilter.value, variantFilter, storageFilter, colorFilter);
    renderOrders();
  });

  variantFilter.addEventListener('change', () => {
    populateSpecs(variantFilter.value, storageFilter, colorFilter);
    renderOrders();
  });

  storageFilter.addEventListener('change', renderOrders);
  colorFilter.addEventListener('change', renderOrders);

  // Form Cascade Handlers
  formSeries.addEventListener('change', () => {
    populateVariants(formSeries.value, formVariant, formStorage, formColor);
  });

  formVariant.addEventListener('change', () => {
    populateSpecs(formVariant.value, formStorage, formColor);
  });

  function populateVariants(seriesVal, vSelect, sSelect, cSelect) {
    vSelect.innerHTML = '<option value="">All Variants</option>';
    sSelect.innerHTML = '<option value="">All Storage</option>';
    cSelect.innerHTML = '<option value="">All Colors</option>';

    if (!seriesVal) {
      vSelect.disabled = true; sSelect.disabled = true; cSelect.disabled = true;
    } else {
      vSelect.disabled = false;
      const variants = getVariantsForSeries(seriesVal);
      variants.forEach(m => vSelect.appendChild(new Option(m.name, m.name)));
      sSelect.disabled = true; cSelect.disabled = true;
    }
  }

  function populateSpecs(modelNameVal, sSelect, cSelect) {
    sSelect.innerHTML = '<option value="">All Storage</option>';
    cSelect.innerHTML = '<option value="">All Colors</option>';

    if (!modelNameVal) {
      sSelect.disabled = true; cSelect.disabled = true;
    } else {
      sSelect.disabled = false; cSelect.disabled = false;
      const modelObj = IPHONE_MODELS.find(m => m.name === modelNameVal);
      if (modelObj) {
        modelObj.storage.forEach(s => sSelect.appendChild(new Option(storageLabel(s), s)));
        modelObj.colors.forEach(c => cSelect.appendChild(new Option(c, c)));
      }
    }
  }

  function renderOrders() {
    ordersBody.innerHTML = '';
    const filtered = orders.filter(o => {
      if (seriesFilter.value && !o.modelName.startsWith(seriesFilter.value) && !(seriesFilter.value === "iPhone 17" && o.modelName === "iPhone Air")) return false;
      if (variantFilter.value && o.modelName !== variantFilter.value) return false;
      if (storageFilter.value && String(o.storage) !== String(storageFilter.value)) return false;
      if (colorFilter.value && o.color !== colorFilter.value) return false;
      return true;
    });

    filtered.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Order ID"><strong>${o.id}</strong></td>
        <td data-label="Year">${o.year}</td>
        <td data-label="Model / Specs">${o.modelName}<br><small>${storageLabel(o.storage)} • ${o.color}</small></td>
        <td data-label="Condition">${o.condition}</td>
        <td data-label="Battery">${o.batteryHealth}</td>
        <td data-label="Price">RM ${o.price}</td>
        <td data-label="Address"><small>${o.address}</small></td>
        <td data-label="Status">
          <select onchange="window.updateStatus('${o.id}', this.value)" style="padding:0.3rem;">
            ${['Pending','Processing','Shipped','Delivered','Cancelled'].map(s => 
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td data-label="Actions">
          <button onclick="window.editOrder('${o.id}')" class="btn-secondary" style="padding:0.3rem 0.6rem;">Edit</button>
          <button onclick="window.deleteOrder('${o.id}')" class="btn-danger">Delete</button>
        </td>
      `;
      ordersBody.appendChild(tr);
    });
  }

  window.updateStatus = function(id, newStatus) {
    const item = orders.find(o => o.id === id);
    if (item) {
      item.status = newStatus;
      saveOrders(orders);
    }
  };

  window.deleteOrder = function(id) {
    if (confirm(`Remove order ${id}?`)) {
      orders = orders.filter(o => o.id !== id);
      saveOrders(orders);
      renderOrders();
    }
  };

  window.editOrder = function(id) {
    const o = orders.find(item => item.id === id);
    if (!o) return;

    document.getElementById('orderId').value = o.id;
    document.getElementById('orderFormTitle').textContent = `Edit Order ${o.id}`;

    const series = seriesList.find(s => o.modelName.startsWith(s) || (s === "iPhone 17" && o.modelName === "iPhone Air"));
    if (series) {
      formSeries.value = series;
      populateVariants(series, formVariant, formStorage, formColor);
      formVariant.value = o.modelName;
      populateSpecs(o.modelName, formStorage, formColor);
      formStorage.value = o.storage;
      formColor.value = o.color;
    }

    document.getElementById('formCondition').value = o.condition;
    document.getElementById('formBattery').value = o.batteryHealth;
    document.getElementById('formPrice').value = o.price;
    document.getElementById('formStatus').value = o.status;
    document.getElementById('formAddress').value = o.address;

    orderFormCard.style.display = 'block';
  };

  toggleOrderFormBtn.addEventListener('click', () => {
    orderForm.reset();
    document.getElementById('orderId').value = '';
    document.getElementById('orderFormTitle').textContent = 'Create New Order';
    orderFormCard.style.display = 'block';
  });

  cancelOrderFormBtn.addEventListener('click', () => { orderFormCard.style.display = 'none'; });

  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('orderId').value;
    const modelName = formVariant.value;
    const modelObj = IPHONE_MODELS.find(m => m.name === modelName);

    const orderPayload = {
      id: id || `ORD-${Date.now().toString().slice(-4)}`,
      year: modelObj ? modelObj.year : 2024,
      modelName,
      storage: parseInt(formStorage.value),
      color: formColor.value,
      condition: document.getElementById('formCondition').value,
      batteryHealth: document.getElementById('formBattery').value,
      price: parseFloat(document.getElementById('formPrice').value),
      status: document.getElementById('formStatus').value,
      address: document.getElementById('formAddress').value
    };

    if (id) {
      const idx = orders.findIndex(o => o.id === id);
      if (idx !== -1) orders[idx] = orderPayload;
    } else {
      orders.unshift(orderPayload);
    }

    saveOrders(orders);
    orderFormCard.style.display = 'none';
    renderOrders();
  });

  // Download CSV export trigger fix
  exportBtn.addEventListener('click', () => {
    const headers = ['Order ID', 'Year', 'Model', 'Storage', 'Color', 'Condition', 'Battery', 'Price (RM)', 'Status', 'Address'];
    const rows = orders.map(o => [o.id, o.year, o.modelName, storageLabel(o.storage), o.color, o.condition, o.batteryHealth, o.price, o.status, `"${o.address}"`]);
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'iphone_orders.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  renderOrders();
});
