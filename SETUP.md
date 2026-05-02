# 🏠 Diego Imobiliária — Guia de Instalação

## 1. GitHub Pages (Frontend) — ✅ Já feito pelo sistema

O frontend já foi enviado para: **https://diegogalafassi.github.io/imobiliaria/**

---

## 2. Google Apps Script (Backend) — Você precisa fazer isso uma vez

### Passo 1 — Abrir a planilha
Acesse: https://docs.google.com/spreadsheets/d/1iz1aKvwH7MnEZOZUUwcKOu9TqEb11FdFCLxByHdlRC8/edit

### Passo 2 — Abrir o editor de scripts
No menu superior: **Extensões → Apps Script**

### Passo 3 — Colar o código
1. Apague todo o código existente (Ctrl+A → Delete)
2. Abra o arquivo `apps-script/Code.gs` deste projeto
3. Copie todo o conteúdo e cole no editor do Apps Script
4. Salve (Ctrl+S) — dê o nome "Diego Imobiliária"

### Passo 4 — Publicar como Web App
1. Clique em **Implantar → Nova implantação**
2. Clique no ícone ⚙️ e selecione **"Aplicativo da Web"**
3. Configure:
   - **Descrição:** Diego Imobiliária API
   - **Executar como:** Eu (seu e-mail)
   - **Quem pode acessar:** Qualquer pessoa
4. Clique em **Implantar**
5. Autorize as permissões solicitadas
6. **Copie a URL** gerada (começa com `https://script.google.com/macros/s/...`)

### Passo 5 — Configurar no sistema
1. Acesse: https://diegogalafassi.github.io/imobiliaria/#configuracoes
2. Cole a URL no campo **"URL do Web App"**
3. Clique em **Salvar URL**

### Passo 6 — Ativar alertas automáticos diários
No editor do Apps Script:
1. Clique no ícone de **relógio ⏰** (Acionadores) no menu lateral
2. Clique em **"+ Adicionar acionador"**
3. Configure:
   - **Função:** `checkVencimentos`
   - **Fonte de eventos:** Baseado em tempo
   - **Tipo:** Temporizador do dia
   - **Horário:** Entre 8h e 9h
4. Salve

> Os alertas serão enviados para **diegogalafassibc@gmail.com** automaticamente todos os dias.

---

## 3. Estrutura da Planilha (criada automaticamente)

O sistema cria as abas automaticamente na primeira execução:

| Aba | Descrição |
|-----|-----------|
| `Clientes` | Cadastro de locatários |
| `Contratos` | Contratos de aluguel |
| `Pagamentos` | Histórico de pagamentos |
| `AlertasLog` | Log de e-mails enviados (anti-duplicata) |
| `Config` | Configurações do sistema |

---

## 4. Futuro: Migrar para Resend (e-mail profissional)

Quando criar sua conta no Resend:
1. Obtenha a API Key em https://resend.com
2. No `Code.gs`, substitua a função `MailApp.sendEmail(...)` por:
```javascript
UrlFetchApp.fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer SUA_API_KEY', 'Content-Type': 'application/json' },
  payload: JSON.stringify({ from: 'Diego <noreply@seudominio.com>', to: emailDestino, subject: assunto, html: corpo })
});
```

---

## Suporte
- Sistema: https://diegogalafassi.github.io/imobiliaria/
- Configurações: https://diegogalafassi.github.io/imobiliaria/#configuracoes
