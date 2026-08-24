# Projeto Kerigma — versão final configurada

Esta versão já está configurada com a URL do seu Apps Script:

https://script.google.com/macros/s/AKfycbxFqy-GdYSf_6tQdiVX7q-BBF0W4QVeiPHIJaaCAj49GKs8JSfeofuE6WakcYaGYQa8/exec

## O que foi corrigido

1. O app busca as perguntas por JSONP, evitando o problema de CORS do navegador.
2. O Service Worker foi removido desta versão para impedir que uma versão antiga fique presa no cache do GitHub Pages.
3. CSS e JavaScript possuem versão `?v=300` para forçar atualização.
4. O app mostra diagnóstico quando não consegue carregar as perguntas.
5. O Apps Script lê as perguntas do formulário e o app monta os campos automaticamente.

## Perguntas confirmadas no seu formulário

O teste `testarConfiguracao` confirmou 6 perguntas:

1. DATA — DATE
2. NOME — TEXT
3. MOVIMENTAÇÃO — LIST
4. TIPO — TEXT
5. VALOR R$ — TEXT
6. Foto da Entrada ou Saída — TEXT

## Publicação no GitHub

Substitua TODOS os arquivos do repositório pelos arquivos deste ZIP.

No GitHub:
Settings > Pages > Deploy from a branch > main > /root

Depois abra a página em uma janela anônima ou faça Ctrl+F5.

No iPhone, se o Safari mostrar uma versão antiga:
Ajustes > Safari > Avançado > Dados dos Sites e remova o domínio do GitHub Pages, depois abra novamente.

## Apps Script

A implantação deve continuar como:
- Executar como: Eu
- Quem tem acesso: Qualquer pessoa
- URL: terminada em /exec

Não é necessário mudar o FORM_ID ou SPREADSHEET_ID do Code.gs.

## Planilha confirmada

Aba:
Respostas ao formulário 1

Cabeçalhos:
Carimbo de data/hora
DATA
NOME
MOVIMENTAÇÃO
TIPO
VALOR R$
Foto da Entrada ou Saída
ENTRADAS
SAÍDAS
