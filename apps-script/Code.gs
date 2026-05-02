// =============================================
//  DIEGO IMOBILIÁRIA — Google Apps Script API
//  Planilha: BASE_IMOBILIARIA
// =============================================

var SS_NAME = 'BASE_IMOBILIARIA';
var EMAIL_PADRAO = 'diegogalafassibc@gmail.com';
var RESEND_API_KEY = 're_bCjBeTmo_4GLS8Feu97CWfA5MGsQkKR1K';
// FROM: use onboarding@resend.dev para testes sem domínio verificado
// Quando tiver domínio verificado no Resend, troque por: 'Diego Imobiliária <alerta@seudominio.com>'
var RESEND_FROM = 'Diego Imobiliária <onboarding@resend.dev>';

// =============================================
//  MENU NO GOOGLE SHEETS
// =============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏠 Diego Imobiliária')
    .addItem('✅ Verificar Vencimentos Agora', 'checkVencimentos')
    .addSeparator()
    .addItem('⏰ Ativar Alertas Diários (8h)', 'createDailyTrigger')
    .addItem('🗑️ Remover Alertas Diários', 'removeDailyTrigger')
    .addSeparator()
    .addItem('📋 Ver Log de Alertas Enviados', 'showAlertLog')
    .addToUi();
}

function createDailyTrigger() {
  // Remove triggers existentes para não duplicar
  removeDailyTrigger();
  ScriptApp.newTrigger('checkVencimentos')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  SpreadsheetApp.getUi().alert('✅ Alertas diários ativados!\nTodo dia às 8h o sistema verificará os vencimentos e enviará e-mails automaticamente.');
}

function removeDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'checkVencimentos') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function showAlertLog() {
  var logs = sheetToObjects(getSheet('AlertasLog'));
  if (!logs.length) {
    SpreadsheetApp.getUi().alert('Nenhum alerta foi enviado ainda.');
    return;
  }
  var msg = logs.slice(-10).reverse().map(function(l) {
    return '• ' + l.dataEnvio + ' | ' + l.tipo + ' | Contrato: ' + l.contratoId;
  }).join('\n');
  SpreadsheetApp.getUi().alert('Últimos 10 alertas enviados:\n\n' + msg);
}

// ---- Helpers de Sheets ----
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var headers = {
      Imoveis:     ['id','nome','mesReajuste','diaVencimentoPadrao','valorPadrao','observacoes','dataCadastro'],
      Clientes:    ['id','nome','telefone','email','observacoes','dataCadastro'],
      Contratos:   ['id','clienteId','imovel','valor','diaVencimento','dataInicio','dataFim','status','observacoes'],
      Pagamentos:  ['id','contratoId','clienteId','mesReferencia','dataVencimento','dataPagamento','valor','status','observacoes'],
      AlertasLog:  ['id','contratoId','tipo','dataEnvio','emailDestinatario'],
      Config:      ['chave','valor']
    };
    if (headers[name]) sh.appendRow(headers[name]);
  }
  return sh;
}

function sheetToObjects(sh) {
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  });
}

function genId() {
  return Utilities.getUuid().replace(/-/g,'').substring(0,12);
}

