document.addEventListener('DOMContentLoaded', () => {
  const supplierForm = document.getElementById('supplierForm');
  const supplierId = document.getElementById('supplierId');
  const supplierName = document.getElementById('supplierName');
  const contactPerson = document.getElementById('contactPerson');
  const supplierEmail = document.getElementById('supplierEmail');
  const supplierPhone = document.getElementById('supplierPhone');
  const suppliersBody = document.getElementById('suppliersBody');
  const exportBtn = document.getElementById('exportSuppliersBtn');
  const formTitle = document.getElementById('formTitle');
  const cancelBtn = document.getElementById('cancelEditBtn');

  let suppliers = JSON.parse(localStorage.getItem('suppliers_app_data')) || [
    { id: 1, name: 'Apple Authorized Distribution MY', contact: 'Mark Vance', email: 'mark@appledist.my', phone: '+60 3-2188 0000' },
    { id: 2, name: 'KL Refurbished Wholesale', contact: 'Sarah Lim', email: 'sarah@klrefurb.com', phone: '+60 12-987 6543' }
  ];

  function saveSuppliers() {
    localStorage.setItem('suppliers_app_data', JSON.stringify(suppliers));
  }

  function renderSuppliers() {
    suppliersBody.innerHTML = '';
    suppliers.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="ID">${s.id}</td>
        <td data-label="Supplier Name"><strong>${s.name}</strong></td>
        <td data-label="Contact Person">${s.contact}</td>
        <td data-label="Email">${s.email}</td>
        <td data-label="Phone">${s.phone}</td>
        <td data-label="Actions">
          <button onclick="window.editSupplier(${s.id})" class="btn-secondary" style="padding:0.3rem 0.6rem;">Edit</button>
          <button onclick="window.deleteSupplier(${s.id})" class="btn-danger">Delete</button>
        </td>
      `;
      suppliersBody.appendChild(tr);
    });
  }

  supplierForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (supplierId.value) {
      const id = parseInt(supplierId.value);
      const index = suppliers.findIndex(s => s.id === id);
      if (index !== -1) {
        suppliers[index] = { id, name: supplierName.value, contact: contactPerson.value, email: supplierEmail.value, phone: supplierPhone.value };
      }
    } else {
      suppliers.push({ id: Date.now(), name: supplierName.value, contact: contactPerson.value, email: supplierEmail.value, phone: supplierPhone.value });
    }
    saveSuppliers();
    resetForm();
    renderSuppliers();
  });

  window.editSupplier = function(id) {
    const s = suppliers.find(item => item.id === id);
    if (!s) return;
    supplierId.value = s.id;
    supplierName.value = s.name;
    contactPerson.value = s.contact;
    supplierEmail.value = s.email;
    supplierPhone.value = s.phone;
    formTitle.textContent = 'Edit Supplier';
    cancelBtn.style.display = 'inline-block';
  };

  window.deleteSupplier = function(id) {
    if (confirm('Delete this supplier?')) {
      suppliers = suppliers.filter(s => s.id !== id);
      saveSuppliers();
      renderSuppliers();
    }
  };

  cancelBtn.addEventListener('click', resetForm);

  function resetForm() {
    supplierId.value = '';
    supplierForm.reset();
    formTitle.textContent = 'Add Supplier';
    cancelBtn.style.display = 'none';
  }

  exportBtn.addEventListener('click', () => {
    const headers = ['ID', 'Supplier Name', 'Contact Person', 'Email', 'Phone'];
    const rows = suppliers.map(s => [s.id, `"${s.name}"`, `"${s.contact}"`, s.email, s.phone]);
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'suppliers_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  renderSuppliers();
});
