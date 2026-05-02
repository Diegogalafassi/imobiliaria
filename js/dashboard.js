import * as api from './api.js';
import { formatCurrency, formatDate, getInitials, avatarColor, statusBadge, toast, openModal, closeModal, confirmDialog, escHtml } from './utils.js';

// ===== DASHBOARD VIEW =====
export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="kpi-grid" id="kpiGrid">
      ${['','','',''].map(() => `<div class="kpi-card" style="min-height:110px"><div class="spinner" style="margin:auto;margin-top:30px"></div></div>`).join('')}
    </div>
    <div class="dash-grid" id="dashGrid">
      <div class="dash-col">
        <div class="card"><div class="spinner" style="margin:auto"></div></div>
      </div>
      <div class="dash-col">
        <div class="card"><div class="spinner" style="margin:auto"></div></div>
      </div>
    </div>`;

  try {
    const data = await api.getDashboard();
    renderKPIs(data);
    renderDashContent(data);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">
      <i data-lucide="wifi-off"></i>
      <h3>Não foi possível carregar os dados</h3>
      <p>${escHtml(e.message)}</p>
    </div>`;
    lucide.createIcons({ nodes: [container] });
  }
}

function renderKPIs(data) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  const cards = [
    { label: 'Contratos Ativos', value: data.totalAtivos || 0, icon: 'file-text', color: 'blue' },
    { label: 'Pagos este mês', value: data.pagosMes || 0, icon: 'check-circle', color: 'green' },
    { label: 'Vencendo (5 dias)', value: data.vencendo || 0, icon: 'clock', color: 'amber' },
    { label: 'Vencidos', value: data.vencidos || 0, icon: 'alert-circle', color: 'red' },
  ];
  grid.innerHTML = cards.map(c => `
    <div class="kpi-card ${c.color}">
      <div class="kpi-icon"><i data-lucide="${c.icon}"></i></div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
    </div>`).join('');
  lucide.createIcons({ nodes: [grid] });
}

function renderDashContent(data) {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;

  const vencimentos = (data.proximosVencimentos || []).slice(0, 8);
  const pagRecentes = (data.pagamentosRecentes || []).slice(0, 8);

  grid.innerHTML = `
    <div class="dash-col">
      <div class="card">
        <div class="section-header">
          <span class="section-title">⚠️ Alertas de Vencimento</span>
          <a href="#contratos" class="section-link">Ver todos</a>
        </div>
        ${vencimentos.length === 0 ? `<div class="empty-state" style="padding:30px">
          <i data-lucide="check-circle"></i><h3>Tudo em dia!</h3><p>Nenhum vencimento próximo.</p></div>` :
          vencimentos.map(v => {
            const isOver = v.diasRestantes < 0;
            const cls = isOver ? 'danger' : 'warning';
            const txt = isOver ? `Venceu há ${Math.abs(v.diasRestantes)} dia(s)` : `Vence em ${v.diasRestantes} dia(s)`;
            return `<div class="alert-item ${cls}">
              <div class="alert-icon"><i data-lucide="${isOver ? 'alert-circle' : 'clock'}"></i></div>
              <div class="alert-info">
                <div class="name">${escHtml(v.clienteNome)}</div>
                <div class="sub">${escHtml(v.imovel)} · Dia ${v.diaVencimento}</div>
              </div>
              <div class="alert-value" style="color:var(--${isOver ? 'danger':'warning'})">${txt}</div>
            </div>`;
          }).join('')}
      </div>
    </div>

    <div class="dash-col">
      <div class="card">
        <div class="section-header">
          <span class="section-title">✅ Pagamentos Recentes</span>
          <a href="#pagamentos" class="section-link">Ver todos</a>
        </div>
        ${pagRecentes.length === 0 ? `<div class="empty-state" style="padding:30px">
          <i data-lucide="receipt"></i><h3>Nenhum pagamento ainda</h3><p>Registre pagamentos nos contratos.</p></div>` :
          `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Cliente</th><th>Referência</th><th>Valor</th><th>Data</th></tr></thead>
            <tbody>${pagRecentes.map(p => `<tr>
              <td>${escHtml(p.clienteNome)}</td>
              <td>${p.mesReferencia || '—'}</td>
              <td style="color:var(--success);font-weight:600">${formatCurrency(p.valor)}</td>
              <td>${formatDate(p.dataPagamento)}</td>
            </tr>`).join('')}</tbody>
          </table></div>`}
      </div>

      <div class="card">
        <div class="section-header"><span class="section-title">💰 Receita do Mês</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:var(--text2)">Recebido</span>
          <span style="font-size:20px;font-weight:700;color:var(--success)">${formatCurrency(data.receitaMes || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:13px;color:var(--text2)">Previsto</span>
          <span style="font-size:15px;font-weight:600;color:var(--text2)">${formatCurrency(data.receitaPrevista || 0)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.min(100, Math.round(((data.receitaMes||0)/(data.receitaPrevista||1))*100))}%;background:var(--success)"></div>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px;text-align:right">
          ${Math.min(100,Math.round(((data.receitaMes||0)/(data.receitaPrevista||1))*100))}% do previsto
        </div>
      </div>
    </div>`;

  lucide.createIcons({ nodes: [grid] });
}
