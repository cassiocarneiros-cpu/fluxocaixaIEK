const CONFIG = {
  FORM_ID: '1tEQCJRVKn_QYwYEuBrbsai7ad3Kece6rv09yo_cM7TU',
  SPREADSHEET_ID: '11WjsgKn43-e1ed6zLDqJ9ie_rW1b_Ay-_zxCOph77TY',
  SHEET_GID: 1782149917,
  SHEET_NAME: 'Respostas ao formulário 1',
  PHOTO_FOLDER_NAME: 'FOTOS - FLUXO DE CAIXA IEK',
  STATUS_TTL_SECONDS: 21600
};

const EXPECTED_HEADERS = [
  'Carimbo de data/hora', 'DATA', 'NOME', 'MOVIMENTAÇÃO',
  'TIPO', 'VALOR R$', 'Foto da Entrada ou Saída', 'ENTRADAS', 'SAÍDAS'
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = String(p.callback || '').trim();
  let result;
  try {
    const action = String(p.action || '').trim().toLowerCase();
    if (action === 'form') {
      result = { success: true, app: 'Kerigma', formTitle: FormApp.openById(CONFIG.FORM_ID).getTitle(), questions: getFormQuestions_() };
    } else if (action === 'save') {
      // Para compatibilidade com GET (usado em testes)
      result = saveFromPost_({ parameter: p });
    } else if (action === 'status') {
      result = getStatus_(String(p.id || '').trim());
    } else {
      result = { success: true, app: 'Kerigma', message: 'Apps Script ativo.', form: FormApp.openById(CONFIG.FORM_ID).getTitle(), questions: getFormQuestions_().length };
    }
  } catch (err) {
    result = { success: false, error: String(err && err.message ? err.message : err) };
  }
  return output_(result, callback);
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'save').trim().toLowerCase();

    if (action === 'photo') {
      return handlePhoto_(p);
    }

    // Salva os dados principais via POST
    const result = saveFromPost_(e);
    
    // Retorna JSON para o fetch (modo no-cors)
    return json_(result);

  } catch (err) {
    console.error(err);
    return json_({
      success: false,
      confirmed: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function saveFromPost_(e) {
  const p = (e && e.parameter) || {};
  const submissionId = String(p.submissionId || '').trim();
  if (!submissionId) throw new Error('SUBMISSIONID NÃO INFORMADO.');

  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('row_' + submissionId);
  if (existing) {
    return {
      success: true,
      confirmed: true,
      duplicate: true,
      submissionId: submissionId,
      row: Number(existing)
    };
  }

  const questions = getFormQuestions_();
  const answers = {};

  questions.forEach(function(q) {
    const key = 'answer_' + q.index;
    if (Object.prototype.hasOwnProperty.call(p, key)) {
      answers[q.title] = String(p[key] || '').toUpperCase();
    }
  });

  const sheet = getTargetSheet_();
  ensureHeaders_(sheet);
  const headers = getHeaders_(sheet);

  const row = headers.map(function(header) {
    const n = normalize_(header);
    if (n === normalize_('Carimbo de data/hora') || n === normalize_('Timestamp') || n === normalize_('Data e Hora')) {
      return new Date();
    }
    return findAnswerUpper_(answers, header);
  });

  while (row.length < EXPECTED_HEADERS.length) row.push('');

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();

  props.setProperty('row_' + submissionId, String(nextRow));
  props.setProperty('status_' + submissionId, 'OK');

  return {
    success: true,
    confirmed: true,
    submissionId: submissionId,
    row: nextRow,
    sheet: sheet.getName(),
    photoSaved: false
  };
}

function getStatus_(id) {
  if (!id) return { success: false, confirmed: false, error: 'ID NÃO INFORMADO.' };
  const row = PropertiesService.getScriptProperties().getProperty('row_' + id);
  const status = PropertiesService.getScriptProperties().getProperty('status_' + id);
  return { 
    success: !!row, 
    confirmed: !!row, 
    submissionId: id, 
    row: row ? Number(row) : null,
    status: status || 'PENDING'
  };
}

function handlePhoto_(p) {
  const submissionId = String(p.submissionId || '').trim();
  if (!submissionId) throw new Error('SUBMISSIONID NÃO INFORMADO PARA FOTO.');

  const dataUrl = String(p.photoData || '');
  if (!dataUrl) throw new Error('FOTO NÃO RECEBIDA.');
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('FORMATO DA FOTO INVÁLIDO.');

  const bytes = Utilities.base64Decode(dataUrl.substring(comma + 1));
  if (bytes.length > 6 * 1024 * 1024) throw new Error('FOTO OTIMIZADA MAIOR QUE 6 MB.');

  const mime = String(p.mimeType || 'image/jpeg');
  const blob = Utilities.newBlob(bytes, mime, 'FLUXO_CAIXA_' + submissionId + '.jpg');
  const file = getPhotoFolder_().createFile(blob);
  file.setName('FLUXO_CAIXA_' + submissionId + '.jpg');

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    console.warn('COMPARTILHAMENTO NÃO ALTERADO: ' + err);
  }

  const row = Number(PropertiesService.getScriptProperties().getProperty('row_' + submissionId));
  if (!row) throw new Error('LINHA DO LANÇAMENTO NÃO ENCONTRADA.');

  const sheet = getTargetSheet_();
  const headers = getHeaders_(sheet);
  const photoTitle = String(p.photoQuestion || 'Foto da Entrada ou Saída');
  let col = headers.findIndex(function(h) { return normalize_(h) === normalize_(photoTitle); });
  if (col < 0) col = headers.findIndex(function(h) { return normalize_(h) === normalize_('Foto da Entrada ou Saída'); });
  if (col < 0) throw new Error('COLUNA DA FOTO NÃO ENCONTRADA.');

  sheet.getRange(row, col + 1).setValue(file.getUrl());
  SpreadsheetApp.flush();
  
  // Atualiza o status para incluir a foto
  PropertiesService.getScriptProperties().setProperty('status_' + submissionId, 'OK_WITH_PHOTO');
  
  return json_({ success: true, confirmed: true, photoSaved: true, url: file.getUrl(), row: row });
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);
}

function getFormQuestions_() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  return form.getItems().map(function(item, index) {
    const type = item.getType();
    const title = item.getTitle ? item.getTitle() : '';
    const q = { index: index, title: title, type: String(type), required: false, choices: [], rows: [], columns: [], helpText: '' };
    try { if (typeof item.isRequired === 'function') q.required = item.isRequired(); } catch (_) {}
    try { if (typeof item.getHelpText === 'function') q.helpText = item.getHelpText() || ''; } catch (_) {}
    switch (type) {
      case FormApp.ItemType.TEXT: q.type = 'TEXT'; break;
      case FormApp.ItemType.PARAGRAPH_TEXT: q.type = 'PARAGRAPH'; break;
      case FormApp.ItemType.MULTIPLE_CHOICE: q.type = 'RADIO'; q.choices = item.asMultipleChoiceItem().getChoices().map(function(c) { return c.getValue(); }); break;
      case FormApp.ItemType.LIST: q.type = 'LIST'; q.choices = item.asListItem().getChoices().map(function(c) { return c.getValue(); }); break;
      case FormApp.ItemType.CHECKBOX: q.type = 'CHECKBOX'; q.choices = item.asCheckboxItem().getChoices().map(function(c) { return c.getValue(); }); break;
      case FormApp.ItemType.SCALE:
        q.type = 'SCALE';
        const s = item.asScaleItem();
        for (let i = s.getLowerBound(); i <= s.getUpperBound(); i++) q.choices.push(String(i));
        break;
      case FormApp.ItemType.DATE: q.type = 'DATE'; break;
      case FormApp.ItemType.TIME: q.type = 'TIME'; break;
      case FormApp.ItemType.DURATION: q.type = 'DURATION'; break;
      case FormApp.ItemType.GRID:
        q.type = 'GRID';
        const g = item.asGridItem();
        q.rows = g.getRows(); q.columns = g.getColumns();
        break;
      case FormApp.ItemType.CHECKBOX_GRID:
        q.type = 'CHECKBOX_GRID';
        const cg = item.asCheckboxGridItem();
        q.rows = cg.getRows(); q.columns = cg.getColumns();
        break;
      default: q.type = 'TEXT';
    }
    return q;
  }).filter(function(q) { return q.title && ['SECTION_HEADER', 'PAGE_BREAK', 'IMAGE', 'VIDEO'].indexOf(q.type) < 0; });
}

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheets().find(function(s) { return s.getSheetId() === Number(CONFIG.SHEET_GID); });
  if (!sheet) sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('ABA DA PLANILHA NÃO FOI ENCONTRADA.');
  return sheet;
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getDisplayValues()[0];
  const generic = current.every(function(v, i) { return String(v).trim() === 'Column ' + (i + 1); });
  const empty = current.every(function(v) { return String(v).trim() === ''; });
  if (generic || empty) sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setValues([EXPECTED_HEADERS]);
}

