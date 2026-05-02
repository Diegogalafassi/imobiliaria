// ===== UTILITIES =====

export function formatCurrency(value) {
  const n = parseFloat(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toISOString().split('T')[0];
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function daysBetween(dateStr1, dateStr2) {
  const a = new Date(dateStr1 + 'T12:00:00');
  const b = new Date(dateStr2 + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function avatarColor(name) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#06b6d4','#f97316'];
  let h = 0;
  for (let c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function getContractStatus(diaVencimento, pagamentos = []) {
  const today = new Date();
  const mes = today.getMonth() + 1;
  const ano = today.getFullYear();
  const refKey = `${ano}-${String(mes).padStart(2,'0')}`;

  const pagMes = pagamentos.find(p => p.mesReferencia === refKey);
  if (pagMes) return 'pago';

  const vencimento = new Date(ano, mes - 1, parseInt(diaVencimento));
  const diff = Math.round((vencimento - today) / 86400000);
  if (diff < 0) return 'vencido';
  if (diff <= 5) return 'vencendo';
  return 'pendente';
}

export function statusBadge(status) {
  const map = {
    pago: ['badge-success', 'Pago'],
    pendente: ['badge-neutral', 'Pendente'],
    vencendo: ['badge-warning', 'Vencendo'],
    vencido: ['badge-danger', 'Vencido'],
    ativo: ['badge-success', 'Ativo'],
    inativo: ['badge-neutral', 'Inativo'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ===== TOAST =====
export function toast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span class="toast-msg">${escHtml(msg)}</span>`;
  container.appendChild(el);
  lucide.createIcons({ nodes: [el] });
  const hide = () => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 300);
  };
  setTimeout(hide, duration);
  el.addEventListener('click', hide);
}

// ===== MODAL =====
let modalResolve = null;

export function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').classList.add('open');
  lucide.createIcons({ nodes: [document.getElementById('modal')] });
  return new Promise(res => { modalResolve = res; });
}

export function closeModal(value) {
  document.getElementById('modalOverlay').classList.remove('open');
  if (modalResolve) { modalResolve(value); modalResolve = null; }
}

export function confirmDialog(msg) {
  const body = `<p style="font-size:15px;color:var(--text2);line-height:1.6">${escHtml(msg)}</p>`;
  const footer = `
    <button class="btn btn-ghost" onclick="import('./utils.js').then(m=>m.closeModal(false))">Cancelar</button>
    <button class="btn btn-danger" onclick="import('./utils.js').then(m=>m.closeModal(true))">Confirmar</button>`;
  return openModal('Confirmar ação', body, footer);
}

// ===== LOADING =====
export function setLoading(show) {
  const el = document.getElementById('loadingScreen');
  if (el) el.style.display = show ? 'flex' : 'none';
}
