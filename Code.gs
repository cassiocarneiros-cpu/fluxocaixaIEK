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
      result = { success:true, app:'Kerigma', formTitle:FormApp.openById(CONFIG.FORM_ID).getTitle(), questions:getFormQuestions_() };
    } else if (p.action === 'status') {
      const id=String(p.id||'');
      result={success:!!id && CacheService.getScriptCache().get('status_'+id)==='OK'};
    } else {
      result={success:true, app:'Kerigma', message:'Apps Script ativo.', form:FormApp.openById(CONFIG.FORM_ID).getTitle(), questions:getFormQuestions_().length};
    }
  } catch(err) { result={success:false,error:String(err&&err.message||err)}; }
  const json=JSON.stringify(result);
  if(callback) return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const p=(e&&e.parameter)||{};
    const action=String(p.action||'save');
    if(action==='photo') return handlePhoto_(p);
    return handleSave_(e);
  } catch(err) {
    console.error(err);
    return json_({success:false,error:String(err&&err.message||err)});
  }
}

function handleSave_(e) {
  const p=(e&&e.parameters)||{};
  const submissionId=String((e&&e.parameter&&e.parameter.submissionId)||'').trim();
  if(!submissionId) throw new Error('SUBMISSIONID NÃO INFORMADO.');

  const cache=CacheService.getScriptCache();
  const key='status_'+submissionId;
  if(cache.get(key)==='OK') return json_({success:true,duplicate:true,submissionId:submissionId});

  const questions=getFormQuestions_();
  const answers={};
  questions.forEach(function(q){
    const values=p['answer_'+q.index];
    if(values && values.length) answers[q.title]=values.length===1?values[0]:values.join(', ');
  });

  const sheet=getTargetSheet_();
  const headers=getHeaders_(sheet);
  const row=headers.map(function(header){
    const n=normalize_(header);
    if(n===normalize_('Carimbo de data/hora')||n===normalize_('Data e Hora')||n===normalize_('Timestamp')) return new Date();
    return findAnswerUpper_(answers,header);
  });

  // GARANTE A CRIAÇÃO DA LINHA ANTES DE QUALQUER FOTO.
  sheet.appendRow(row);
  SpreadsheetApp.flush();
  const savedRow=sheet.getLastRow();
  PropertiesService.getScriptProperties().setProperty('row_'+submissionId,String(savedRow));
  cache.put(key,'OK',CONFIG.STATUS_TTL_SECONDS);

  return json_({success:true,submissionId:submissionId,row:savedRow,sheet:sheet.getName(),photoSaved:false});
}

function handlePhoto_(p) {
  const submissionId=String(p.submissionId||'').trim();
  if(!submissionId) throw new Error('SUBMISSIONID NÃO INFORMADO PARA FOTO.');
  const dataUrl=String(p.photoData||'');
  if(!dataUrl) throw new Error('FOTO NÃO RECEBIDA.');

  const comma=dataUrl.indexOf(',');
  if(comma<0) throw new Error('FORMATO DA FOTO INVÁLIDO.');
  const bytes=Utilities.base64Decode(dataUrl.substring(comma+1));
  if(bytes.length>6*1024*1024) throw new Error('FOTO OTIMIZADA MAIOR QUE 6 MB.');

  const mime=String(p.mimeType||'image/jpeg');
  const blob=Utilities.newBlob(bytes,mime,'FLUXO_CAIXA_'+submissionId+'.jpg');
  const folder=getPhotoFolder_();
  const file=folder.createFile(blob);
  file.setName('FLUXO_CAIXA_'+submissionId+'.jpg');
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(_){ }

  const row=Number(PropertiesService.getScriptProperties().getProperty('row_'+submissionId));
  if(!row) throw new Error('LINHA DO LANÇAMENTO NÃO ENCONTRADA.');
  const sheet=getTargetSheet_();
  const headers=getHeaders_(sheet);
  const photoTitle=String(p.photoQuestion||'Foto da Entrada ou Saída');
  const col=headers.findIndex(h=>normalize_(h)===normalize_(photoTitle));
  if(col<0) throw new Error('COLUNA DA FOTO NÃO ENCONTRADA: '+photoTitle);
  sheet.getRange(row,col+1).setValue(file.getUrl());
  SpreadsheetApp.flush();
  return json_({success:true,photoSaved:true,url:file.getUrl(),row:row});
}

