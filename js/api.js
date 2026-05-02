// ===== API CLIENT =====
// Calls Google Apps Script Web App as backend

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby4S2kc98PpiKueLvb1lcDzTFiPc2Bwqusgdrtcw51x0ENLZeZzFfSaICTaRPvTvBzt/exec';

export function getApiUrl() {
  return WEB_APP_URL;
}

export function setApiUrl(url) {
  // Obsoleto, URL agora é hardcoded
}

async function call(params) {
  const url = getApiUrl();
  if (!url) {
    document.getElementById('configAlert').style.display = 'block';
    throw new Error('URL do Apps Script não configurada. Vá em Configurações.');
  }
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

async function post(action, data = {}) {
  const url = getApiUrl();
  if (!url) {
    document.getElementById('configAlert').style.display = 'block';
    throw new Error('URL do Apps Script não configurada.');
  }
  const body = new URLSearchParams({ action, data: JSON.stringify(data) });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// Dashboard
export const getDashboard = () => call({ action: 'getDashboard' });

// Clientes
export const getClientes = () => call({ action: 'getClientes' });
export const getCliente = id => call({ action: 'getCliente', id });
export const saveCliente = data => post('saveCliente', data);
export const deleteCliente = id => post('deleteCliente', { id });

// Imóveis
export const getImoveis = () => call({ action: 'getImoveis' });
export const getImovel = id => call({ action: 'getImovel', id });
export const saveImovel = data => post('saveImovel', data);
export const deleteImovel = id => post('deleteImovel', { id });

// Contratos
export const getContratos = () => call({ action: 'getContratos' });
export const getContrato = id => call({ action: 'getContrato', id });
export const saveContrato = data => post('saveContrato', data);
export const deleteContrato = id => post('deleteContrato', { id });

// Pagamentos
export const getPagamentos = contratoId => call({ action: 'getPagamentos', contratoId });
export const getAllPagamentos = () => call({ action: 'getPagamentos' });
export const savePagamento = data => post('savePagamento', data);
export const deletePagamento = id => post('deletePagamento', { id });

// Config
export const getConfig = () => call({ action: 'getConfig' });
export const saveConfig = data => post('saveConfig', data);

// Trigger manual
export const runAlertCheck = () => call({ action: 'runAlertCheck' });