function today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- CORS / Router ----
function doGet(e) {
  try {
    var result = router(e.parameter.action, e.parameter, null);
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    var params = e.parameter;
    var data = params.data ? JSON.parse(params.data) : {};
    var result = router(params.action, params, data);
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

function router(action, params, data) {
  switch(action) {
    case 'getDashboard':      return getDashboard();
    case 'getImoveis':        return getImoveis();
    case 'getImovel':         return getImovel(params.id);
    case 'saveImovel':        return saveImovel(data);
    case 'deleteImovel':      return deleteRow('Imoveis', data.id);
    case 'getClientes':       return getClientes();
    case 'getCliente':        return getCliente(params.id);
    case 'saveCliente':       return saveCliente(data);
    case 'deleteCliente':     return deleteRow('Clientes', data.id);
    case 'getContratos':      return getContratos();
    case 'getContrato':       return getContrato(params.id);
    case 'saveContrato':      return saveContrato(data);
    case 'deleteContrato':    return deleteContrato(data.id);
    case 'getPagamentos':     return getPagamentos(params.contratoId);
    case 'savePagamento':     return savePagamento(data);
    case 'deletePagamento':   return deleteRow('Pagamentos', data.id);
    case 'getConfig':         return getConfig();
    case 'saveConfig':        return saveConfig(data);
    case 'runAlertCheck':     return runAlertCheck();
    default:                  throw new Error('Ação desconhecida: ' + action);
  }
}

// =============================================
//  DASHBOARD
// =============================================
function getDashboard() {
  var contratos = sheetToObjects(getSheet('Contratos'));
  var pagamentos = sheetToObjects(getSheet('Pagamentos'));
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var now = new Date();
  var mes = now.getMonth() + 1;
  var ano = now.getFullYear();
  var mesKey = ano + '-' + String(mes).padStart(2,'0');

  var totalAtivos = 0, pagosMes = 0, vencendo = 0, vencidos = 0;
  var receitaMes = 0, receitaPrevista = 0;
  var proximosVencimentos = [];

  contratos.forEach(function(c) {
    if (!c.id) return;
    totalAtivos++;
    receitaPrevista += parseFloat(c.valor) || 0;

    var pagMes = pagamentos.filter(function(p) {
      return p.contratoId === c.id && p.mesReferencia === mesKey && p.status === 'pago';
    });
    if (pagMes.length > 0) {
      pagosMes++;
      receitaMes += pagMes.reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);
      return;
    }

    var diaV = parseInt(c.diaVencimento) || 10;
    var venc = new Date(ano, mes - 1, diaV);
    var diff = Math.round((venc - now) / 86400000);

    if (diff < 0) {
      vencidos++;
      proximosVencimentos.push({ contratoId: c.id, clienteNome: getClienteNome(c.clienteId), imovel: getImovelNome(c.imovel, imoveis), diaVencimento: diaV, diasRestantes: diff });
    } else if (diff <= 5) {
      vencendo++;
      proximosVencimentos.push({ contratoId: c.id, clienteNome: getClienteNome(c.clienteId), imovel: getImovelNome(c.imovel, imoveis), diaVencimento: diaV, diasRestantes: diff });
    }
  });

  proximosVencimentos.sort(function(a,b){ return a.diasRestantes - b.diasRestantes; });

  var pagRecentes = pagamentos
    .filter(function(p){ return p.status === 'pago' && p.dataPagamento; })
    .sort(function(a,b){ return b.dataPagamento > a.dataPagamento ? 1 : -1; })
    .slice(0, 10)
    .map(function(p){
      var c = contratos.find(function(x){ return x.id === p.contratoId; }) || {};
      return { clienteNome: getClienteNome(p.clienteId), imovel: getImovelNome(c.imovel, imoveis), mesReferencia: p.mesReferencia, dataPagamento: p.dataPagamento, valor: p.valor };
    });

  return { totalAtivos: totalAtivos, pagosMes: pagosMes, vencendo: vencendo, vencidos: vencidos, receitaMes: receitaMes, receitaPrevista: receitaPrevista, proximosVencimentos: proximosVencimentos, pagamentosRecentes: pagRecentes };
}

function getClienteNome(clienteId) {
  var clientes = sheetToObjects(getSheet('Clientes'));
  var c = clientes.find(function(x){ return x.id === clienteId; });
  return c ? c.nome : 'Desconhecido';
}

// =============================================
//  IMOVEIS
// =============================================
function getImoveis() {
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var contratos = sheetToObjects(getSheet('Contratos'));
  imoveis = imoveis.filter(function(i){ return i.id; }).map(function(i) {
    i.totalContratos = contratos.filter(function(c){ return c.imovel === i.id; }).length;
    return i;
  });
  return { data: imoveis };
}

function getImovel(id) {
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var i = imoveis.find(function(x){ return x.id === id; });
  if (!i) throw new Error('Imóvel não encontrado');
  return { data: i };
}

function saveImovel(data) {
  var sh = getSheet('Imoveis');
  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sh.getRange(i+1, 1, 1, headers.length).setValues([[
          data.id, data.nome||'', data.mesReajuste||'', data.diaVencimentoPadrao||'', data.valorPadrao||0, data.observacoes||'', rows[i][6]||today()
        ]]);
        return { ok: true };
      }
    }
  }
  var id = genId();
  sh.appendRow([id, data.nome||'', data.mesReajuste||'', data.diaVencimentoPadrao||'', data.valorPadrao||0, data.observacoes||'', today()]);
  return { ok: true, id: id };
}

