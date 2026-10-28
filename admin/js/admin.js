const API = '/api';
let token = localStorage.getItem('mba_token');
let currentAdmin = null;

// ── AUTH ─────────────────────────────────────────────────────────────────
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function apiCall(method, endpoint, body = null, isFormData = false) {
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}` }
  };
  if (body) {
    if (isFormData) { opts.body = body; }
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  }
  let res;
  try { res = await fetch(API + endpoint, opts); }
  catch { return { error: 'Network error. Is the server running?' }; }
  if (res.status === 401 && endpoint !== '/auth/change-password') { logout(); return null; }
  try { return await res.json(); }
  catch { return { error: `Server error (${res.status})` }; }
}

function logout() {
  localStorage.removeItem('mba_token');
  window.location.href = '/admin/login.html';
}

async function checkAuth() {
  if (!token) { window.location.href = '/admin/login.html'; return false; }
  const me = await apiCall('GET', '/auth/me');
  if (!me || me.error) { logout(); return false; }
  currentAdmin = me;
  document.querySelectorAll('.admin-name').forEach(el => el.textContent = me.name);
  document.querySelectorAll('.admin-initial').forEach(el => el.textContent = (me.name || 'A')[0].toUpperCase());
  return true;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function setActivePage(page) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');
}

function showSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `alert alert-${type}`;
  t.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;min-width:280px;box-shadow:0 4px 20px rgba(0,0,0,.15);';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.classList.contains('modal-close')) e.target.closest('.modal-overlay')?.classList.remove('open');
});

// ── ENQUIRIES ─────────────────────────────────────────────────────────────
let currentEnquiryFilter = 'all';
let enquiryPage = 1;

async function loadEnquiries(filter = 'all', page = 1) {
  currentEnquiryFilter = filter;
  enquiryPage = page;
  const q = filter !== 'all' ? `?status=${filter}&page=${page}&limit=15` : `?page=${page}&limit=15`;
  const data = await apiCall('GET', `/enquiries${q}`);
  if (!data) return;
  if (data.error) { showToast(data.error, 'error'); return; }

  // Update filter buttons
  document.querySelectorAll('[data-enq-filter]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.enqFilter === filter)
  );

  const tbody = document.getElementById('enquiriesTable');
  if (!tbody) return;

  if (!data.enquiries?.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No enquiries found</td></tr>';
    return;
  }

  tbody.innerHTML = data.enquiries.map(e => `
    <tr>
      <td><strong>${esc(e.name)}</strong><br><small style="color:var(--muted)">${esc(e.company)}</small></td>
      <td>${esc(e.phone)}</td>
      <td>${esc(e.email)}</td>
      <td>${esc(e.product) || '—'}</td>
      <td>${new Date(e.created_at).toLocaleDateString('en-IN')}</td>
      <td><span class="badge badge-${esc(e.status)}">${esc(e.status)}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewEnquiry('${esc(e.id)}')">View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteEnquiry('${esc(e.id)}')">Del</button>
      </td>
    </tr>`).join('');

  renderPagination('enquiryPagination', data.pages, page, p => loadEnquiries(currentEnquiryFilter, p));
}

async function viewEnquiry(id) {
  const data = await apiCall('GET', `/enquiries?page=1&limit=1000`);
  const enq = data?.enquiries?.find(e => e.id === id);
  if (!enq) return;
  if (enq.status === 'new') { apiCall('PATCH', `/enquiries/${id}/status`, { status: 'read' }); enq.status = 'read'; }
  document.getElementById('enqDetail').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div><label>Name</label><p><strong>${esc(enq.name)}</strong></p></div>
      <div><label>Company</label><p>${esc(enq.company) || '—'}</p></div>
      <div><label>Phone</label><p><a href="tel:${esc(enq.phone)}">${esc(enq.phone)}</a></p></div>
      <div><label>Email</label><p><a href="mailto:${esc(enq.email)}">${esc(enq.email)}</a></p></div>
      <div><label>Product Interest</label><p>${esc(enq.product) || '—'}</p></div>
      <div><label>Date</label><p>${new Date(enq.created_at).toLocaleString('en-IN')}</p></div>
      <div style="grid-column:1/-1"><label>Message</label><p style="background:#f8fafc;padding:.75rem;border-radius:6px;margin-top:.25rem;white-space:pre-wrap;">${esc(enq.message) || '—'}</p></div>
    </div>
    <div style="margin-top:1.25rem;display:flex;gap:.75rem;flex-wrap:wrap;">
      <button class="btn btn-success" onclick="updateEnquiryStatus('${id}','replied')">Mark Replied</button>
      <button class="btn btn-outline" onclick="updateEnquiryStatus('${id}','read')">Mark Read</button>
      <button class="btn btn-outline" onclick="updateEnquiryStatus('${id}','closed')">Close</button>
    </div>`;
  openModal('enqModal');
}

