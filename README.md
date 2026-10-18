# KERIGMA V5.5.0 — Fluxo de Caixa da IEK

Fluxo de Caixa IEK para GitHub Pages + Google Apps Script + Google Sheets + Google Drive.

## 🔧 Alterações nesta versão

- **Anexo de FOTO ou PDF**: o campo de anexo agora aceita câmera, galeria de imagens e arquivos PDF do celular.
- **Envio inteligente**: imagens são comprimidas antes do envio; PDFs são enviados como estão (limite ~4 MB).
- **Armazenamento correto**: imagens salvas como `.jpg` e PDFs como `.pdf` na mesma pasta do Drive.
- **Link na planilha**: o link do anexo é gravado na coluna "Foto da Entrada ou Saída".
- **Título atualizado**: "Fluxo de Caixa da IEK".

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
1. Primeiro teste sem anexo.
2. Depois teste com foto.
3. Depois teste com PDF.
4. Verifique se os dados e o link do anexo aparecem na planilha.

## ⚠️ Limites
- **Imagens**: comprimidas automaticamente para até ~5 MB.
- **PDFs**: até ~4 MB (limite prático do payload do Web App).
- **Pasta no Drive**: `FOTOS - FLUXO DE CAIXA IEK`.

## 📁 Estrutura
- `index.html` — Página principal
- `styles.css` — Estilos
- `app.js` — Lógica do front-end
- `config.js` — Configuração (URL do Apps Script)
- `Code.gs` — Código do Apps Script
- `manifest.json` — PWA
