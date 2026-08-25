(() => {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const form = $("dynamicForm");
  const questionsBox = $("questions");
  const statusDot = $("statusDot");
  const statusTitle = $("statusTitle");
  const statusText = $("statusText");
  const errorBox = $("errorBox");
  const debugCard = $("debugCard");
  const debugText = $("debugText");
  const retryBtn = $("retryBtn");
  const submitBtn = $("submitBtn");
  const successBox = $("successBox");

  $("version").textContent = "v" + (cfg.VERSION || "?");

  function status(type, title, text) {
    statusDot.className = "status-dot " + (type || "");
    statusTitle.textContent = title;
    statusText.textContent = text;
  }

  function showDebug(msg) {
    debugCard.classList.remove("hidden");
    debugText.textContent = msg;
  }

  function fail(msg, debug) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
    status("error", "Não foi possível carregar", msg);
    if (debug) showDebug(debug);
  }

  function clearError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m])
    );
  }

  function addField(q, control) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.innerHTML = esc(q.title) + (q.required ? ' <span class="required">*</span>' : "");
    wrap.appendChild(label);

    if (q.helpText) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = q.helpText;
      wrap.appendChild(hint);
    }

    wrap.appendChild(control);
    return wrap;
  }


  function isPhotoQuestion(q) {
    return q.title && (
      q.title.toLowerCase().includes("foto da entrada") ||
      q.title.toLowerCase().includes("foto")
    );
  }

  function buildPhotoQuestion(q) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.innerHTML = esc(q.title) + (q.required ? ' <span class="required">*</span>' : "");
    wrap.appendChild(label);

    const box = document.createElement("div");
    box.className = "photo-box";

    // DOIS INPUTS NATIVOS: UM PARA CÂMERA E OUTRO PARA ARQUIVO/GALERIA.
    // ISSO EVITA DEPENDER DO COMPORTAMENTO VARIÁVEL DE capture=...
    const cameraInput = document.createElement("input");
    cameraInput.className = "photo-input-native";
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.capture = "environment";
    cameraInput.name = "photo_camera_" + q.index;
    cameraInput.dataset.title = q.title;
    cameraInput.dataset.photo = "true";
    cameraInput.dataset.source = "camera";
    cameraInput.dataset.required = q.required ? "true" : "false";

    const fileInput = document.createElement("input");
    fileInput.className = "photo-input-native";
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.name = "photo_file_" + q.index;
    fileInput.dataset.title = q.title;
    fileInput.dataset.photo = "true";
    fileInput.dataset.source = "file";
    fileInput.dataset.required = q.required ? "true" : "false";

    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "photo-label";
    choose.textContent = "📷 FOTO — CÂMERA OU ARQUIVO";
    choose.addEventListener("click", () => {
      openPhotoChooser(cameraInput, fileInput);
    });

    const info = document.createElement("div");
    info.className = "photo-info";
    info.textContent = "TOQUE NO BOTÃO E ESCOLHA: CÂMERA DO CELULAR OU ARQUIVO/GALERIA.";

    const preview = document.createElement("div");
    preview.className = "photo-preview";
    const img = document.createElement("img");
    img.alt = "PRÉVIA DA FOTO";
    preview.appendChild(img);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-remove";
    remove.textContent = "REMOVER FOTO";

    function handleFile(file) {
      if (!file) return;
      const max = 1024 * 1024 * 1024;
      if (file.size > max) {
        cameraInput.value = "";
        fileInput.value = "";
        alert("A FOTO NÃO PODE ULTRAPASSAR 1 GB.");
        return;
      }
      if (!file.type || !file.type.startsWith("image/")) {
        cameraInput.value = "";
        fileInput.value = "";
        alert("SELECIONE UMA IMAGEM.");
        return;
      }
      // Mantém a foto escolhida em ambos os inputs através de uma propriedade comum.
      wrap._selectedPhotoFile = file;
      wrap._photoTitle = q.title;
      img.src = URL.createObjectURL(file);
      preview.style.display = "block";
      remove.style.display = "inline-block";
      info.textContent = "FOTO SELECIONADA: " + file.name + " — " + formatBytes(file.size);
    }

    cameraInput.addEventListener("change", () => handleFile(cameraInput.files && cameraInput.files[0]));
    fileInput.addEventListener("change", () => handleFile(fileInput.files && fileInput.files[0]));

    remove.addEventListener("click", () => {
      cameraInput.value = "";
      fileInput.value = "";
      wrap._selectedPhotoFile = null;
      preview.style.display = "none";
      remove.style.display = "none";
      info.textContent = "TOQUE NO BOTÃO E ESCOLHA: CÂMERA DO CELULAR OU ARQUIVO/GALERIA.";
    });

    box.append(cameraInput, fileInput, choose, info, preview, remove);
    wrap._photoCameraInput = cameraInput;
    wrap._photoFileInput = fileInput;
    wrap._selectedPhotoFile = null;
    wrap._photoTitle = q.title;
    wrap.appendChild(box);
    return wrap;
  }

  function openPhotoChooser(cameraInput, fileInput) {
    // Modal explícito: no celular o usuário escolhe a origem da foto.
    const modal = document.createElement("div");
    modal.className = "photo-choice-modal";
    modal.innerHTML = `
      <div class="photo-choice-card">
        <div class="photo-choice-title">📷 FOTO DA ENTRADA OU SAÍDA</div>
        <div class="photo-choice-subtitle">ESCOLHA DE ONDE VAI PEGAR A FOTO:</div>
        <button type="button" class="photo-choice-btn camera">📸 ABRIR CÂMERA</button>
        <button type="button" class="photo-choice-btn file">🖼️ ESCOLHER ARQUIVO / GALERIA</button>
        <button type="button" class="photo-choice-cancel">CANCELAR</button>
      </div>`;

    document.body.appendChild(modal);

    modal.querySelector(".camera").addEventListener("click", () => {
      modal.remove();
      cameraInput.click();
    });
    modal.querySelector(".file").addEventListener("click", () => {
      modal.remove();
      fileInput.click();
    });
    modal.querySelector(".photo-choice-cancel").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.remove();
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B","KB","MB","GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return (bytes / Math.pow(1024, i)).toFixed(i ? 2 : 0) + " " + units[i];
  }

  async function compressImage(file, maxDimension = 1920, quality = 0.78) {
    const bitmap = await createImageBitmap(file);
    let dimension = Math.min(maxDimension, Math.max(bitmap.width, bitmap.height));
    let q = quality;
    let blob = null;

    // O CAMPO PODE ACEITAR ARQUIVOS DE ATÉ 1 GB, MAS O ARQUIVO
    // ENVIADO AO APPS SCRIPT É COMPRIMIDO PARA ATÉ 5 MB.
    for (let attempt = 0; attempt < 7; attempt++) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d", {alpha:false});
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => b ? resolve(b) : reject(new Error("NÃO FOI POSSÍVEL PROCESSAR A FOTO.")),
          "image/jpeg",
          q
        );
      });

      if (blob.size <= 5 * 1024 * 1024) break;
      dimension = Math.round(dimension * 0.78);
      q = Math.max(0.55, q - 0.06);
    }

    bitmap.close();
    return blob;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("ERRO AO LER A FOTO."));
      reader.readAsDataURL(blob);
    });
  }

  function buildQuestion(q) {
    if (isPhotoQuestion(q)) return buildPhotoQuestion(q);
    const name = "q_" + q.index;

    if (q.type === "RADIO" || q.type === "CHECKBOX") {
      const list = document.createElement("div");
      list.className = "choice-list";

      (q.choices || []).forEach(value => {
        const row = document.createElement("label");
        row.className = "choice";

        const input = document.createElement("input");
        input.type = q.type === "RADIO" ? "radio" : "checkbox";
        input.name = name;
        input.value = value;
        input.dataset.title = q.title;
        input.dataset.required = q.required ? "true" : "false";

        row.append(input, document.createTextNode(value));
        list.appendChild(row);
      });

      return addField(q, list);
    }

    if (q.type === "LIST" || q.type === "SCALE") {
      const select = document.createElement("select");
      select.name = name;
      select.dataset.title = q.title;
      select.required = !!q.required;

      const first = document.createElement("option");
      first.value = "";
      first.textContent = "Selecione...";
      select.appendChild(first);

      (q.choices || []).forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      return addField(q, select);
    }

    if (q.type === "GRID" || q.type === "CHECKBOX_GRID") {
      const table = document.createElement("div");
      table.className = "grid-question";

      const rows = q.rows || [];
      const cols = q.columns || [];

      rows.forEach((rowText, ri) => {
        const row = document.createElement("div");
        row.className = "grid-row";
        const title = document.createElement("div");
        title.className = "grid-row-title";
        title.textContent = rowText;
        row.appendChild(title);

        const select = document.createElement("select");
        select.dataset.title = q.title + " — " + rowText;
        select.dataset.grid = "true";
        select.name = name + "_" + ri;

        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Selecione...";
        select.appendChild(empty);

        cols.forEach(c => {
          const o = document.createElement("option");
          o.value = c;
          o.textContent = c;
          select.appendChild(o);
        });

        row.appendChild(select);
        table.appendChild(row);
      });

      return addField(q, table);
    }

    const control = document.createElement(q.type === "PARAGRAPH" ? "textarea" : "input");
    control.name = name;
    control.dataset.title = q.title;
    control.required = !!q.required;

    if (q.type === "DATE") control.type = "date";
    else if (q.type === "TIME") control.type = "time";
    else if (q.type === "DURATION") control.type = "text";
    else control.type = "text";

    return addField(q, control);
  }

  function forceUppercaseInputs() {
    questionsBox.addEventListener("input", event => {
      const el = event.target;
      if (!el || el.type === "file") return;
      if (el.matches("input[type=text], textarea")) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = el.value.toUpperCase();
        try { el.setSelectionRange(start, end); } catch (_) {}
      }
    });
  }

  function render(data) {
    if (!data || data.success === false) {
      throw new Error(data?.error || "O Apps Script retornou uma resposta inválida.");
    }

    const qs = data.questions || [];
    window.__kerigmaQuestions = qs;
    questionsBox.innerHTML = "";

    qs.forEach(q => questionsBox.appendChild(buildQuestion(q)));

    if (!qs.length) {
      throw new Error("O Google Forms foi acessado, mas não retornou nenhuma pergunta.");
    }

    $("questionCount").textContent = qs.length + " campo(s) carregado(s) do Google Forms.";
    form.classList.remove("hidden");
    status("ok", "Formulário carregado", qs.length + " pergunta(s) encontrada(s).");
    clearError();
    debugCard.classList.add("hidden");
  }

  function jsonp(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const cb = "__kerigma_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      let finished = false;

      const finish = (err, data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) {}
        script.remove();
        err ? reject(err) : resolve(data);
      };

      window[cb] = data => finish(null, data);

      script.onerror = () => finish(new Error(
        "O navegador não conseguiu acessar o Apps Script. Normalmente isso ocorre quando a implantação não está como “Qualquer pessoa” ou a URL /exec está incorreta."
      ));

      const timer = setTimeout(() => finish(new Error(
        "Tempo esgotado ao consultar o Apps Script. Verifique a URL /exec, a implantação e as permissões."
      )), timeoutMs);

      script.src = url + (url.includes("?") ? "&" : "?") +
        "action=form&callback=" + encodeURIComponent(cb) +
        "&_=" + Date.now();

      document.body.appendChild(script);
    });
  }

  async function loadQuestions() {
    form.classList.add("hidden");
    status("", "Conectando...", "Consultando o Google Forms pelo Apps Script.");
    clearError();

    const url = String(cfg.APPS_SCRIPT_URL || "").trim();

    if (!url || url.includes("COLE_AQUI")) {
      const msg = "A URL do Apps Script ainda não foi configurada.";
      fail(msg, "Edite config.js e substitua APPS_SCRIPT_URL pela URL pública terminada em /exec.");
      return;
    }

    try {
      const data = await jsonp(url);
      render(data);
    } catch (err) {
      console.error(err);
      fail(err.message || "Falha ao carregar as perguntas.",
        "URL usada: " + url + "\n\nDetalhe: " + (err.message || err));
    }
  }

  function collect() {
    const answers = {};
    form.querySelectorAll("input[data-title], select[data-title], textarea[data-title]").forEach(el => {
      const title = el.dataset.title;
      if (el.dataset.photo === "true") return;

      if (el.type === "checkbox") {
        if (!answers[title]) answers[title] = [];
        if (el.checked) answers[title].push(el.value);
      } else if (el.type === "radio") {
        if (el.checked) answers[title] = el.value;
      } else if (el.dataset.grid === "true") {
        answers[title] = el.value;
      } else {
        answers[title] = el.value;
      }
    });

    Object.keys(answers).forEach(k => {
      if (Array.isArray(answers[k])) answers[k] = answers[k].join(", ");
    });

    return answers;
  }

  function getPhotoContainer() {
    return form.querySelector('.field .photo-box')?.parentElement || null;
  }

  function getSelectedPhotoFile() {
    const field = form.querySelector('.photo-box')?.parentElement;
    return field && field._selectedPhotoFile ? field._selectedPhotoFile : null;
  }


  function postNative(fields, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const iframeName = "kerigma_submit_frame_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.cssText = "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;border:0;opacity:0;";
      document.body.appendChild(iframe);

      const f = document.createElement("form");
      f.method = "POST";
      f.action = cfg.APPS_SCRIPT_URL;
      f.target = iframeName;
      f.enctype = "application/x-www-form-urlencoded";
      f.acceptCharset = "UTF-8";
      f.style.display = "none";

      Object.entries(fields).forEach(([name, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => {
            const input=document.createElement("input"); input.type="hidden"; input.name=name; input.value=String(v); f.appendChild(input);
          });
        } else {
          const input=document.createElement("input"); input.type="hidden"; input.name=name; input.value=String(value ?? ""); f.appendChild(input);
        }
      });
      document.body.appendChild(f);

      let done=false;
      const finish=(err)=>{ if(done)return; done=true; clearTimeout(timer); iframe.remove(); f.remove(); err?reject(err):resolve(true); };
      const timer=setTimeout(()=>finish(new Error("TEMPO ESGOTADO AO ENVIAR AO APPS SCRIPT.")),timeoutMs);
      iframe.addEventListener("load",()=>finish(null),{once:true});
      f.submit();
    });
  }

  async function submit(e) {
    e.preventDefault();
    clearError();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const submissionId = "KRG-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const answers = collect();
    const photoField = form.querySelector('.photo-box')?.parentElement;
    const original = photoField && photoField._selectedPhotoFile ? photoField._selectedPhotoFile : null;
    const photoRequired = !!(photoField && photoField.querySelector('input[data-required="true"]'));
    if (photoRequired && !original) { fail("A FOTO É OBRIGATÓRIA."); return; }

    try {
      submitBtn.disabled=true;
      submitBtn.querySelector("span").textContent="ENVIANDO...";
      status("", "SALVANDO...", "GRAVANDO AS RESPOSTAS NA PLANILHA.");

      // PRIMEIRO POST: SOMENTE OS DADOS. NÃO ENVIA FOTO JUNTO.
      const fields={action:"save",submissionId:submissionId,submittedAt:new Date().toISOString()};
      const qs = (window.__kerigmaQuestions || []);
      qs.forEach(q=>{
        let value=answers[q.title];
        if(value===undefined) value="";
        fields["answer_"+q.index]=String(value).toUpperCase();
      });
      await postNative(fields,30000);

      // CONFIRMAÇÃO DO REGISTRO DA PLANILHA.
      let confirmed=false;
      for(let i=0;i<12;i++){
        await new Promise(r=>setTimeout(r,700));
        try{ confirmed=await jsonpStatus(cfg.APPS_SCRIPT_URL,submissionId); }catch(_){ confirmed=false; }
        if(confirmed) break;
      }
      if(!confirmed) throw new Error("O APPS SCRIPT NÃO CONFIRMOU A GRAVAÇÃO DA PLANILHA.");

      // SEGUNDO POST: FOTO. SE FALHAR, A PLANILHA JÁ ESTÁ SALVA.
      let photoSaved=false;
      if(original){
        status("", "ENVIANDO FOTO...", "A RESPOSTA JÁ FOI SALVA. AGORA ENVIANDO A FOTO.");
        const optimized=await compressImage(original,1600,0.72);
        if(optimized.size>4*1024*1024) throw new Error("A FOTO NÃO PÔDE SER REDUZIDA O SUFICIENTE.");
        const dataUrl=await blobToDataUrl(optimized);
        const photoResult = await postNative({
          action:"photo",
          submissionId:submissionId,
          photoQuestion:photoField._photoTitle || "Foto da Entrada ou Saída",
          mimeType:"image/jpeg",
          photoData:dataUrl
        },60000);
        photoSaved=true;
      }

      form.classList.add("hidden");
      successBox.classList.remove("hidden");
      status("ok", "ENVIADO COM SUCESSO", photoSaved ? "DADOS E FOTO REGISTRADOS." : "DADOS REGISTRADOS NA PLANILHA.");
    } catch(err){
      console.error(err);
      fail(String(err.message||"FALHA NO ENVIO.").toUpperCase(),"DETALHE: "+(err.message||err));
    } finally {
      submitBtn.disabled=false;
      submitBtn.querySelector("span").textContent="ENVIAR FORMULÁRIO";
    }
  }

  function jsonpStatus(url, id) {
    return new Promise(resolve => {
      const cb = "__kerigma_status_" + Date.now();
      const script = document.createElement("script");
      let done = false;

      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) {}
        script.remove();
        resolve(!!value);
      };

      window[cb] = data => finish(data && data.success);
      script.onerror = () => finish(false);

      const timer = setTimeout(() => finish(false), 8000);
      script.src = url + (url.includes("?") ? "&" : "?") +
        "action=status&id=" + encodeURIComponent(id) +
        "&callback=" + encodeURIComponent(cb);

      document.body.appendChild(script);
    });
  }

  forceUppercaseInputs();

  retryBtn.addEventListener("click", loadQuestions);
  form.addEventListener("submit", submit);

  $("newFormBtn").addEventListener("click", () => {
    successBox.classList.add("hidden");
    form.classList.remove("hidden");
    form.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  loadQuestions();
})();