async function updateEnquiryStatus(id, status) {
  const r = await apiCall('PATCH', `/enquiries/${id}/status`, { status });
  if (r?.error) { showToast(r.error, 'error'); return; }
  closeModal('enqModal');
  loadEnquiries(currentEnquiryFilter, enquiryPage);
  showToast(`Marked as ${status}`);
}

async function deleteEnquiry(id) {
  if (!confirm('Delete this enquiry permanently?')) return;
  const r = await apiCall('DELETE', `/enquiries/${id}`);
  if (r?.error) { showToast(r.error, 'error'); return; }
  loadEnquiries(currentEnquiryFilter, enquiryPage);
  showToast('Enquiry deleted');
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────
let editingProductId = null;

async function loadProducts(category = 'all') {
  const q = category !== 'all' ? `/_all?category=${category}` : '/_all';
  const data = await apiCall('GET', `/products${q}`);
  if (!data) return;
  if (data.error) { showToast(data.error, 'error'); return; }

  document.querySelectorAll('[data-prod-filter]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.prodFilter === category)
  );

  const tbody = document.getElementById('productsTable');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No products yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><strong>${esc(p.name)}</strong></td>
      <td><span class="badge badge-new">${esc(p.category)}</span></td>
      <td>${esc((p.short_desc || '').substring(0,60))}${(p.short_desc || '').length > 60 ? '…' : ''}</td>
      <td>${(p.tags||[]).slice(0,3).map(t=>`<span class="badge badge-read">${esc(t)}</span>`).join(' ')}</td>
      <td><span class="badge badge-${p.is_active?'replied':'closed'}">${p.is_active?'Active':'Hidden'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editProduct('${esc(p.id)}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${esc(p.id)}')">Del</button>
      </td>
    </tr>`).join('');
}

async function editProduct(id) {
  const data = await apiCall('GET', `/products/_all`);
  const p = Array.isArray(data) ? data.find(x => x.id === id) : null;
  if (!p) return;
  editingProductId = id;
  document.getElementById('prodImage').value = '';
  document.getElementById('prodFormTitle').textContent = 'Edit Product';
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodIcon').value = p.icon || '';
  document.getElementById('prodShortDesc').value = p.short_desc || '';
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodTags').value = (p.tags||[]).join(', ');
  document.getElementById('prodActive').checked = p.is_active;
  openModal('productModal');
}

async function saveProduct() {
  const name = document.getElementById('prodName').value.trim();
  const data = {
    name,
    category: document.getElementById('prodCategory').value,
    icon: document.getElementById('prodIcon').value,
    shortDesc: document.getElementById('prodShortDesc').value.trim(),
    description: document.getElementById('prodDesc').value,
    tags: document.getElementById('prodTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    isActive: document.getElementById('prodActive').checked
  };
  if (!data.name || !data.category || !data.shortDesc) { showToast('Name, category and short description required', 'error'); return; }
  if (!editingProductId) data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Date.now();

  const formData = new FormData();
  formData.append('data', JSON.stringify(data));
  const imgFile = document.getElementById('prodImage').files[0];
  if (imgFile) formData.append('image', imgFile);

  const res = editingProductId
    ? await apiCall('PUT', `/products/${editingProductId}`, formData, true)
    : await apiCall('POST', `/products`, formData, true);
  if (!res || res.error) { showToast(res?.error || 'Save failed', 'error'); return; }
  showToast(editingProductId ? 'Product updated' : 'Product created');
  closeModal('productModal');
  editingProductId = null;
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const r = await apiCall('DELETE', `/products/${id}`);
  if (r?.error) { showToast(r.error, 'error'); return; }
  loadProducts();
  showToast('Product deleted');
}

function openNewProduct() {
  editingProductId = null;
  document.getElementById('prodFormTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('prodActive').checked = true;
  openModal('productModal');
}

// ── SETTINGS ─────────────────────────────────────────────────────────────
async function loadSettings() {
  const data = await apiCall('GET', '/settings');
  if (!data || data.error) return;
  Object.entries(data).forEach(([key, val]) => {
    const el = document.getElementById(`setting_${key}`);
    if (el) el.value = val;
  });
}

async function saveSettings(e) {
  e.preventDefault();
  const form = document.getElementById('settingsForm');
  const data = {};
  form.querySelectorAll('[data-setting-key]').forEach(el => { data[el.dataset.settingKey] = el.value; });
  const r = await apiCall('PUT', '/settings', data);
  if (r?.error) { showToast(r.error, 'error'); return; }
  showToast('Settings saved successfully');
}

// ── DASHBOARD STATS ───────────────────────────────────────────────────────
async function loadDashboard() {
  const [enquiries, newEnq, products] = await Promise.all([
    apiCall('GET', '/enquiries?limit=5'),
    apiCall('GET', '/enquiries?status=new&limit=1'),
    apiCall('GET', '/products/_all')
  ]);

  if (enquiries && !enquiries.error) {
    const el = document.getElementById('statEnquiries');
    if (el) el.textContent = enquiries.total || 0;
    const el2 = document.getElementById('statNew');
    if (el2) el2.textContent = newEnq?.total || 0;

    const tbl = document.getElementById('recentEnquiries');
    if (tbl) {
      tbl.innerHTML = enquiries.enquiries?.length ? enquiries.enquiries.slice(0,5).map(e=>`
        <tr>
          <td><strong>${esc(e.name)}</strong></td>
          <td>${esc(e.phone)}</td>
          <td>${esc(e.product)||'—'}</td>
          <td><span class="badge badge-${esc(e.status)}">${esc(e.status)}</span></td>
          <td>${new Date(e.created_at).toLocaleDateString('en-IN')}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty">No enquiries yet</td></tr>';
    }
  }
  if (Array.isArray(products)) {
    const el = document.getElementById('statProducts');
    if (el) el.textContent = products.filter(p => p.is_active).length;
  }
}