function getHeaders_(sheet) {
  ensureHeaders_(sheet);
  return sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getDisplayValues()[0].map(function(v) { return String(v).trim(); });
}

function findAnswer_(answers, header) {
  const target = normalize_(header);
  const keys = Object.keys(answers);
  const exact = keys.find(function(k) { return normalize_(k) === target; });
  if (exact !== undefined) return answers[exact];
  const partial = keys.find(function(k) { const nk = normalize_(k); return nk === target || nk.indexOf(target) >= 0 || target.indexOf(nk) >= 0; });
  return partial !== undefined ? answers[partial] : '';
}

function findAnswerUpper_(answers, header) {
  const value = findAnswer_(answers, header);
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  return String(value).toUpperCase();
}

function normalize_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function output_(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function testarConfiguracao() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  const sheet = getTargetSheet_();
  const qs = getFormQuestions_();
  Logger.log('FORMULÁRIO: ' + form.getTitle());
  Logger.log('PERGUNTAS: ' + qs.length);
  qs.forEach(function(q, i) { Logger.log((i + 1) + '. ' + q.title + ' [' + q.type + ']'); });
  Logger.log('PLANILHA: ' + sheet.getName());
  Logger.log('GID: ' + sheet.getSheetId());
  Logger.log('CABEÇALHOS: ' + JSON.stringify(getHeaders_(sheet)));
}

function testarGravacaoPlanilha() {
  const sheet = getTargetSheet_();
  ensureHeaders_(sheet);
  const headers = getHeaders_(sheet);
  const row = headers.map(function(header) {
    const n = normalize_(header);
    if (n === normalize_('Carimbo de data/hora')) return new Date();
    if (n === normalize_('DATA')) return 'TESTE';
    if (n === normalize_('NOME')) return 'TESTE KERIGMA';
    if (n === normalize_('MOVIMENTAÇÃO')) return 'ENTRADA';
    if (n === normalize_('TIPO')) return 'TESTE';
    if (n === normalize_('VALOR R$')) return 'R$ 1,00';
    if (n === normalize_('ENTRADAS')) return 'R$ 1,00';
    return '';
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
  Logger.log('TESTE GRAVADO NA LINHA: ' + sheet.getLastRow());
}