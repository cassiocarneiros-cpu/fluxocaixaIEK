/**
 * KERIGMA — Apps Script V2
 *
 * Fonte das perguntas: Google Forms
 * Destino: Google Sheets
 *
 * IMPORTANTE:
 * - Publique como Aplicativo da Web.
 * - Executar como: Eu.
 * - Quem tem acesso: Qualquer pessoa.
 * - Use a URL /exec no config.js.
 */

const CONFIG = {
  FORM_ID: '1tEQCJRVKn_QYwYEuBrbsai7ad3Kece6rv09yo_cM7TU',
  SPREADSHEET_ID: '11WjsgKn43-e1ed6zLDqJ9ie_rW1b_Ay-_zxCOph77TY',
  SHEET_GID: 1782149917,
  PHOTO_FOLDER_NAME: 'FOTOS - FLUXO DE CAIXA IEK',
  STATUS_TTL_SECONDS: 21600
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = p.callback || '';
  let result;

  try {
    if (p.action === 'form') {
      result = {
        success: true,
        app: 'Kerigma',
        formTitle: FormApp.openById(CONFIG.FORM_ID).getTitle(),
        questions: getFormQuestions_()
      };
    } else if (p.action === 'status') {
      const id = p.id || '';
      result = {
        success: !!id &&
          CacheService.getScriptCache().get('status_' + id) === 'OK'
      };
    } else {
      result = {
        success: true,
        app: 'Kerigma',
        message: 'Apps Script ativo.',
        form: FormApp.openById(CONFIG.FORM_ID).getTitle(),
        questions: getFormQuestions_().length
      };
    }
  } catch (err) {
    result = {
      success: false,
      error: String(err && err.message || err),
      stack: String(err && err.stack || '')
    };
  }

  const json = JSON.stringify(result);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // O APP ENVIA COMO application/x-www-form-urlencoded.
    // ISSO EVITA PRE-FLIGHT/CORS DO GITHUB PAGES PARA O APPS SCRIPT.
    let raw = '';

    if (e && e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    } else if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    }

    if (!raw) {
      throw new Error('DADOS DO ENVIO NÃO RECEBIDOS.');
    }

    const payload = JSON.parse(raw);
    const submissionId = String(payload.submissionId || '').trim();

    if (!submissionId) {
      throw new Error('SUBMISSIONID NÃO INFORMADO.');
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = 'status_' + submissionId;

    if (cache.get(cacheKey) === 'OK') {
      return json_({
        success: true,
        duplicate: true,
        submissionId: submissionId
      });
    }

    const answers = payload.answers || {};
    const sheet = getTargetSheet_();
    const headers = getHeaders_(sheet);

    // ============================================================
    // 1) GRAVA PRIMEIRO NA PLANILHA.
    // ============================================================
    const row = headers.map(function(header) {
      const n = normalize_(header);

      if (
        n === normalize_('Data e Hora') ||
        n === normalize_('DataHora') ||
        n === normalize_('Timestamp') ||
        n === normalize_('Carimbo de data/hora')
      ) {
        return new Date();
      }

      return findAnswerUpper_(answers, header);
    });

    sheet.appendRow(row);
    SpreadsheetApp.flush();
    const savedRow = sheet.getLastRow();

    // ============================================================
    // 2) FOTO DEPOIS. SE FALHAR, O LANÇAMENTO CONTINUA SALVO.
    // ============================================================
    let photoUrl = '';
    let photoError = '';

    if (payload.photo && payload.photo.dataUrl) {
      try {
        photoUrl = savePhoto_(payload.photo, submissionId);

        const photoQuestion = String(
          payload.photoQuestion || 'Foto da Entrada ou Saída'
        );

        const photoCol = headers.findIndex(function(header) {
          return normalize_(header) === normalize_(photoQuestion);
        });

        if (photoCol >= 0 && photoUrl) {
          sheet.getRange(savedRow, photoCol + 1).setValue(photoUrl);
          SpreadsheetApp.flush();
        }
      } catch (photoErr) {
        photoError = String(photoErr && photoErr.message || photoErr);
        console.error('ERRO AO SALVAR FOTO: ' + photoError);
      }
    }

    // Só marca como OK depois de a linha da planilha ter sido efetivamente criada.
    cache.put(cacheKey, 'OK', CONFIG.STATUS_TTL_SECONDS);

    return json_({
      success: true,
      submissionId: submissionId,
      sheet: sheet.getName(),
      row: savedRow,
      photoSaved: !!photoUrl,
      photoError: photoError
    });

  } catch (err) {
    console.error(err);
    return json_({
      success: false,
      error: String(err && err.message || err)
    });
  }
}

function findAnswerUpper_(answers, header) {
  const value = findAnswer_(answers, header);

  if (value === null || value === undefined) return '';

  // LINKS DE FOTO NÃO SÃO ALTERADOS.
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(function(item) {
      return String(item).toUpperCase();
    }).join(', ');
  }

  return String(value).toUpperCase();
}