// ── PASSWORD CHANGE ────────────────────────────────────────────────────────
async function changePassword(e) {
  e.preventDefault();
  const current = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  if (newPass !== confirmPass) { showToast('New passwords do not match', 'error'); return; }
  if (newPass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  const res = await apiCall('POST', '/auth/change-password', { current, newPassword: newPass });
  if (!res || res.error) { showToast(res?.error || 'Failed', 'error'); return; }
  showToast('Password changed successfully');
  e.target.reset();
}

// ── PAGINATION HELPER ─────────────────────────────────────────────────────
function renderPagination(containerId, totalPages, current, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!totalPages || totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const b = document.createElement('button');
    b.className = 'page-btn' + (i === current ? ' active' : '');
    b.textContent = i;
    b.addEventListener('click', () => onPage(i));
    el.appendChild(b);
  }
}

// ── GENERIC CRUD (solutions, industries, brands, resources, banners) ─────
const CRUD = {
  solutions: { label: 'Solution', table: 'solutionsTable', cols: ['title','slug'], slug: 'title', file: 'Image', fields: [
    ['title','Title *','text',1],['icon','Icon (emoji)','text'],['number','Number (e.g. 01)','text'],['short_desc','Short Description','text'],['description','Description','textarea'] ] },
  industries: { label: 'Industry', table: 'industriesTable', cols: ['title','slug'], slug: 'title', file: 'Image', fields: [
    ['title','Title *','text',1],['icon','Icon (emoji)','text'],['gradient_from','Gradient From','text'],['gradient_to','Gradient To','text'],['short_desc','Short Description','text'],['description','Description','textarea'] ] },
  brands: { label: 'Brand', table: 'brandsTable', cols: ['name','description','website'], file: 'Logo', fields: [
    ['name','Name *','text',1],['description','Description','textarea'],['website','Website','text'] ] },
  resources: { label: 'Resource', table: 'resourcesTable', cols: ['title','category','file_url'], file: 'File (image/PDF)', fields: [
    ['title','Title *','text',1],['icon','Icon (emoji)','text'],['category','Category','select',0,['guide','datasheet','calculator','checklist','procedure']],['description','Description','textarea'],['file_url','File URL (or upload below)','text'] ] },
  banners: { label: 'Banner', table: 'bannersTable', cols: ['title','subtitle','cta1_label'], file: 'Image', fields: [
    ['title','Title *','text',1],['subtitle','Subtitle','text'],['badge','Badge','text'],['cta1_label','Button 1 Label','text'],['cta1_link','Button 1 Link','text'],['cta2_label','Button 2 Label','text'],['cta2_link','Button 2 Link','text'] ] }
};
let crudState = { endpoint: null, id: null, rows: [] };

