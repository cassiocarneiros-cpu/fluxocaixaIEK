/**
 * KERIGMA — Google Apps Script
 * Fonte dos campos: Google Forms
 * Destino: Google Sheets
 *
 * Implantação:
 * 1) Extensões > Apps Script na planilha de destino.
 * 2) Cole este código.
 * 3) Salve.
 * 4) Execute a função "testarConfiguracao" uma vez e autorize.
 * 5) Implantar > Nova implantação > Aplicativo da Web.
 * 6) Executar como: Eu.
 * 7) Quem tem acesso: Qualquer pessoa.
 * 8) Copie a URL /exec para config.js.
 */

const CONFIG = {
  FORM_ID: '1tEQCJRVKn_QYwYEuBrbsai7ad3Kece6rv09yo_cM7TU',
  SPREADSHEET_ID: '11WjsgKn43-e1ed6zLDqJ9ie_rW1b_Ay-_zxCOph77TY',
  SHEET_GID: 1782149917,
  STATUS_TTL_SECONDS: 21600
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = p.callback || '';
  let data;

  try {
    if (p.action === 'form') {
      data = {success:true, questions:getFormQuestions_()};
    } else if (p.action === 'status') {
      const id = p.id || '';
      data = {success: !!id && CacheService.getScriptCache().get('status_'+id) === 'OK'};
    } else {
      data = {success:true, app:'Kerigma', message:'Web App ativo.'};
    }
  } catch (err) {
    data = {success:false, error:String(err && err.message || err)};
  }

  const json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback+'('+json+');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('POST sem conteúdo.');
    const payload = JSON.parse(e.postData.contents);
    if (!payload.submissionId) throw new Error('submissionId não informado.');
    const answers = payload.answers || {};
    const sheet = getTargetSheet_();
    const headers = getHeaders_(sheet);
    const row = headers.map(h => {
      const key = normalize_(h);
      if (key === normalize_('Data e Hora') || key === normalize_('DataHora') || key === normalize_('Timestamp')) {
        return new Date();
      }
      const value = findAnswer_(answers, h);
      return value;
    });
    sheet.appendRow(row);
    CacheService.getScriptCache().put('status_'+payload.submissionId,'OK',CONFIG.STATUS_TTL_SECONDS);
    result = {success:true, submissionId:payload.submissionId};
  } catch (err) {
    result = {success:false,error:String(err && err.message || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFormQuestions_() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  return form.getItems().map((item, index) => {
    const type = item.getType();
    const base = {index:index, title:item.getTitle(), type:String(type), required:false, choices:[], helpText:''};

    try { base.required = item.asParagraphTextItem ? false : false; } catch(e) {}
    // O Forms não expõe "required" de forma uniforme para todos os tipos.
    // Campos são tratados como opcionais por padrão; o formulário HTML valida os controles
    // essenciais que o usuário preencher explicitamente.
    switch(type) {
      case FormApp.ItemType.TEXT:
        base.type='TEXT'; break;
      case FormApp.ItemType.PARAGRAPH_TEXT:
        base.type='PARAGRAPH'; break;
      case FormApp.ItemType.MULTIPLE_CHOICE:
        base.type='RADIO';
        base.choices=item.asMultipleChoiceItem().getChoices().map(c=>c.getValue()); break;
      case FormApp.ItemType.LIST:
        base.type='LIST';
        base.choices=item.asListItem().getChoices().map(c=>c.getValue()); break;
      case FormApp.ItemType.CHECKBOX:
        base.type='CHECKBOX';
        base.choices=item.asCheckboxItem().getChoices().map(c=>c.getValue()); break;
      case FormApp.ItemType.DATE:
        base.type='DATE'; break;
      case FormApp.ItemType.TIME:
        base.type='TIME'; break;
      default:
        base.type='TEXT';
    }
    return base;
  }).filter(q => q.title && !['SECTION_HEADER','PAGE_BREAK','IMAGE','VIDEO'].includes(q.type));
}

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const sheet = sheets.find(s => s.getSheetId() === CONFIG.SHEET_GID);
  if (!sheet) throw new Error('A aba com o GID '+CONFIG.SHEET_GID+' não foi encontrada.');
  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) throw new Error('A planilha não possui cabeçalhos na primeira linha.');
  return sheet.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v).trim());
}

function findAnswer_(answers, header) {
  const target = normalize_(header);
  const keys = Object.keys(answers);
  const exact = keys.find(k=>normalize_(k)===target);
  if (exact !== undefined) return answers[exact];
  const partial = keys.find(k=>{
    const nk=normalize_(k);
    return nk===target || nk.includes(target) || target.includes(nk);
  });
  return partial !== undefined ? answers[partial] : '';
}

function normalize_(s) {
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim();
}

function testarConfiguracao() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  const sheet = getTargetSheet_();
  Logger.log('Formulário: '+form.getTitle());
  Logger.log('Planilha: '+sheet.getName());
  Logger.log('Perguntas: '+getFormQuestions_().length);
}