function savePhoto_(photo, submissionId) {
  const dataUrl = String(photo.dataUrl || '');
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('FOTO INVÁLIDA.');

  const mime = String(photo.mimeType || 'image/jpeg');
  const bytes = Utilities.base64Decode(dataUrl.substring(comma + 1));
  const blob = Utilities.newBlob(bytes, mime, 'FOTO_' + submissionId + '.jpg');

  if (blob.getBytes().length > 6 * 1024 * 1024) {
    throw new Error('A FOTO OTIMIZADA ULTRAPASSOU 6 MB.');
  }

  const folder = getPhotoFolder_();
  const file = folder.createFile(blob);
  file.setName('FLUXO_CAIXA_' + submissionId + '.jpg');

  // TENTA DEIXAR A FOTO VISÍVEL POR LINK.
  // SE A POLÍTICA DA CONTA BLOQUEAR, A FOTO CONTINUA NO DRIVE E O LINK
  // GERADO ABAIXO PODERÁ EXIGIR LOGIN.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (_) {}

  return file.getUrl();
}

function getPhotoFolder_() {
  const folders = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);
}

function getFormQuestions_() {
  const form = FormApp.openById(CONFIG.FORM_ID);

  return form.getItems().map((item, index) => {
    const type = item.getType();
    const title = item.getTitle ? item.getTitle() : '';
    const base = {
      index,
      title,
      type: String(type),
      required: false,
      choices: [],
      rows: [],
      columns: [],
      helpText: ''
    };

    try {
      if (typeof item.isRequired === 'function') {
        base.required = item.isRequired();
      }
    } catch (_) {}

    try {
      if (typeof item.getHelpText === 'function') {
        base.helpText = item.getHelpText() || '';
      }
    } catch (_) {}

    switch (type) {
      case FormApp.ItemType.TEXT:
        base.type = 'TEXT';
        break;

      case FormApp.ItemType.PARAGRAPH_TEXT:
        base.type = 'PARAGRAPH';
        break;

      case FormApp.ItemType.MULTIPLE_CHOICE:
        base.type = 'RADIO';
        base.choices = item.asMultipleChoiceItem()
          .getChoices().map(c => c.getValue());
        break;

      case FormApp.ItemType.LIST:
        base.type = 'LIST';
        base.choices = item.asListItem()
          .getChoices().map(c => c.getValue());
        break;

      case FormApp.ItemType.CHECKBOX:
        base.type = 'CHECKBOX';
        base.choices = item.asCheckboxItem()
          .getChoices().map(c => c.getValue());
        break;

      case FormApp.ItemType.SCALE:
        base.type = 'SCALE';
        const scale = item.asScaleItem();
        for (let i = scale.getLowerBound(); i <= scale.getUpperBound(); i++) {
          base.choices.push(String(i));
        }
        break;

      case FormApp.ItemType.GRID:
        base.type = 'GRID';
        const grid = item.asGridItem();
        base.rows = grid.getRows();
        base.columns = grid.getColumns();
        break;

      case FormApp.ItemType.CHECKBOX_GRID:
        base.type = 'CHECKBOX_GRID';
        const cgrid = item.asCheckboxGridItem();
        base.rows = cgrid.getRows();
        base.columns = cgrid.getColumns();
        break;

      case FormApp.ItemType.DATE:
        base.type = 'DATE';
        break;

      case FormApp.ItemType.TIME:
        base.type = 'TIME';
        break;

      case FormApp.ItemType.DURATION:
        base.type = 'DURATION';
        break;

      case FormApp.ItemType.SECTION_HEADER:
      case FormApp.ItemType.PAGE_BREAK:
      case FormApp.ItemType.IMAGE:
      case FormApp.ItemType.VIDEO:
        base.type = 'LAYOUT';
        break;

      default:
        base.type = 'TEXT';
    }

    return base;
  }).filter(q => q.title && q.type !== 'LAYOUT');
}

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheets().find(
    s => s.getSheetId() === CONFIG.SHEET_GID
  );

  if (!sheet) {
    throw new Error(
      'A aba com o GID ' + CONFIG.SHEET_GID + ' não foi encontrada.'
    );
  }

  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();

  if (!lastCol) {
    throw new Error(
      'A primeira linha da planilha precisa conter os nomes das colunas.'
    );
  }

  return sheet.getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(v => String(v).trim());
}

function findAnswer_(answers, header) {
  const target = normalize_(header);
  const keys = Object.keys(answers);

  const exact = keys.find(k => normalize_(k) === target);
  if (exact !== undefined) return answers[exact];

  const partial = keys.find(k => {
    const nk = normalize_(k);
    return nk === target || nk.includes(target) || target.includes(nk);
  });

  return partial !== undefined ? answers[partial] : '';
}

function normalize_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Execute esta função UMA VEZ no editor do Apps Script.
 * Ela confirma se o Forms e a planilha podem ser acessados.
 */
function testarConfiguracao() {
  const form = FormApp.openById(CONFIG.FORM_ID);
  const sheet = getTargetSheet_();
  const questions = getFormQuestions_();

  Logger.log('FORMULÁRIO: ' + form.getTitle());
  Logger.log('PERGUNTAS: ' + questions.length);
  questions.forEach((q, i) =>
    Logger.log((i + 1) + '. ' + q.title + ' [' + q.type + ']')
  );

  Logger.log('PLANILHA: ' + sheet.getName());
  Logger.log('LINHA DE CABEÇALHOS: ' +
    JSON.stringify(getHeaders_(sheet)));
}