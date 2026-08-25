const CONFIG = {
  FORM_ID: '1tEQCJRVKn_QYwYEuBrbsai7ad3Kece6rv09yo_cM7TU',
  SPREADSHEET_ID: '11WjsgKn43-e1ed6zLDqJ9ie_rW1b_Ay-_zxCOph77TY',
  SHEET_GID: 1782149917,
  SHEET_NAME: 'Respostas ao formulário 1',
  PHOTO_FOLDER_NAME: 'FOTOS - FLUXO DE CAIXA IEK',
  STATUS_TTL_SECONDS: 21600
};

const HEADERS = [
  'Carimbo de data/hora',
  'DATA',
  'NOME',
  'MOVIMENTAÇÃO',
  'TIPO',
  'VALOR R$',
  'Foto da Entrada ou Saída',
  'ENTRADAS',
  'SAÍDAS'
];


/* =========================================================
   GET
   ========================================================= */

function doGet(e) {

  const p = (e && e.parameter) || {};
  const callback = p.callback || '';

  let result;

  try {

    if (p.action === 'form') {

      const form = FormApp.openById(CONFIG.FORM_ID);

      result = {
        success: true,
        app: 'Kerigma',
        formTitle: form.getTitle(),
        questions: getFormQuestions_()
      };

    } else if (p.action === 'status') {

      const id = String(p.id || '').trim();

      if (!id) {
        result = {
          success: false,
          error: 'ID NÃO INFORMADO.'
        };

      } else {

        const props =
          PropertiesService.getScriptProperties();

        const row =
          props.getProperty('row_' + id);

        result = {
          success: !!row,
          confirmed: !!row,
          submissionId: id,
          row: row ? Number(row) : null
        };
      }

    } else {

      result = {
        success: true,
        app: 'Kerigma',
        message: 'Apps Script ativo.',
        form: FormApp
          .openById(CONFIG.FORM_ID)
          .getTitle(),
        questions: getFormQuestions_().length
      };
    }

  } catch (err) {

    result = {
      success: false,
      error: String(
        err && err.message
          ? err.message
          : err
      )
    };
  }

  const json = JSON.stringify(result);

  if (callback) {

    return ContentService
      .createTextOutput(
        callback + '(' + json + ');'
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/* =========================================================
   POST
   ========================================================= */

function doPost(e) {

  try {

    const p =
      (e && e.parameter) || {};

    const action =
      String(
        p.action || 'save'
      ).trim().toLowerCase();

    console.log(
      'DOPOST ACTION: ' + action
    );

    console.log(
      'SUBMISSION ID: ' +
      String(p.submissionId || '')
    );

    if (action === 'photo') {

      return handlePhoto_(p);

    }

    return handleSave_(e);

  } catch (err) {

    console.error(err);

    return json_({
      success: false,
      error: String(
        err && err.message
          ? err.message
          : err
      )
    });
  }
}


/* =========================================================
   SALVAR DADOS
   ========================================================= */

function handleSave_(e) {

  if (!e) {
    throw new Error(
      'EVENTO POST NÃO RECEBIDO.'
    );
  }

  const parameter =
    e.parameter || {};

  const parameters =
    e.parameters || {};

  const submissionId =
    String(
      parameter.submissionId || ''
    ).trim();

  if (!submissionId) {

    throw new Error(
      'SUBMISSIONID NÃO INFORMADO.'
    );
  }


  /* -------------------------------------------------------
     EVITA DUPLICIDADE
     ------------------------------------------------------- */

  const props =
    PropertiesService
      .getScriptProperties();

  const existingRow =
    props.getProperty(
      'row_' + submissionId
    );

  if (existingRow) {

    return json_({
      success: true,
      duplicate: true,
      confirmed: true,
      submissionId: submissionId,
      row: Number(existingRow)
    });
  }


  /* -------------------------------------------------------
     PERGUNTAS DO FORMULÁRIO
     ------------------------------------------------------- */

  const questions =
    getFormQuestions_();

  const answers = {};


  questions.forEach(function(q) {

    const key =
      'answer_' + q.index;

    const values =
      parameters[key];


    if (
      values &&
      values.length
    ) {

      let value =
        values.length === 1
          ? values[0]
          : values.join(', ');


      if (
        typeof value === 'string'
      ) {

        value =
          value.toUpperCase();
      }


      answers[q.title] =
        value;
    }

  });


  /* -------------------------------------------------------
     PLANILHA
     ------------------------------------------------------- */

  const sheet =
    getTargetSheet_();


  corrigirCabecalhos_(
    sheet
  );


  const headers =
    getHeaders_(sheet);


  /* -------------------------------------------------------
     MONTA LINHA
     ------------------------------------------------------- */

  const row =
    headers.map(function(header) {

      const n =
        normalize_(header);


      if (
        n === normalize_(
          'Carimbo de data/hora'
        ) ||
        n === normalize_(
          'Data e Hora'
        ) ||
        n === normalize_(
          'Timestamp'
        )
      ) {

        return new Date();
      }


      return findAnswerUpper_(
        answers,
        header
      );

    });


  /* -------------------------------------------------------
     GARANTE 9 COLUNAS
     ------------------------------------------------------- */

  while (
    row.length < 9
  ) {

    row.push('');

  }


  /* -------------------------------------------------------
     GRAVA
     ------------------------------------------------------- */

  sheet.appendRow(
    row
  );

  SpreadsheetApp.flush();


  const savedRow =
    sheet.getLastRow();


  /* -------------------------------------------------------
     GUARDA A LINHA
     ------------------------------------------------------- */

  props.setProperty(
    'row_' + submissionId,
    String(savedRow)
  );


  /* -------------------------------------------------------
     CONFIRMAÇÃO
     ------------------------------------------------------- */

  props.setProperty(
    'status_' + submissionId,
    'OK'
  );


  console.log(
    'GRAVAÇÃO CONFIRMADA'
  );

  console.log(
    'SUBMISSION: ' +
    submissionId
  );

  console.log(
    'LINHA: ' +
    savedRow
  );


  return json_({

    success: true,

    confirmed: true,

    submissionId: submissionId,

    row: savedRow,

    sheet: sheet.getName(),

    photoSaved: false

  });
}


/* =========================================================
   FOTO
   ========================================================= */

function handlePhoto_(p) {

  const submissionId =
    String(
      p.submissionId || ''
    ).trim();


  if (!submissionId) {

    throw new Error(
      'SUBMISSIONID NÃO INFORMADO PARA FOTO.'
    );
  }


  const dataUrl =
    String(
      p.photoData || ''
    );


  if (!dataUrl) {

    throw new Error(
      'FOTO NÃO RECEBIDA.'
    );
  }


  const comma =
    dataUrl.indexOf(',');


  if (comma < 0) {

    throw new Error(
      'FORMATO DA FOTO INVÁLIDO.'
    );
  }


  const base64 =
    dataUrl.substring(
      comma + 1
    );


  const bytes =
    Utilities.base64Decode(
      base64
    );


  if (
    bytes.length >
    6 * 1024 * 1024
  ) {

    throw new Error(
      'FOTO OTIMIZADA MAIOR QUE 6 MB.'
    );
  }


  const mime =
    String(
      p.mimeType ||
      'image/jpeg'
    );


  const blob =
    Utilities.newBlob(
      bytes,
      mime,
      'FLUXO_CAIXA_' +
      submissionId +
      '.jpg'
    );


  const folder =
    getPhotoFolder_();


  const file =
    folder.createFile(
      blob
    );


  file.setName(
    'FLUXO_CAIXA_' +
    submissionId +
    '.jpg'
  );


  try {

    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

  } catch (err) {

    console.warn(
      'COMPARTILHAMENTO NÃO ALTERADO: ' +
      err
    );
  }


  const props =
    PropertiesService
      .getScriptProperties();


  const row =
    Number(
      props.getProperty(
        'row_' + submissionId
      )
    );


  if (!row) {

    throw new Error(
      'LINHA DO LANÇAMENTO NÃO ENCONTRADA.'
    );
  }


  const sheet =
    getTargetSheet_();


  const headers =
    getHeaders_(sheet);


  const photoTitle =
    String(
      p.photoQuestion ||
      'Foto da Entrada ou Saída'
    );


  let col =
    headers.findIndex(
      function(header) {

        return (
          normalize_(header) ===
          normalize_(photoTitle)
        );

      }
    );


  if (col < 0) {

    col =
      headers.findIndex(
        function(header) {

          return (
            normalize_(header) ===
            normalize_(
              'Foto da Entrada ou Saída'
            )
          );

        }
      );
  }


  if (col < 0) {

    throw new Error(
      'COLUNA DA FOTO NÃO ENCONTRADA.'
    );
  }


  sheet
    .getRange(
      row,
      col + 1
    )
    .setValue(
      file.getUrl()
    );


  SpreadsheetApp.flush();


  return json_({

    success: true,

    confirmed: true,

    photoSaved: true,

    url: file.getUrl(),

    row: row

  });
}


/* =========================================================
   PASTA DAS FOTOS
   ========================================================= */

function getPhotoFolder_() {

  const folders =
    DriveApp.getFoldersByName(
      CONFIG.PHOTO_FOLDER_NAME
    );


  if (folders.hasNext()) {

    return folders.next();

  }


  return DriveApp.createFolder(
    CONFIG.PHOTO_FOLDER_NAME
  );
}


/* =========================================================
   PERGUNTAS
   ========================================================= */

function getFormQuestions_() {

  const form =
    FormApp.openById(
      CONFIG.FORM_ID
    );


  return form
    .getItems()
    .map(function(item, index) {

      const type =
        item.getType();

      const title =
        item.getTitle
          ? item.getTitle()
          : '';


      const q = {

        index: index,

        title: title,

        type: String(type),

        required: false,

        choices: [],

        rows: [],

        columns: [],

        helpText: ''

      };


      try {

        if (
          typeof item.isRequired ===
          'function'
        ) {

          q.required =
            item.isRequired();

        }

      } catch (_) {}


      try {

        if (
          typeof item.getHelpText ===
          'function'
        ) {

          q.helpText =
            item.getHelpText() || '';

        }

      } catch (_) {}


      switch (type) {

        case FormApp.ItemType.TEXT:

          q.type = 'TEXT';

          break;


        case FormApp.ItemType.PARAGRAPH_TEXT:

          q.type = 'PARAGRAPH';

          break;


        case FormApp.ItemType.MULTIPLE_CHOICE:

          q.type = 'RADIO';

          q.choices =
            item
              .asMultipleChoiceItem()
              .getChoices()
              .map(function(c) {
                return c.getValue();
              });

          break;


        case FormApp.ItemType.LIST:

          q.type = 'LIST';

          q.choices =
            item
              .asListItem()
              .getChoices()
              .map(function(c) {
                return c.getValue();
              });

          break;


        case FormApp.ItemType.CHECKBOX:

          q.type = 'CHECKBOX';

          q.choices =
            item
              .asCheckboxItem()
              .getChoices()
              .map(function(c) {
                return c.getValue();
              });

          break;


        case FormApp.ItemType.SCALE: {

          q.type = 'SCALE';

          const scale =
            item.asScaleItem();

          for (
            let i =
              scale.getLowerBound();

            i <=
              scale.getUpperBound();

            i++
          ) {

            q.choices.push(
              String(i)
            );

          }

          break;
        }


        case FormApp.ItemType.DATE:

          q.type = 'DATE';

          break;


        case FormApp.ItemType.TIME:

          q.type = 'TIME';

          break;


        case FormApp.ItemType.DURATION:

          q.type = 'DURATION';

          break;


        case FormApp.ItemType.GRID: {

          q.type = 'GRID';

          const grid =
            item.asGridItem();

          q.rows =
            grid.getRows();

          q.columns =
            grid.getColumns();

          break;
        }


        case FormApp.ItemType.CHECKBOX_GRID: {

          q.type =
            'CHECKBOX_GRID';

          const grid =
            item.asCheckboxGridItem();

          q.rows =
            grid.getRows();

          q.columns =
            grid.getColumns();

          break;
        }


        default:

          q.type = 'TEXT';

      }


      return q;

    })
    .filter(function(q) {

      return (
        q.title &&
        ![
          'SECTION_HEADER',
          'PAGE_BREAK',
          'IMAGE',
          'VIDEO'
        ].includes(q.type)
      );

    });
}


/* =========================================================
   LOCALIZAR ABA
   ========================================================= */

function getTargetSheet_() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );


  let sheet =
    ss.getSheets().find(
      function(s) {

        return (
          s.getSheetId() ===
          Number(CONFIG.SHEET_GID)
        );

      }
    );


  if (!sheet) {

    sheet =
      ss.getSheetByName(
        CONFIG.SHEET_NAME
      );

  }


  if (!sheet) {

    throw new Error(
      'ABA "' +
      CONFIG.SHEET_NAME +
      '" NÃO FOI ENCONTRADA.'
    );
  }


  return sheet;
}


/* =========================================================
   CORRIGIR CABEÇALHOS
   ========================================================= */

function corrigirCabecalhos_(sheet) {

  const current =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          9,
          sheet.getLastColumn()
        )
      )
      .getDisplayValues()[0]
      .slice(0, 9);


  const generic =
    current.every(
      function(value, index) {

        return (
          String(value).trim() ===
          'Column ' +
          (index + 1)
        );

      }
    );


  const empty =
    current.every(
      function(value) {

        return (
          String(value).trim() === ''
        );

      }
    );


  if (
    generic ||
    empty
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS.length
      )
      .setValues([
        HEADERS
      ]);


    SpreadsheetApp.flush();

  }
}