function getImovelNome(imovelId, imoveisList) {
  if (!imoveisList) imoveisList = sheetToObjects(getSheet('Imoveis'));
  var i = imoveisList.find(function(x){ return x.id === imovelId; });
  return i ? i.nome : (imovelId || 'Desconhecido');
}

// =============================================
//  CLIENTES
// =============================================
function getClientes() {
  var clientes = sheetToObjects(getSheet('Clientes'));
  var contratos = sheetToObjects(getSheet('Contratos'));
  clientes = clientes.filter(function(c){ return c.id; }).map(function(c) {
    c.totalContratos = contratos.filter(function(x){ return x.clienteId === c.id; }).length;
    return c;
  });
  return { data: clientes };
}

function getCliente(id) {
  var clientes = sheetToObjects(getSheet('Clientes'));
  var c = clientes.find(function(x){ return x.id === id; });
  if (!c) throw new Error('Cliente não encontrado');
  return { data: c };
}

function saveCliente(data) {
  var sh = getSheet('Clientes');
  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sh.getRange(i+1, 1, 1, headers.length).setValues([[
          data.id, data.nome||'', data.telefone||'', data.email||'', data.observacoes||'', rows[i][5]||today()
        ]]);
        return { ok: true };
      }
    }
  }
  var id = genId();
  sh.appendRow([id, data.nome||'', data.telefone||'', data.email||'', data.observacoes||'', today()]);
  return { ok: true, id: id };
}

// =============================================
//  CONTRATOS
// =============================================
function getContratos() {
  var contratos = sheetToObjects(getSheet('Contratos'));
  var pagamentos = sheetToObjects(getSheet('Pagamentos'));
  var clientes = sheetToObjects(getSheet('Clientes'));
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var now = new Date();
  var mes = now.getMonth() + 1;
  var ano = now.getFullYear();
  var mesKey = ano + '-' + String(mes).padStart(2,'0');

  contratos = contratos.filter(function(c){ return c.id; }).map(function(c) {
    var cli = clientes.find(function(x){ return x.id === c.clienteId; });
    c.clienteNome = cli ? cli.nome : 'Desconhecido';
    c.imovelNome = getImovelNome(c.imovel, imoveis);
    var pagMes = pagamentos.find(function(p){ return p.contratoId === c.id && p.mesReferencia === mesKey && p.status === 'pago'; });
    if (pagMes) { c.statusAtual = 'pago'; return c; }
    var diaV = parseInt(c.diaVencimento) || 10;
    var venc = new Date(ano, mes - 1, diaV);
    var diff = Math.round((venc - now) / 86400000);
    c.statusAtual = diff < 0 ? 'vencido' : diff <= 5 ? 'vencendo' : 'pendente';
    return c;
  });
  return { data: contratos };
}

function getContrato(id) {
  var contratos = sheetToObjects(getSheet('Contratos'));
  var c = contratos.find(function(x){ return x.id === id; });
  if (!c) throw new Error('Contrato não encontrado');
  var clientes = sheetToObjects(getSheet('Clientes'));
  var pagamentos = sheetToObjects(getSheet('Pagamentos'));
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var cli = clientes.find(function(x){ return x.id === c.clienteId; });
  c.clienteNome = cli ? cli.nome : 'Desconhecido';
  c.imovelNome = getImovelNome(c.imovel, imoveis);
  var now = new Date(); var mes = now.getMonth()+1; var ano = now.getFullYear();
  var mesKey = ano+'-'+String(mes).padStart(2,'0');
  var pagMes = pagamentos.find(function(p){ return p.contratoId===id && p.mesReferencia===mesKey && p.status==='pago'; });
  if (pagMes) { c.statusAtual='pago'; }
  else { var diaV=parseInt(c.diaVencimento)||10; var venc=new Date(ano,mes-1,diaV); var diff=Math.round((venc-now)/86400000); c.statusAtual=diff<0?'vencido':diff<=5?'vencendo':'pendente'; }
  return { data: c };
}

