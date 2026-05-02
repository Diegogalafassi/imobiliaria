import * as api from './api.js';
import { formatCurrency, formatDate, getInitials, avatarColor, statusBadge, toast, openModal, closeModal, confirmDialog, escHtml, debounce, getContractStatus } from './utils.js';

let allContratos = [];
let allClientes = [];

export async function renderContratos(container) {
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input"><i data-lucide="search"></i><input id="contratoSearch" placeholder="Buscar imóvel ou cliente..." /></div>
        <select class="filter-select" id="contratoFiltro">
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="vencendo">Vencendo</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="btnNovoContrato"><i data-lucide="plus"></i>Novo Contrato</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Cliente</th><th>Imóvel</th><th>Valor</th><th>Dia Venc.</th><th>Status</th><th>Período</th><th style="text-align:right">Ações</th></tr></thead>
        <tbody id="contratosTbody"><tr><td colspan="7"><div class="spinner" style="margin:30px auto"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons({ nodes: [container] });
  document.getElementById('btnNovoContrato').addEventListener('click', () => openContratoModal());
  document.getElementById('contratoSearch').addEventListener('input', debounce(filterContratos, 300));
  document.getElementById('contratoFiltro').addEventListener('change', filterContratos);
  await loadContratos();
}

async function loadContratos() {
  try {
    const [cRes, clRes] = await Promise.all([api.getContratos(), api.getClientes()]);
    allContratos = cRes.data || [];
    allClientes = clRes.data || [];
    renderContratosTable(allContratos);
  } catch (e) {
    document.getElementById('contratosTbody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i data-lucide="wifi-off"></i><h3>Erro ao carregar</h3><p>${escHtml(e.message)}</p></div></td></tr>`;
    lucide.createIcons({ nodes: [document.getElementById('contratosTbody')] });
  }
}

function filterContratos() {
  const q = (document.getElementById('contratoSearch')?.value || '').toLowerCase();
  const st = document.getElementById('contratoFiltro')?.value || '';
  let list = allContratos;
  if (q) list = list.filter(c => (c.clienteNome||'').toLowerCase().includes(q) || (c.imovel||'').toLowerCase().includes(q));
  if (st) list = list.filter(c => (c.statusAtual||'') === st);
  renderContratosTable(list);
}

function renderContratosTable(list) {
  const tbody = document.getElementById('contratosTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i data-lucide="file-text"></i><h3>Nenhum contrato encontrado</h3><p>Clique em "Novo Contrato" para cadastrar.</p></div></td></tr>`;
    lucide.createIcons({ nodes: [tbody] }); return;
  }
  tbody.innerHTML = list.map(c => {
    const cor = avatarColor(c.clienteNome);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${cor}20;color:${cor};font-size:12px">${getInitials(c.clienteNome)}</div>
          <span>${escHtml(c.clienteNome||'—')}</span>
        </div>
      </td>
      <td>${escHtml(c.imovel||'—')}</td>
      <td style="font-weight:600;color:var(--accent-light)">${formatCurrency(c.valor)}</td>
      <td>Dia ${c.diaVencimento||'—'}</td>
      <td>${statusBadge(c.statusAtual||'pendente')}</td>
      <td style="font-size:12px;color:var(--text2)">${formatDate(c.dataInicio)} → ${c.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}</td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-icon btn-sm" title="Ver detalhes" onclick="window.__viewContrato('${c.id}')"><i data-lucide="eye"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="window.__editContrato('${c.id}')"><i data-lucide="pencil"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" title="Excluir" onclick="window.__deleteContrato('${c.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons({ nodes: [tbody] });
}

async function openContratoModal(id = null) {
  let c = { clienteId:'', imovel:'', valor:'', diaVencimento:'', dataInicio:'', dataFim:'', observacoes:'' };
  if (id) { try { c = (await api.getContrato(id)).data || c; } catch {} }
  const clienteOpts = allClientes.map(cl => `<option value="${cl.id}" ${cl.id===c.clienteId?'selected':''}>${escHtml(cl.nome)}</option>`).join('');
  const body = `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Cliente <span>*</span></label>
        <select class="form-input" id="fCliId"><option value="">Selecione...</option>${clienteOpts}</select>
      </div>
      <div class="form-group full">
        <label class="form-label">Endereço / Imóvel <span>*</span></label>
        <input class="form-input" id="fImovel" value="${escHtml(c.imovel)}" placeholder="Ex: Rua das Flores, 123 - Apto 201" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor do aluguel (R$) <span>*</span></label>
        <input class="form-input" type="number" id="fValor" value="${c.valor||''}" placeholder="0,00" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label class="form-label">Dia de vencimento <span>*</span></label>
        <input class="form-input" type="number" id="fDia" value="${c.diaVencimento||''}" placeholder="Ex: 5" min="1" max="28" />
      </div>
      <div class="form-group">
        <label class="form-label">Data de início</label>
        <input class="form-input" type="date" id="fInicio" value="${c.dataInicio||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Data de término</label>
        <input class="form-input" type="date" id="fFim" value="${c.dataFim||''}" />
      </div>
      <div class="form-group full">
        <label class="form-label">Observações</label>
        <textarea class="form-input" id="fObs" rows="2" placeholder="Informações adicionais...">${escHtml(c.observacoes)}</textarea>
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-ghost" onclick="import('./utils.js').then(m=>m.closeModal())">Cancelar</button>
    <button class="btn btn-primary" id="btnSalvarContrato"><i data-lucide="save"></i>${id ? 'Salvar' : 'Criar Contrato'}</button>`;
  await openModal(id ? 'Editar Contrato' : 'Novo Contrato', body, footer);
  document.getElementById('btnSalvarContrato')?.addEventListener('click', async () => {
    const clienteId = document.getElementById('fCliId').value;
    const imovel = document.getElementById('fImovel').value.trim();
    const valor = parseFloat(document.getElementById('fValor').value);
    const diaVencimento = parseInt(document.getElementById('fDia').value);
    if (!clienteId || !imovel || !valor || !diaVencimento) { toast('Preencha os campos obrigatórios.', 'error'); return; }
    const payload = { clienteId, imovel, valor, diaVencimento, dataInicio: document.getElementById('fInicio').value, dataFim: document.getElementById('fFim').value, observacoes: document.getElementById('fObs').value.trim() };
    if (id) payload.id = id;
    try {
      await api.saveContrato(payload);
      toast(id ? 'Contrato atualizado!' : 'Contrato criado!', 'success');
      closeModal(); await loadContratos();
    } catch (e) { toast(e.message, 'error'); }
  });
}

export async function renderContratoDetalhe(container, id) {
  container.innerHTML = `<div class="spinner" style="margin:80px auto"></div>`;
  try {
    const [cRes, pRes] = await Promise.all([api.getContrato(id), api.getPagamentos(id)]);
    const c = cRes.data;
    const pags = pRes.data || [];
    const cor = avatarColor(c.clienteNome);
    container.innerHTML = `
      <div class="detail-header">
        <a href="#contratos" class="back-btn"><i data-lucide="arrow-left"></i>Contratos</a>
        <h2 class="detail-title">${escHtml(c.imovel)}</h2>
        ${statusBadge(c.statusAtual||'pendente')}
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="window.__editContrato('${id}')"><i data-lucide="pencil"></i>Editar</button>
          <button class="btn btn-success btn-sm" id="btnRegPag"><i data-lucide="plus"></i>Registrar Pagamento</button>
        </div>
      </div>
      <div class="detail-grid" style="margin-bottom:24px">
        <div class="card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div class="avatar" style="background:${cor}20;color:${cor};width:48px;height:48px;font-size:18px">${getInitials(c.clienteNome)}</div>
            <div>
              <div style="font-weight:600;font-size:16px">${escHtml(c.clienteNome)}</div>
              <div style="font-size:13px;color:var(--text2)">Cliente</div>
            </div>
          </div>
          <div class="detail-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin:0">
            <div class="detail-item"><label>Valor</label><span style="color:var(--success)">${formatCurrency(c.valor)}</span></div>
            <div class="detail-item"><label>Dia Venc.</label><span>Dia ${c.diaVencimento}</span></div>
            <div class="detail-item"><label>Início</label><span>${formatDate(c.dataInicio)}</span></div>
            <div class="detail-item"><label>Término</label><span>${c.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}</span></div>
          </div>
          ${c.observacoes ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--card-border);font-size:13px;color:var(--text2)">${escHtml(c.observacoes)}</div>` : ''}
        </div>
      </div>
      <div class="section-header"><span class="section-title">Histórico de Pagamentos</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Mês Ref.</th><th>Vencimento</th><th>Pagamento</th><th>Valor</th><th>Status</th><th>Obs</th><th></th></tr></thead>
          <tbody id="pagTbody">${renderPagRows(pags)}</tbody>
        </table>
      </div>`;
    lucide.createIcons({ nodes: [container] });
    document.getElementById('btnRegPag').addEventListener('click', () => openPagamentoModal(id, c.valor, c.clienteId));
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Erro</h3><p>${escHtml(e.message)}</p></div>`;
    lucide.createIcons({ nodes: [container] });
  }
}

function renderPagRows(pags) {
  if (!pags.length) return `<tr><td colspan="7"><div class="empty-state" style="padding:30px"><i data-lucide="receipt"></i><h3>Nenhum pagamento registrado</h3></div></td></tr>`;
  return pags.map(p => `<tr>
    <td>${p.mesReferencia||'—'}</td>
    <td>${formatDate(p.dataVencimento)}</td>
    <td>${p.dataPagamento ? formatDate(p.dataPagamento) : '—'}</td>
    <td style="color:var(--success);font-weight:600">${formatCurrency(p.valor)}</td>
    <td>${statusBadge(p.status||'pendente')}</td>
    <td style="font-size:12px;color:var(--text2)">${escHtml(p.observacoes||'')}</td>
    <td><button class="btn btn-danger btn-icon btn-sm" onclick="window.__deletePag('${p.id}')"><i data-lucide="trash-2"></i></button></td>
  </tr>`).join('');
}

async function openPagamentoModal(contratoId, valorPadrao, clienteId) {
  const hoje = new Date().toISOString().split('T')[0];
  const mesRef = hoje.substring(0,7);
  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Mês de Referência <span>*</span></label>
        <input class="form-input" type="month" id="pMes" value="${mesRef}" />
      </div>
      <div class="form-group">
        <label class="form-label">Data do Pagamento</label>
        <input class="form-input" type="date" id="pData" value="${hoje}" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor (R$) <span>*</span></label>
        <input class="form-input" type="number" id="pValor" value="${valorPadrao||''}" min="0" step="0.01" />
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-input" id="pStatus">
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Observações</label>
        <input class="form-input" id="pObs" placeholder="Ex: Pago via PIX" />
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-ghost" onclick="import('./utils.js').then(m=>m.closeModal())">Cancelar</button>
    <button class="btn btn-success" id="btnSalvarPag"><i data-lucide="check"></i>Registrar</button>`;
  await openModal('Registrar Pagamento', body, footer);
  document.getElementById('btnSalvarPag')?.addEventListener('click', async () => {
    const mesReferencia = document.getElementById('pMes').value;
    const valor = parseFloat(document.getElementById('pValor').value);
    if (!mesReferencia || !valor) { toast('Preencha os campos obrigatórios.', 'error'); return; }
    try {
      await api.savePagamento({ contratoId, clienteId, mesReferencia, dataPagamento: document.getElementById('pData').value, valor, status: document.getElementById('pStatus').value, observacoes: document.getElementById('pObs').value.trim() });
      toast('Pagamento registrado!', 'success');
      closeModal();
      const pRes = await api.getPagamentos(contratoId);
      const tbody = document.getElementById('pagTbody');
      if (tbody) { tbody.innerHTML = renderPagRows(pRes.data || []); lucide.createIcons({ nodes: [tbody] }); }
    } catch (e) { toast(e.message, 'error'); }
  });
}

window.__viewContrato = id => { window.location.hash = `#contrato-detalhe-${id}`; };
window.__editContrato = id => openContratoModal(id);
window.__deleteContrato = async id => {
  const ok = await confirmDialog('Excluir este contrato? O histórico de pagamentos também será removido.');
  if (!ok) return;
  try { await api.deleteContrato(id); toast('Contrato excluído.', 'success'); await loadContratos(); } catch (e) { toast(e.message, 'error'); }
};
window.__deletePag = async id => {
  const ok = await confirmDialog('Excluir este pagamento?');
  if (!ok) return;
  try { await api.deletePagamento(id); toast('Pagamento excluído.', 'success'); window.location.reload(); } catch (e) { toast(e.message, 'error'); }
};
