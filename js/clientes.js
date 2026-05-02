import * as api from './api.js';
import { formatDate, getInitials, avatarColor, statusBadge, toast, openModal, closeModal, confirmDialog, escHtml, debounce } from './utils.js';

let allClientes = [];

export async function renderClientes(container) {
  container.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-input"><i data-lucide="search"></i><input id="clienteSearch" placeholder="Buscar por nome, telefone ou email..." /></div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" id="btnNovoCliente"><i data-lucide="plus"></i>Novo Cliente</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Cliente</th><th>Telefone</th><th>Email</th><th>Cadastro</th><th>Contratos</th><th style="text-align:right">Ações</th></tr></thead>
        <tbody id="clientesTbody"><tr><td colspan="6"><div class="spinner" style="margin:30px auto"></div></td></tr></tbody>
      </table>
    </div>`;
  lucide.createIcons({ nodes: [container] });

  document.getElementById('btnNovoCliente').addEventListener('click', () => openClienteModal());
  document.getElementById('clienteSearch').addEventListener('input', debounce(filterClientes, 300));

  await loadClientes();
}

async function loadClientes() {
  try {
    allClientes = (await api.getClientes()).data || [];
    renderClientesTable(allClientes);
  } catch (e) {
    document.getElementById('clientesTbody').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="wifi-off"></i><h3>Erro ao carregar</h3><p>${escHtml(e.message)}</p></div></td></tr>`;
    lucide.createIcons({ nodes: [document.getElementById('clientesTbody')] });
  }
}

function filterClientes() {
  const q = document.getElementById('clienteSearch')?.value?.toLowerCase() || '';
  const filtered = q ? allClientes.filter(c =>
    (c.nome||'').toLowerCase().includes(q) ||
    (c.telefone||'').toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q)
  ) : allClientes;
  renderClientesTable(filtered);
}

function renderClientesTable(list) {
  const tbody = document.getElementById('clientesTbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i data-lucide="users"></i><h3>Nenhum cliente encontrado</h3><p>Clique em "Novo Cliente" para cadastrar.</p></div></td></tr>`;
    lucide.createIcons({ nodes: [tbody] });
    return;
  }
  tbody.innerHTML = list.map(c => {
    const cor = avatarColor(c.nome);
    const ini = getInitials(c.nome);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="background:${cor}20;color:${cor}">${ini}</div>
          <span>${escHtml(c.nome)}</span>
        </div>
      </td>
      <td>${escHtml(c.telefone)||'—'}</td>
      <td>${escHtml(c.email)||'—'}</td>
      <td>${formatDate(c.dataCadastro)}</td>
      <td><span class="badge badge-accent">${c.totalContratos||0} contrato(s)</span></td>
      <td>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="window.__editCliente('${c.id}')"><i data-lucide="pencil"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" title="Excluir" onclick="window.__deleteCliente('${c.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons({ nodes: [tbody] });
}

async function openClienteModal(id = null) {
  let cliente = { nome:'', telefone:'', email:'', observacoes:'' };
  if (id) {
    try { cliente = (await api.getCliente(id)).data || cliente; } catch {}
  }
  const body = `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Nome completo <span>*</span></label>
        <input class="form-input" id="fNome" value="${escHtml(cliente.nome)}" placeholder="Ex: João da Silva" required />
      </div>
      <div class="form-group">
        <label class="form-label">Telefone / WhatsApp</label>
        <input class="form-input" id="fTel" value="${escHtml(cliente.telefone)}" placeholder="(00) 00000-0000" />
      </div>
      <div class="form-group">
        <label class="form-label">E-mail</label>
        <input class="form-input" type="email" id="fEmail" value="${escHtml(cliente.email)}" placeholder="email@exemplo.com" />
      </div>
      <div class="form-group full">
        <label class="form-label">Observações</label>
        <textarea class="form-input" id="fObs" rows="3" placeholder="Informações adicionais...">${escHtml(cliente.observacoes)}</textarea>
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-ghost" onclick="import('./utils.js').then(m=>m.closeModal())">Cancelar</button>
    <button class="btn btn-primary" id="btnSalvarCliente"><i data-lucide="save"></i>${id ? 'Salvar' : 'Cadastrar'}</button>`;
  await openModal(id ? 'Editar Cliente' : 'Novo Cliente', body, footer);
  document.getElementById('btnSalvarCliente')?.addEventListener('click', async () => {
    const nome = document.getElementById('fNome').value.trim();
    if (!nome) { toast('Nome é obrigatório.', 'error'); return; }
    const payload = { nome, telefone: document.getElementById('fTel').value.trim(), email: document.getElementById('fEmail').value.trim(), observacoes: document.getElementById('fObs').value.trim() };
    if (id) payload.id = id;
    try {
      await api.saveCliente(payload);
      toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
      closeModal();
      await loadClientes();
    } catch (e) { toast(e.message, 'error'); }
  });
}

window.__editCliente = id => openClienteModal(id);
window.__deleteCliente = async id => {
  const ok = await confirmDialog('Tem certeza que deseja excluir este cliente? Os contratos vinculados também serão afetados.');
  if (!ok) return;
  try { await api.deleteCliente(id); toast('Cliente excluído.', 'success'); await loadClientes(); }
  catch (e) { toast(e.message, 'error'); }
};