function saveContrato(data) {
  var sh = getSheet('Contratos');
  var rows = sh.getDataRange().getValues();
  var headers = rows[0];
  if (data.id) {
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sh.getRange(i+1,1,1,headers.length).setValues([[
          data.id, data.clienteId||'', data.imovel||'', data.valor||0, data.diaVencimento||10,
          data.dataInicio||'', data.dataFim||'', data.status||'ativo', data.observacoes||''
        ]]);
        return { ok: true };
      }
    }
  }
  var id = genId();
  sh.appendRow([id, data.clienteId||'', data.imovel||'', data.valor||0, data.diaVencimento||10, data.dataInicio||'', data.dataFim||'', 'ativo', data.observacoes||'']);
  return { ok: true, id: id };
}

function deleteContrato(id) {
  deleteRow('Contratos', id);
  var pSh = getSheet('Pagamentos');
  var pRows = pSh.getDataRange().getValues();
  for (var i = pRows.length - 1; i >= 1; i--) {
    if (String(pRows[i][1]) === String(id)) pSh.deleteRow(i+1);
  }
  return { ok: true };
}

// =============================================
//  PAGAMENTOS
// =============================================
function getPagamentos(contratoId) {
  var pags = sheetToObjects(getSheet('Pagamentos'));
  var contratos = sheetToObjects(getSheet('Contratos'));
  var clientes = sheetToObjects(getSheet('Clientes'));
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  pags = pags.filter(function(p){ return p.id && (!contratoId || p.contratoId === contratoId); });
  pags = pags.map(function(p) {
    var c = contratos.find(function(x){ return x.id === p.contratoId; }) || {};
    var cl = clientes.find(function(x){ return x.id === p.clienteId; }) || {};
    p.imovel = getImovelNome(c.imovel, imoveis);
    p.clienteNome = cl.nome || '';
    return p;
  });
  pags.sort(function(a,b){ return b.mesReferencia > a.mesReferencia ? 1 : -1; });
  return { data: pags };
}

function savePagamento(data) {
  var sh = getSheet('Pagamentos');
  if (data.id) {
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sh.getRange(i+1,1,1,9).setValues([[data.id, data.contratoId||'', data.clienteId||'', data.mesReferencia||'', data.dataVencimento||'', data.dataPagamento||'', data.valor||0, data.status||'pago', data.observacoes||'']]);
        return { ok: true };
      }
    }
  }
  var id = genId();
  sh.appendRow([id, data.contratoId||'', data.clienteId||'', data.mesReferencia||'', data.dataVencimento||'', data.dataPagamento||today(), data.valor||0, data.status||'pago', data.observacoes||'']);
  return { ok: true, id: id };
}

// =============================================
//  CONFIG
// =============================================
function getConfig() {
  var rows = sheetToObjects(getSheet('Config'));
  var cfg = { emailAlerta: EMAIL_PADRAO, diasAntecedencia: 5 };
  rows.forEach(function(r){ if(r.chave) cfg[r.chave] = r.valor; });
  return { data: cfg };
}

function saveConfig(data) {
  var sh = getSheet('Config');
  var rows = sh.getDataRange().getValues();
  Object.keys(data).forEach(function(key) {
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === key) { sh.getRange(i+1,2).setValue(data[key]); found = true; break; }
    }
    if (!found) sh.appendRow([key, data[key]]);
  });
  return { ok: true };
}

// =============================================
//  GENÉRICO: DELETE ROW
// =============================================
function deleteRow(sheetName, id) {
  var sh = getSheet(sheetName);
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) { sh.deleteRow(i+1); return { ok: true }; }
  }
  throw new Error('Registro não encontrado');
}