/* =========================================================
   CABEÇALHOS
   ========================================================= */

function getHeaders_(sheet) {

  corrigirCabecalhos_(
    sheet
  );


  return sheet
    .getRange(
      1,
      1,
      1,
      HEADERS.length
    )
    .getDisplayValues()[0]
    .map(function(value) {

      return String(
        value
      ).trim();

    });
}


/* =========================================================
   LOCALIZAR RESPOSTA
   ========================================================= */

function findAnswer_(
  answers,
  header
) {

  const target =
    normalize_(
      header
    );


  const keys =
    Object.keys(
      answers
    );


  const exact =
    keys.find(
      function(key) {

        return (
          normalize_(key) ===
          target
        );

      }
    );


  if (
    exact !== undefined
  ) {

    return answers[exact];

  }


  const partial =
    keys.find(
      function(key) {

        const nk =
          normalize_(key);


        return (
          nk === target ||
          nk.includes(target) ||
          target.includes(nk)
        );

      }
    );


  if (
    partial !== undefined
  ) {

    return answers[partial];

  }


  return '';
}


/* =========================================================
   MAIÚSCULAS
   ========================================================= */

function findAnswerUpper_(
  answers,
  header
) {

  const value =
    findAnswer_(
      answers,
      header
    );


  if (
    value === null ||
    value === undefined
  ) {

    return '';
  }


  if (
    typeof value === 'string' &&
    /^https?:\/\//i.test(value)
  ) {

    return value;
  }


  if (
    Array.isArray(value)
  ) {

    return value
      .map(function(v) {
        return String(v).toUpperCase();
      })
      .join(', ');
  }


  return String(
    value
  ).toUpperCase();
}


