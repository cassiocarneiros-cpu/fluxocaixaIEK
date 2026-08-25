# KERIGMA V5.2 CORRIGIDO

Fluxo de Caixa IEK para GitHub Pages + Google Apps Script + Google Sheets + Google Drive.

## Apps Script
1. Abra o Apps Script vinculado à implantação atual.
2. Apague todo o conteúdo do `Code.gs` e cole o `Code.gs` deste pacote.
3. Salve o projeto.
4. Execute `testarConfiguracao` uma vez e autorize os acessos solicitados.
5. Vá em **Implantar > Gerenciar implantações > Editar**.
6. Crie uma **nova versão** e mantenha o Web App como acesso para **Qualquer pessoa**.
7. A URL `/exec` usada pelo app já está em `config.js`.

## Por que esta versão é diferente?
Os dados agora são enviados por GET + JSONP para o Apps Script. Isso permite que o navegador do GitHub Pages receba a confirmação real da gravação. A foto continua sendo enviada separadamente por POST depois que a linha foi confirmada.

## Teste
Primeiro teste sem foto. Depois teste a foto.


## V5.4 — CORREÇÃO DO ENVIO
O envio dos dados principais usa GET/JSONP para receber a confirmação diretamente do Apps Script. O Apps Script precisa estar implantado como Web App com acesso para Qualquer pessoa. A foto continua sendo enviada separadamente por POST após a confirmação da linha.
