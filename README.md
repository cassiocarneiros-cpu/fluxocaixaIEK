# KERIGMA V5.4.1 — CORREÇÃO DO ENVIO

Fluxo de Caixa IEK para GitHub Pages + Google Apps Script + Google Sheets + Google Drive.

## 🔧 Alterações nesta versão

- **Corrigido o envio dos dados principais**: Agora utiliza `fetch` com `no-cors` para enviar os dados via POST.
- **Confirmação via JSONP**: Após o envio, o sistema verifica o status da gravação usando JSONP.
- **Mais robusto**: Funciona em Android, iPhone e Windows.

## 📋 Instruções de implantação

### Apps Script
1. Abra o Apps Script vinculado à implantação atual.
2. Apague todo o conteúdo do `Code.gs` e cole o `Code.gs` deste pacote.
3. Salve o projeto.
4. Execute `testarConfiguracao` uma vez e autorize os acessos solicitados.
5. Vá em **Implantar > Gerenciar implantações > Editar**.
6. Crie uma **nova versão** e mantenha o Web App como acesso para **Qualquer pessoa**.
7. A URL `/exec` usada pelo app já está em `config.js`.

### GitHub Pages
1. Faça o upload de todos os arquivos para seu repositório.
2. Ative o GitHub Pages no repositório.
3. Acesse a URL gerada.

## 🧪 Teste
1. Primeiro teste sem foto.
2. Depois teste com foto.
3. Verifique se os dados aparecem na planilha.

## 📁 Estrutura
- `index.html` — Página principal
- `styles.css` — Estilos
- `app.js` — Lógica do front-end
- `config.js` — Configuração (URL do Apps Script)
- `Code.gs` — Código do Apps Script
- `manifest.json` — PWA
