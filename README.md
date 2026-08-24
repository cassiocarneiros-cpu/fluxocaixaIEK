# Igreja Evangélica Kerigma — Formulário Digital

Projeto PWA para GitHub Pages, usando o Google Forms como fonte dos campos e Google Sheets como destino.

## Arquivos
- `index.html` — tela principal.
- `styles.css` — identidade visual baseada na imagem Kerigma.
- `app.js` — carrega as perguntas e envia os dados.
- `config.js` — URL do Apps Script e versão.
- `Code.gs` — Google Apps Script.
- `manifest.json` — instalação como aplicativo.
- `sw.js` — cache PWA.
- `igreja_kerigma_v3.png` — imagem usada no cabeçalho e ícone.

## 1. Apps Script
Abra a planilha:
https://docs.google.com/spreadsheets/d/11WjsgKn43-e1ed6zLDqJ9ie_rW1b_Ay-_zxCOph77TY/edit

Vá em **Extensões > Apps Script** e cole `Code.gs`.

Salve. Execute `testarConfiguracao` uma vez e autorize.

Depois:
**Implantar > Nova implantação > Aplicativo da Web**
- Executar como: Eu
- Quem tem acesso: Qualquer pessoa

Copie a URL que termina em `/exec`.

## 2. config.js
Substitua:
`COLE_AQUI_A_URL_DO_APPS_SCRIPT_/exec`
pela URL real.

## 3. GitHub Pages
Envie todos os arquivos para um repositório.
Depois:
**Settings > Pages > Deploy from a branch > main > /root**

Abra a URL fornecida pelo GitHub.

## 4. Importante sobre o Google Forms
O Apps Script usa o formulário informado no projeto como MODELO das perguntas. As respostas do aplicativo são gravadas diretamente na aba da planilha definida pelo `SHEET_GID`.

Isso permite manter o visual do aplicativo independente do Google Forms.

## 5. Cabeçalho
A imagem `igreja_kerigma_v3.png` é exibida no cabeçalho em tamanho médio/pequeno:
- desktop: aproximadamente 112 px
- celular: aproximadamente 88 px

## 6. Se adicionar/remover perguntas
O aplicativo busca as perguntas do Forms sempre que é aberto. Portanto, não é necessário editar o HTML para mudanças normais de perguntas.

## 7. Se alterar o Apps Script
Após alterar o `Code.gs`, faça uma nova versão em:
**Implantar > Gerenciar implantações > Editar > Nova versão > Implantar**.

A URL `/exec` permanece a mesma.

## 8. Teste recomendado
1. Abra a URL `/exec` do Apps Script no navegador. Deve aparecer uma mensagem JSON indicando que o Web App está ativo.
2. Abra o GitHub Pages.
3. Confirme que as perguntas carregaram.
4. Envie um teste.
5. Verifique a aba correta da planilha.

## Observação
O envio usa `POST` com `Content-Type: text/plain` e `redirect: follow`, evitando preflight CORS desnecessário em navegadores. O carregamento das perguntas usa JSONP para permitir que o GitHub Pages consulte o Apps Script sem depender de cabeçalhos CORS.