function findAnswerUpper_(answers,header){
  const value=findAnswer_(answers,header);
  if(value===null||value===undefined) return '';
  if(typeof value==='string'&&/^https?:\/\//i.test(value)) return value;
  return Array.isArray(value)?value.map(v=>String(v).toUpperCase()).join(', '):String(value).toUpperCase();
}
function getPhotoFolder_(){
  const fs=DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  return fs.hasNext()?fs.next():DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);
}
function getFormQuestions_(){
  const form=FormApp.openById(CONFIG.FORM_ID);
  return form.getItems().map(function(item,index){
    const type=item.getType(), title=item.getTitle?item.getTitle():'';
    const q={index:index,title:title,type:String(type),required:false,choices:[],rows:[],columns:[],helpText:''};
    try{if(typeof item.isRequired==='function')q.required=item.isRequired();}catch(_){ }
    try{if(typeof item.getHelpText==='function')q.helpText=item.getHelpText()||'';}catch(_){ }
    switch(type){
      case FormApp.ItemType.TEXT:q.type='TEXT';break;
      case FormApp.ItemType.PARAGRAPH_TEXT:q.type='PARAGRAPH';break;
      case FormApp.ItemType.MULTIPLE_CHOICE:q.type='RADIO';q.choices=item.asMultipleChoiceItem().getChoices().map(c=>c.getValue());break;
      case FormApp.ItemType.LIST:q.type='LIST';q.choices=item.asListItem().getChoices().map(c=>c.getValue());break;
      case FormApp.ItemType.CHECKBOX:q.type='CHECKBOX';q.choices=item.asCheckboxItem().getChoices().map(c=>c.getValue());break;
      case FormApp.ItemType.SCALE:q.type='SCALE';{const s=item.asScaleItem();for(let i=s.getLowerBound();i<=s.getUpperBound();i++)q.choices.push(String(i));}break;
      case FormApp.ItemType.DATE:q.type='DATE';break;
      case FormApp.ItemType.TIME:q.type='TIME';break;
      case FormApp.ItemType.DURATION:q.type='DURATION';break;
      case FormApp.ItemType.GRID:{q.type='GRID';const g=item.asGridItem();q.rows=g.getRows();q.columns=g.getColumns();}break;
      case FormApp.ItemType.CHECKBOX_GRID:{q.type='CHECKBOX_GRID';const g=item.asCheckboxGridItem();q.rows=g.getRows();q.columns=g.getColumns();}break;
      default:q.type='TEXT';
    }
    return q;
  }).filter(q=>q.title && !['SECTION_HEADER','PAGE_BREAK','IMAGE','VIDEO'].includes(q.type));
}
function getTargetSheet_(){
  const ss=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet=ss.getSheets().find(s=>s.getSheetId()===CONFIG.SHEET_GID);
  if(!sheet) throw new Error('A ABA COM O GID '+CONFIG.SHEET_GID+' NÃO FOI ENCONTRADA.');
  return sheet;
}
function getHeaders_(sheet){
  const lastCol=sheet.getLastColumn();
  if(!lastCol) throw new Error('A PRIMEIRA LINHA DA PLANILHA PRECISA CONTER OS NOMES DAS COLUNAS.');
  return sheet.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v).trim());
}
function findAnswer_(answers,header){
  const target=normalize_(header), keys=Object.keys(answers);
  const exact=keys.find(k=>normalize_(k)===target);
  if(exact!==undefined)return answers[exact];
  const partial=keys.find(k=>{const nk=normalize_(k);return nk===target||nk.includes(target)||target.includes(nk);});
  return partial!==undefined?answers[partial]:'';
}
function normalize_(value){return String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function testarConfiguracao(){
  const form=FormApp.openById(CONFIG.FORM_ID), sheet=getTargetSheet_(), qs=getFormQuestions_();
  Logger.log('FORMULÁRIO: '+form.getTitle());Logger.log('PERGUNTAS: '+qs.length);
  qs.forEach((q,i)=>Logger.log((i+1)+'. '+q.title+' ['+q.type+']'));
  Logger.log('PLANILHA: '+sheet.getName());Logger.log('LINHA DE CABEÇALHOS: '+JSON.stringify(getHeaders_(sheet)));
}