async function loadSimpleList(endpoint) {
  const c = CRUD[endpoint];
  const tbody = document.getElementById(c.table);
  if (!tbody) return;
  const data = await apiCall('GET', `/${endpoint}/_all`);
  if (!data) return;
  if (data.error) { showToast(data.error, 'error'); return; }
  crudState.rows = crudState.endpoint === endpoint ? crudState.rows : [];
  CRUD[endpoint].rows = data;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="${c.cols.length+2}" class="empty">No items yet. Click + Add to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(item => `
    <tr>
      ${c.cols.map(f => `<td>${esc(item[f]) || '—'}</td>`).join('')}
      <td><span class="badge badge-${item.is_active!==false?'replied':'closed'}">${item.is_active!==false?'Active':'Hidden'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" data-act="edit" data-ep="${endpoint}" data-id="${esc(item.id)}">Edit</button>
        <button class="btn btn-sm btn-danger" data-act="del" data-ep="${endpoint}" data-id="${esc(item.id)}">Del</button>
      </td>
    </tr>`).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  if (b.dataset.act === 'edit') openCrud(b.dataset.ep, b.dataset.id);
  if (b.dataset.act === 'del') deleteItem(b.dataset.ep, b.dataset.id);
});

function ensureCrudModal() {
  if (document.getElementById('crudModal')) return;
  const d = document.createElement('div');
  d.className = 'modal-overlay';
  d.id = 'crudModal';
  d.innerHTML = `<div class="modal"><div class="modal-header"><h2 id="crudTitle"></h2><button class="modal-close" type="button">×</button></div>
    <form id="crudForm"><div class="form-grid" id="crudFields"></div>
    <div class="form-group full" style="margin-top:1rem;"><label id="crudFileLabel"></label><input type="file" id="crudFile" accept="image/*,application/pdf"/></div>
    <div class="form-group full"><label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;"><input type="checkbox" id="crudActive" checked style="width:auto;"/> Active (visible on website)</label></div>
    <div style="display:flex;gap:.75rem;margin-top:1rem;"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-outline" id="crudCancel">Cancel</button></div></form></div>`;
  document.body.appendChild(d);
  document.getElementById('crudCancel').addEventListener('click', () => closeModal('crudModal'));
  document.getElementById('crudForm').addEventListener('submit', ev => { ev.preventDefault(); saveCrud(); });
}

function openCrud(endpoint, id = null) {
  ensureCrudModal();
  const c = CRUD[endpoint];
  const item = id ? (c.rows || []).find(r => r.id === id) : null;
  if (id && !item) return;
  crudState = { endpoint, id, rows: c.rows || [] };
  document.getElementById('crudTitle').textContent = `${id ? 'Edit' : 'Add'} ${c.label}`;
  document.getElementById('crudFileLabel').textContent = c.file;
  document.getElementById('crudFile').value = '';
  document.getElementById('crudActive').checked = item ? item.is_active !== false : true;
  document.getElementById('crudFields').innerHTML = c.fields.map(([k, label, type, req, opts]) => {
    const v = item ? (item[k] ?? '') : '';
    const full = type === 'textarea' ? ' full' : '';
    let input;
    if (type === 'textarea') input = `<textarea data-k="${k}" rows="3">${esc(v)}</textarea>`;
    else if (type === 'select') input = `<select data-k="${k}">${opts.map(o => `<option value="${o}"${(v || opts[0]) === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
    else input = `<input type="text" data-k="${k}" value="${esc(v)}"${req ? ' required' : ''}/>`;
    return `<div class="form-group${full}"><label>${label}</label>${input}</div>`;
  }).join('');
  openModal('crudModal');
}

async function saveCrud() {
  const { endpoint, id } = crudState;
  const c = CRUD[endpoint];
  const data = { is_active: document.getElementById('crudActive').checked };
  document.querySelectorAll('#crudFields [data-k]').forEach(el => { data[el.dataset.k] = el.value.trim(); });
  const first = c.fields[0][0];
  if (!data[first]) { showToast(`${c.fields[0][1].replace(' *','')} is required`, 'error'); return; }
  if (c.slug && !id) data.slug = data[c.slug].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Date.now().toString(36);
  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  const f = document.getElementById('crudFile').files[0];
  if (f) fd.append('image', f);
  const res = id ? await apiCall('PUT', `/${endpoint}/${id}`, fd, true) : await apiCall('POST', `/${endpoint}`, fd, true);
  if (!res || res.error) { showToast(res?.error || 'Save failed', 'error'); return; }
  closeModal('crudModal');
  showToast(id ? `${c.label} updated` : `${c.label} created`);
  loadSimpleList(endpoint);
}

async function deleteItem(endpoint, id) {
  if (!confirm('Delete this item?')) return;
  const r = await apiCall('DELETE', `/${endpoint}/${id}`);
  if (r?.error) { showToast(r.error, 'error'); return; }
  loadSimpleList(endpoint);
  showToast('Deleted');
}