// =============================================
//  ALERTAS AUTOMÁTICOS
// =============================================
function checkVencimentos() {
  var cfg = getConfig().data;
  var emailDestino = cfg.emailAlerta || EMAIL_PADRAO;
  var diasAntes = parseInt(cfg.diasAntecedencia) || 5;

  var contratos = sheetToObjects(getSheet('Contratos'));
  var pagamentos = sheetToObjects(getSheet('Pagamentos'));
  var clientes = sheetToObjects(getSheet('Clientes'));
  var imoveis = sheetToObjects(getSheet('Imoveis'));
  var logs = sheetToObjects(getSheet('AlertasLog'));
  var logSh = getSheet('AlertasLog');

  var now = new Date();
  var mes = now.getMonth() + 1;
  var ano = now.getFullYear();
  var mesKey = ano + '-' + String(mes).padStart(2,'0');
  var todayStr = today();

  contratos.forEach(function(c) {
    if (!c.id) return;
    var cli = clientes.find(function(x){ return x.id === c.clienteId; }) || { nome: 'Cliente' };
    var imovNome = getImovelNome(c.imovel, imoveis);
    var pagMes = pagamentos.find(function(p){ return p.contratoId===c.id && p.mesReferencia===mesKey && p.status==='pago'; });
    if (pagMes) return;

    var diaV = parseInt(c.diaVencimento) || 10;
    var venc = new Date(ano, mes - 1, diaV);
    var diff = Math.round((venc - now) / 86400000);
    var tipo = null;
    if (diff < 0) tipo = 'vencido';
    else if (diff <= diasAntes) tipo = 'vencendo';
    else return;

    var jaEnviou = logs.find(function(l){ return l.contratoId===c.id && l.tipo===tipo && l.dataEnvio===todayStr; });
    if (jaEnviou) return;

    var valorFmt = 'R$ ' + parseFloat(c.valor).toFixed(2).replace('.',',');
    var assunto = tipo === 'vencido'
      ? '[VENCIDO] Aluguel em atraso — ' + cli.nome
      : '[ATENÇÃO] Aluguel vence em ' + diff + ' dia(s) — ' + cli.nome;

    var corpo = emailHtml(cli.nome, imovNome, valorFmt, diaV, diff, tipo);

    try {
      var resendPayload = JSON.stringify({
        from: RESEND_FROM,
        to: [emailDestino],
        subject: assunto,
        html: corpo
      });
      UrlFetchApp.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        payload: resendPayload,
        muteHttpExceptions: true
      });
      logSh.appendRow([genId(), c.id, tipo, todayStr, emailDestino]);
    } catch(e) { Logger.log('Erro ao enviar e-mail Resend: ' + e.message); }
  });
}

function runAlertCheck() {
  checkVencimentos();
  return { ok: true };
}

function emailHtml(nome, imovel, valor, diaVenc, dias, tipo) {
  var cor = tipo === 'vencido' ? '#ef4444' : '#f59e0b';
  var titulo = tipo === 'vencido' ? '⚠️ Aluguel Vencido' : '🔔 Aluguel Próximo do Vencimento';
  var msg = tipo === 'vencido'
    ? 'O aluguel abaixo está <strong>vencido</strong>. Entre em contato com o locatário.'
    : 'O aluguel abaixo vence em <strong>' + dias + ' dia(s)</strong>. Providencie a cobrança.';
  return '<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#0d1225;border-radius:12px;overflow:hidden;border:1px solid #1e2d4a">'
    + '<div style="background:'+cor+';padding:20px 24px"><h2 style="color:#fff;margin:0;font-size:18px">'+titulo+'</h2></div>'
    + '<div style="padding:24px">'
    + '<p style="color:#94a3b8;margin:0 0 20px">'+msg+'</p>'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e2d4a">Locatário</td><td style="padding:10px 0;font-weight:600;color:#f1f5f9;text-align:right;border-bottom:1px solid #1e2d4a">'+nome+'</td></tr>'
    + '<tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e2d4a">Imóvel</td><td style="padding:10px 0;font-weight:600;color:#f1f5f9;text-align:right;border-bottom:1px solid #1e2d4a">'+imovel+'</td></tr>'
    + '<tr><td style="padding:10px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e2d4a">Valor</td><td style="padding:10px 0;font-weight:700;color:#10b981;font-size:18px;text-align:right;border-bottom:1px solid #1e2d4a">'+valor+'</td></tr>'
    + '<tr><td style="padding:10px 0;color:#94a3b8;font-size:13px">Dia de Vencimento</td><td style="padding:10px 0;font-weight:600;color:#f1f5f9;text-align:right">Dia '+diaVenc+'</td></tr>'
    + '</table>'
    + '<div style="margin-top:24px;padding:16px;background:#111827;border-radius:8px;font-size:12px;color:#4b5563">Este é um alerta automático do sistema Diego Imobiliária.</div>'
    + '</div></div>';
}
