import { renderDashboard } from './dashboard.js';
import { renderClientes } from './clientes.js';
import { renderImoveis } from './imoveis.js';
import { renderContratos, renderContratoDetalhe } from './contratos.js';
import { renderPagamentos } from './pagamentos.js';
import { renderConfiguracoes } from './configuracoes.js';
import { getApiUrl } from './api.js';

// ===== ROUTING =====
const routes = {
  dashboard:    { title: 'Dashboard',   nav: 'dashboard',   render: renderDashboard },
  clientes:     { title: 'Clientes',    nav: 'clientes',    render: renderClientes },
  imoveis:      { title: 'Imóveis',     nav: 'imoveis',     render: renderImoveis },
  contratos:    { title: 'Contratos',   nav: 'contratos',   render: renderContratos },
  pagamentos:   { title: 'Pagamentos',  nav: 'pagamentos',  render: renderPagamentos },
  configuracoes:{ title: 'Configurações',nav:'configuracoes',render: renderConfiguracoes },
};

let currentRoute = '';

async function navigate(hash) {
  hash = (hash || 'dashboard').replace(/^#/, '');

  // Special: contrato detail page
  if (hash.startsWith('contrato-detalhe-')) {
    const id = hash.replace('contrato-detalhe-', '');
    setActiveNav('contratos');
    setPageTitle('Detalhe do Contrato');
    const content = document.getElementById('pageContent');
    content.innerHTML = '';
    await renderContratoDetalhe(content, id);
    currentRoute = hash;
    return;
  }

  const route = routes[hash] || routes.dashboard;
  if (currentRoute === hash) return;
  currentRoute = hash;

  setActiveNav(route.nav);
  setPageTitle(route.title);

  const content = document.getElementById('pageContent');
  content.innerHTML = `<div class="loading-screen"><div class="spinner-wrap"><div class="spinner"></div><p>Carregando...</p></div></div>`;
  await route.render(content);
  lucide.createIcons({ nodes: [content] });

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  window.scrollTo(0, 0);
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${id}`)?.classList.add('active');
  document.getElementById(`bnav-${id}`)?.classList.add('active');
}

function setPageTitle(title) {
  document.getElementById('pageTitle').textContent = title;
  document.title = `${title} — Diego Imobiliária`;
}

// ===== DATE DISPLAY =====
function updateDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== SIDEBAR TOGGLE =====
function initSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  menuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ===== REFRESH BUTTON =====
function initRefresh() {
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    currentRoute = '';
    navigate(window.location.hash);
  });
}

// ===== MODAL CLOSE =====
function initModal() {
  document.getElementById('modalClose')?.addEventListener('click', () => {
    import('./utils.js').then(m => m.closeModal());
  });
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) {
      import('./utils.js').then(m => m.closeModal());
    }
  });
}

// ===== CONFIG ALERT =====
function checkConfig() {
  if (!getApiUrl()) {
    document.getElementById('configAlert').style.display = 'block';
  }
}

// ===== HASH ROUTING =====
window.addEventListener('hashchange', () => navigate(window.location.hash));

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateDate();
  setInterval(updateDate, 60000);
  initSidebar();
  initRefresh();
  initModal();
  checkConfig();
  navigate(window.location.hash || 'dashboard');
});
