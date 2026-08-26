# KERIGMA V5.4.2 — Fluxo de Caixa da IEK

Fluxo de Caixa IEK para GitHub Pages + Google Apps Script + Google Sheets + Google Drive.

## 🔧 Alterações nesta versão

- **Atualizada a URL do Apps Script** para a nova implantação.
- **Redirecionamento para a nova planilha** configurada.
- **Corrigido o envio dos dados principais**: Utiliza `fetch` com `no-cors` para enviar os dados via POST.
- **Confirmação via JSONP**: Após o envio, o sistema verifica o status da gravação.
- **Mais robusto**: Funciona em Android, iPhone e Windows.

## 📋 Instruções de implantação

### Apps Script
1. A nova implantação já está criada e ativa.
2. A URL `/exec` usada pelo app já está atualizada em `config.js`.

### GitHub Pages
1. Atualize o arquivo `config.js` com a nova URL.
2. Faça o commit e push das alterações para o repositório.
3. O GitHub Pages atualizará automaticamente o aplicativo.

## 🧪 Teste
1. Acesse a URL do GitHub Pages.
2. Preencha o formulário e envie.
3. Verifique se os dados aparecem na nova planilha.

## 📁 Estrutura
- `index.html` — Página principal
- `styles.css` — Estilos
- `app.js` — Lógica do front-end
- `config.js` — Configuração (URL do Apps Script)
- `Code.gs` — Código do Apps Script
- `manifest.json` — PWA