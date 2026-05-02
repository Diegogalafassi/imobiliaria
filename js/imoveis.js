import * as api from './api.js';
import { formatCurrency, formatDate, avatarColor, getInitials, statusBadge, toast, openModal, closeModal, confirmDialog, escHtml, debounce } from './utils.js';

let allImoveis = [];

export async function renderImoveis(container) {
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input"><i data-lucide="search"></i><input id="imovelSearch" placeholder="Buscar por imóvel..." /></div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="btnNovoImovel"><i data-lucide="plus"></i>Novo Imóvel</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Imóvel</th><th>Mês Reajuste</th><th>Dia Venc.</th><th>Valor Padrão</th><th>Contratos Vinculados</th><th style="text-align:right">Ações</th></tr></thead>
        <tbody id="imoveisTbody"><tr><td colspan="6"><div class="spinner" style="margin:30px auto"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons({ nodes: [container] });

  document.getElementById('btnNovoImovel').addEventListener('click', () => openImovelModal());
  document.getElementById('imovelSearch').addEventListener('input', debounce(filterImoveis, 300));

  await loadImoveis();
}

async function loadImoveis() {
  try {
    allImoveis = (await api.getImoveis()).data || [];
    renderImoveisTable(allImoveis);
  } catch (e) {
    document.getElementById('imoveisTbody').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="wifi-off"></i><h3>Erro ao carregar</h3><p>${escHtml(e.message)}</p></div></td></tr>`;
    lucide.createIcons({ nodes: [document.getElementById('imoveisTbody')] });
  }
}

function filterImoveis() {
  const q = document.getElementById('imovelSearch')?.value?.toLowerCase() || '';
  const filtered = q ? allImoveis.filter(i =>
    (i.nome||'').toLowerCase().includes(q)
  ) : allImoveis;
  renderImoveisTable(filtered);
}

function renderImoveisTable(list) {
  const tbody = document.getElementById('imoveisTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="home"></i><h3>Nenhum imóvel encontrado</h3><p>Clique em "Novo Imóvel" para cadastrar.</p></div></td></tr>`;
    lucide.createIcons({ nodes: [tbody] });
    return;
  }
  tbody.innerHTML = list.map(i => {
    const cor = avatarColor(i.nome);
    const ini = getInitials(i.nome);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${cor}20;color:${cor}">${ini}</div>
          <span>${escHtml(i.nome)}</span>
        </div>
      </td>
      <td>${i.mesReajuste ? String(i.mesReajuste).padStart(2, '0') : '—'}</td>
      <td>Dia ${i.diaVencimentoPadrao || '—'}</td>
      <td style="font-weight:600;color:var(--accent-light)">${formatCurrency(i.valorPadrao)}</td>
      <td><span class="badge badge-accent">${i.totalContratos||0} contrato(s)</span></td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="window.__editImovel('${i.id}')"><i data-lucide="pencil"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" title="Excluir" onclick="window.__deleteImovel('${i.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons({ nodes: [tbody] });
}

async function openImovelModal(id = null) {
  let imovel = { nome:'', mesReajuste:'', diaVencimentoPadrao:'', valorPadrao:'', observacoes:'' };
  if (id) {
    try { imovel = (await api.getImovel(id)).data || imovel; } catch {}
  }
  const body = `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Nome / Identificação do Imóvel <span>*</span></label>
        <input class="form-input" id="fNomeImovel" value="${escHtml(imovel.nome)}" placeholder="Ex: VILLA TOSCANA 701" required />
      </div>
      <div class="form-group">
        <label class="form-label">Mês de Reajuste</label>
        <input class="form-input" type="number" id="fMesReajuste" value="${imovel.mesReajuste||''}" placeholder="Ex: 8 (Agosto)" min="1" max="12" />
      </div>
      <div class="form-group">
        <label class="form-label">Dia de Vencimento Padrão</label>
        <input class="form-input" type="number" id="fDiaPadrao" value="${imovel.diaVencimentoPadrao||''}" placeholder="Ex: 5" min="1" max="31" />
      </div>
      <div class="form-group">
        <label class="form-label">Valor de Locação Padrão (R$)</label>
        <input class="form-input" type="number" id="fValorPadrao" value="${imovel.valorPadrao||''}" placeholder="0,00" min="0" step="0.01" />
      </div>
      <div class="form-group full">
        <label class="form-label">Observações</label>
        <textarea class="form-input" id="fObsImovel" rows="2" placeholder="Informações adicionais...">${escHtml(imovel.observacoes)}</textarea>
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-ghost" onclick="import('./utils.js').then(m=>m.closeModal())">Cancelar</button>
    <button class="btn btn-primary" id="btnSalvarImovel"><i data-lucide="save"></i>${id ? 'Salvar' : 'Cadastrar'}</button>`;
  openModal(id ? 'Editar Imóvel' : 'Novo Imóvel', body, footer);
  
  document.getElementById('btnSalvarImovel')?.addEventListener('click', async () => {
    const nome = document.getElementById('fNomeImovel').value.trim();
    if (!nome) { toast('O nome do imóvel é obrigatório.', 'error'); return; }
    const payload = { 
      nome, 
      mesReajuste: document.getElementById('fMesReajuste').value, 
      diaVencimentoPadrao: document.getElementById('fDiaPadrao').value, 
      valorPadrao: document.getElementById('fValorPadrao').value,
      observacoes: document.getElementById('fObsImovel').value.trim() 
    };
    if (id) payload.id = id;
    try {
      await api.saveImovel(payload);
      toast(id ? 'Imóvel atualizado!' : 'Imóvel cadastrado!', 'success');
      closeModal();
      await loadImoveis();
    } catch (e) { toast(e.message, 'error'); }
  });
}

window.__editImovel = id => openImovelModal(id);
window.__deleteImovel = async id => {
  const ok = await confirmDialog('Tem certeza que deseja excluir este imóvel? Os contratos vinculados poderão ficar sem referência.');
  if (!ok) return;
  try { await api.deleteImovel(id); toast('Imóvel excluído.', 'success'); await loadImoveis(); }
  catch (e) { toast(e.message, 'error'); }
};
