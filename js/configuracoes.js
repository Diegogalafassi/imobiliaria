import * as api from './api.js';
import { getApiUrl, setApiUrl } from './api.js';
import { toast, openModal, closeModal, escHtml } from './utils.js';

export async function renderConfiguracoes(container) {
  const savedUrl = getApiUrl();
  let config = { emailAlerta: 'diegogalafassibc@gmail.com', diasAntecedencia: 5 };
  if (savedUrl) {
    try { config = (await api.getConfig()).data || config; } catch {}
  }

  container.innerHTML = `
    <div style="max-width:640px">

      <div class="settings-section">
        <h3>🔔 Configurações de Alertas</h3>
        <p>E-mail que receberá os avisos de vencimento e os alertas diários automáticos.</p>
        <div class="form-grid" style="grid-template-columns:1fr 1fr">
          <div class="form-group">
            <label class="form-label">E-mail de destino</label>
            <input class="form-input" id="cfgEmail" value="${escHtml(config.emailAlerta||'diegogalafassibc@gmail.com')}" placeholder="email@exemplo.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Dias de antecedência para alertar</label>
            <input class="form-input" type="number" id="cfgDias" value="${config.diasAntecedencia||5}" min="1" max="30" />
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btnSalvarConfig"><i data-lucide="save"></i>Salvar Configurações</button>
          <button class="btn btn-ghost" id="btnTestarAlerta"><i data-lucide="send"></i>Disparar verificação agora</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>📋 Guia de Instalação do Apps Script</h3>
        <p>Siga os passos abaixo para conectar o sistema à planilha Google Sheets:</p>
        <div class="card" style="padding:0">
          ${[
            ['1', 'Abra a planilha', 'Acesse a planilha <strong>BASE_IMOBILIARIA</strong> no Google Sheets'],
            ['2', 'Abra o Apps Script', 'Clique em <strong>Extensões → Apps Script</strong>'],
            ['3', 'Cole o código', 'Apague o código existente e cole o conteúdo do arquivo <strong>apps-script/Code.gs</strong>'],
            ['4', 'Publique como Web App', 'Clique em <strong>Implantar → Nova implantação</strong>, selecione tipo "Aplicativo da Web", Execute como: <em>Eu</em>, Acesso: <em>Qualquer pessoa</em>'],
            ['5', 'Copie a URL', 'Copie a URL gerada e cole no campo acima'],
            ['6', 'Ative o trigger diário', 'No Apps Script, vá em <strong>Acionadores (⏰)</strong> → Adicionar → função <em>checkVencimentos</em> → disparada por tempo → <em>Diariamente às 8h</em>'],
          ].map(([n,t,d]) => `
            <div style="display:flex;gap:16px;padding:16px;border-bottom:1px solid var(--card-border)">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-glow);color:var(--accent-light);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${n}</div>
              <div><div style="font-weight:600;font-size:14px;margin-bottom:4px">${t}</div><div style="font-size:13px;color:var(--text2)">${d}</div></div>
            </div>`).join('')}
          <div style="padding:16px;font-size:13px;color:var(--text2)">Após configurar, clique em <strong>"Salvar URL"</strong> e recarregue a página.</div>
        </div>
      </div>
    </div>`;

  lucide.createIcons({ nodes: [container] });

  document.getElementById('btnSalvarConfig').addEventListener('click', async () => {
    const email = document.getElementById('cfgEmail').value.trim();
    const dias = parseInt(document.getElementById('cfgDias').value) || 5;
    try {
      await api.saveConfig({ emailAlerta: email, diasAntecedencia: dias });
      toast('Configurações salvas!', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });

  document.getElementById('btnTestarAlerta').addEventListener('click', async () => {
    try {
      toast('Iniciando verificação de vencimentos...', 'info');
      await api.runAlertCheck();
      toast('Verificação concluída! Confira seu e-mail.', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}
