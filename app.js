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

  function buildQuestion(q) {
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

  function render(data) {
    if (!data || data.success === false) {
      throw new Error(data?.error || "O Apps Script retornou uma resposta inválida.");
    }

    const qs = data.questions || [];
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

  async function submit(e) {
    e.preventDefault();
    clearError();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submissionId = "KRG-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const payload = {
      submissionId,
      submittedAt: new Date().toISOString(),
      answers: collect()
    };

    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Enviando...";
    status("", "Enviando...", "Registrando as respostas na planilha.");

    try {
      const response = await fetch(cfg.APPS_SCRIPT_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let result = {};
      try { result = JSON.parse(text); } catch (_) {}

      if (result.success === false) {
        throw new Error(result.error || "O Apps Script recusou o envio.");
      }

      await new Promise(r => setTimeout(r, 500));
      const confirmed = await jsonpStatus(cfg.APPS_SCRIPT_URL, submissionId);

      if (!confirmed) {
        throw new Error("O envio foi feito, mas o Apps Script não confirmou o registro na planilha.");
      }

      form.classList.add("hidden");
      successBox.classList.remove("hidden");
      status("ok", "Enviado com sucesso", "Registro confirmado na planilha.");
    } catch (err) {
      console.error(err);
      fail(err.message || "Falha no envio.", "Detalhe do envio: " + (err.message || err));
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Enviar formulário";
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