/* =========================================================
   NORMALIZAR
   ========================================================= */

function normalize_(value) {

  return String(
    value || ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .trim();
}


/* =========================================================
   JSON
   ========================================================= */

function json_(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/* =========================================================
   TESTE DA PLANILHA
   ========================================================= */

function testarPlanilha() {

  const ss =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );

  const sheet =
    getTargetSheet_();

  const headers =
    getHeaders_(
      sheet
    );


  console.log(
    'PLANILHA: ' +
    ss.getName()
  );

  console.log(
    'ABA: ' +
    sheet.getName()
  );

  console.log(
    'GID: ' +
    sheet.getSheetId()
  );

  console.log(
    'CABEÇALHOS: ' +
    JSON.stringify(
      headers
    )
  );

  return true;
}


/* =========================================================
   TESTE COMPLETO
   ========================================================= */

function testarConfiguracao() {

  const form =
    FormApp.openById(
      CONFIG.FORM_ID
    );

  const sheet =
    getTargetSheet_();

  const qs =
    getFormQuestions_();


  console.log(
    'FORMULÁRIO: ' +
    form.getTitle()
  );


  console.log(
    'PERGUNTAS: ' +
    qs.length
  );


  qs.forEach(
    function(q, i) {

      console.log(
        (i + 1) +
        '. ' +
        q.title +
        ' [' +
        q.type +
        ']'
      );

    }
  );


  console.log(
    'PLANILHA: ' +
    sheet.getName()
  );


  console.log(
    'GID: ' +
    sheet.getSheetId()
  );


  console.log(
    'CABECALHOS: ' +
    JSON.stringify(
      getHeaders_(sheet)
    )
  );


  return true;
}


/* =========================================================
   TESTE DE GRAVAÇÃO
   ========================================================= */

function testarGravacaoPlanilha() {

  const sheet =
    getTargetSheet_();


  const headers =
    getHeaders_(
      sheet
    );


  const row =
    headers.map(
      function(header) {

        const n =
          normalize_(
            header
          );


        if (
          n === normalize_(
            'Carimbo de data/hora'
          )
        ) {
          return new Date();
        }


        if (
          n === normalize_(
            'DATA'
          )
        ) {
          return 'TESTE';
        }


        if (
          n === normalize_(
            'NOME'
          )
        ) {
          return 'TESTE KERIGMA';
        }


        if (
          n === normalize_(
            'MOVIMENTAÇÃO'
          )
        ) {
          return 'ENTRADA';
        }


        if (
          n === normalize_(
            'TIPO'
          )
        ) {
          return 'TESTE';
        }


        if (
          n === normalize_(
            'VALOR R$'
          )
        ) {
          return 'R$ 1,00';
        }


        if (
          n === normalize_(
            'ENTRADAS'
          )
        ) {
          return 'R$ 1,00';
        }


        return '';
      }
    );


  sheet.appendRow(
    row
  );


  SpreadsheetApp.flush();


  console.log(
    'TESTE GRAVADO NA LINHA: ' +
    sheet.getLastRow()
  );


  return sheet.getLastRow();
}