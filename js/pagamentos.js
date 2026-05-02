import * as api from './api.js';
import { formatCurrency, formatDate, statusBadge, escHtml, debounce } from './utils.js';

let allPagamentos = [];

export async function renderPagamentos(container) {
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input"><i data-lucide="search"></i><input id="pagSearch" placeholder="Buscar cliente ou imóvel..." /></div>
        <select class="filter-select" id="pagFiltroMes" title="Filtrar por mês"></select>
        <select class="filter-select" id="pagFiltroStatus">
          <option value="">Todos</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Cliente</th><th>Imóvel</th><th>Mês Ref.</th><th>Vencimento</th><th>Pagamento</th><th>Valor</th><th>Status</th><th>Obs</th></tr></thead>
        <tbody id="pagTbody"><tr><td colspan="8"><div class="spinner" style="margin:30px auto"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons({ nodes: [container] });
  document.getElementById('pagSearch').addEventListener('input', debounce(filterPag, 300));
  document.getElementById('pagFiltroMes').addEventListener('change', filterPag);
  document.getElementById('pagFiltroStatus').addEventListener('change', filterPag);
  await loadPagamentos();
}

async function loadPagamentos() {
  try {
    allPagamentos = (await api.getAllPagamentos()).data || [];
    populateMesFilter();
    renderPagTable(allPagamentos);
  } catch (e) {
    document.getElementById('pagTbody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i data-lucide="wifi-off"></i><h3>Erro</h3><p>${escHtml(e.message)}</p></div></td></tr>`;
    lucide.createIcons({ nodes: [document.getElementById('pagTbody')] });
  }
}

function populateMesFilter() {
  const sel = document.getElementById('pagFiltroMes');
  if (!sel) return;
  const meses = [...new Set(allPagamentos.map(p => p.mesReferencia).filter(Boolean))].sort().reverse();
  sel.innerHTML = `<option value="">Todos os meses</option>` + meses.map(m => `<option value="${m}">${m}</option>`).join('');
}

function filterPag() {
  const q = (document.getElementById('pagSearch')?.value || '').toLowerCase();
  const mes = document.getElementById('pagFiltroMes')?.value || '';
  const st = document.getElementById('pagFiltroStatus')?.value || '';
  let list = allPagamentos;
  if (q) list = list.filter(p => (p.clienteNome||'').toLowerCase().includes(q) || (p.imovel||'').toLowerCase().includes(q));
  if (mes) list = list.filter(p => p.mesReferencia === mes);
  if (st) list = list.filter(p => p.status === st);
  renderPagTable(list);
}

function renderPagTable(list) {
  const tbody = document.getElementById('pagTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i data-lucide="receipt"></i><h3>Nenhum pagamento</h3><p>Os pagamentos registrados aparecerão aqui.</p></div></td></tr>`;
    lucide.createIcons({ nodes: [tbody] }); return;
  }
  tbody.innerHTML = list.map(p => `<tr>
    <td>${escHtml(p.clienteNome||'—')}</td>
    <td style="font-size:12px;color:var(--text2)">${escHtml(p.imovel||'—')}</td>
    <td>${p.mesReferencia||'—'}</td>
    <td>${formatDate(p.dataVencimento)}</td>
    <td>${p.dataPagamento ? formatDate(p.dataPagamento) : '—'}</td>
    <td style="font-weight:600;color:var(--success)">${formatCurrency(p.valor)}</td>
    <td>${statusBadge(p.status||'pendente')}</td>
    <td style="font-size:12px;color:var(--text2)">${escHtml(p.observacoes||'')}</td>
  </tr>`).join('');
}
