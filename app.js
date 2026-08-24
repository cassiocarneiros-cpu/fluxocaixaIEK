(() => {
  const cfg = window.APP_CONFIG;
  const $ = id => document.getElementById(id);
  const questions = $("questions");
  const form = $("dynamicForm");
  const statusDot = $("statusDot");
  const statusTitle = $("statusTitle");
  const statusText = $("statusText");
  const errorBox = $("errorBox");
  const submitBtn = $("submitBtn");
  const successBox = $("successBox");
  const version = $("version");

  version.textContent = `v${cfg.VERSION}`;

  function setStatus(type, title, text){
    statusDot.className = "status-dot" + (type ? " "+type : "");
    statusTitle.textContent = title; statusText.textContent = text;
  }
  function fail(msg){
    errorBox.textContent = msg; errorBox.classList.remove("hidden");
    setStatus("error","Atenção",msg);
  }
  function clearError(){ errorBox.classList.add("hidden"); errorBox.textContent=""; }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function fieldBase(q, control){
    const wrap=document.createElement("div"); wrap.className="field";
    const label=document.createElement("label");
    label.innerHTML=esc(q.title)+(q.required?' <span class="required">*</span>':"");
    wrap.appendChild(label);
    if(q.helpText){const h=document.createElement("div");h.className="hint";h.textContent=q.helpText;wrap.appendChild(h)}
    wrap.appendChild(control);
    return wrap;
  }

  function buildQuestion(q){
    const name = `q_${q.index}`;
    if(q.type==="RADIO" || q.type==="CHECKBOX"){
      const list=document.createElement("div"); list.className="choice-list";
      (q.choices||[]).forEach((c,i)=>{
        const row=document.createElement("label"); row.className="choice";
        const input=document.createElement("input");
        input.type=q.type==="RADIO"?"radio":"checkbox"; input.name=name; input.value=c;
        input.dataset.title=q.title;
        if(q.required) input.dataset.required="true";
        row.append(input,document.createTextNode(c)); list.appendChild(row);
      });
      return fieldBase(q,list);
    }
    if(q.type==="LIST"){
      const select=document.createElement("select"); select.name=name; select.dataset.title=q.title; select.required=!!q.required;
      select.innerHTML='<option value="">Selecione...</option>';
      (q.choices||[]).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;select.appendChild(o)});
      return fieldBase(q,select);
    }
    const input=document.createElement(q.type==="PARAGRAPH"?"textarea":"input");
    input.name=name; input.dataset.title=q.title; input.required=!!q.required;
    if(q.type==="DATE") input.type="date";
    else if(q.type==="TIME") input.type="time";
    else input.type="text";
    return fieldBase(q,input);
  }

  function render(data){
    questions.innerHTML="";
    (data.questions||[]).forEach(q=>questions.appendChild(buildQuestion(q)));
    if(!data.questions?.length) fail("O Google Forms não retornou perguntas. Verifique o ID do formulário e as permissões.");
    else setStatus("ok","Formulário carregado",`${data.questions.length} campo(s) disponível(is).`);
  }

  function loadQuestions(){
    const url=cfg.APPS_SCRIPT_URL;
    if(!url || url.includes("COLE_AQUI")) { fail("Configure primeiro a URL do Apps Script no arquivo config.js."); return; }
    const cb="kerigma_cb_"+Date.now();
    window[cb]=(data)=>{ try{delete window[cb]}catch(e){}; render(data); script.remove(); };
    const script=document.createElement("script");
    script.src=url+"?action=form&callback="+encodeURIComponent(cb);
    script.onerror=()=>{fail("Não foi possível carregar o formulário. Confira a implantação do Apps Script como Aplicativo da Web e o acesso como 'Qualquer pessoa'.");script.remove();};
    document.body.appendChild(script);
  }

  function collect(){
    const data={};
    form.querySelectorAll("input[data-title],select[data-title],textarea[data-title]").forEach(el=>{
      const title=el.dataset.title;
      if(el.type==="checkbox"){
        if(!data[title]) data[title]=[];
        if(el.checked) data[title].push(el.value);
      }else if(el.type==="radio"){
        if(el.checked) data[title]=el.value;
        else if(data[title]===undefined) data[title]="";
      }else data[title]=el.value;
    });
    Object.keys(data).forEach(k=>{if(Array.isArray(data[k])) data[k]=data[k].join(", ")});
    return data;
  }

  async function submit(e){
    e.preventDefault(); clearError();
    if(!form.checkValidity()){form.reportValidity();return}
    const payload={submissionId:"KRG-"+Date.now()+"-"+Math.random().toString(36).slice(2,8).toUpperCase(), submittedAt:new Date().toISOString(), answers:collect()};
    submitBtn.disabled=true; submitBtn.querySelector("span").textContent="Enviando...";
    setStatus("","Enviando","Registrando os dados na planilha...");
    try{
      await fetch(cfg.APPS_SCRIPT_URL,{
        method:"POST",redirect:"follow",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(payload)
      });
      await new Promise(r=>setTimeout(r,900));
      const ok=await checkStatus(payload.submissionId);
      if(!ok) throw new Error("O servidor não confirmou o registro. Verifique o Apps Script e a planilha.");
      form.classList.add("hidden"); successBox.classList.remove("hidden");
      setStatus("ok","Enviado","Dados registrados com sucesso.");
    }catch(err){
      console.error(err); fail(err.message||"Falha no envio.");
    }finally{
      submitBtn.disabled=false; submitBtn.querySelector("span").textContent="Enviar formulário";
    }
  }

  function checkStatus(id){
    return new Promise(resolve=>{
      const cb="kerigma_status_"+Date.now();
      let done=false;
      const script=document.createElement("script");
      const timer=setTimeout(()=>{if(!done){done=true;script.remove();try{delete window[cb]}catch(e){};resolve(false)}},8000);
      window[cb]=(data)=>{if(done)return;done=true;clearTimeout(timer);script.remove();try{delete window[cb]}catch(e){};resolve(!!data.success)};
      script.src=cfg.APPS_SCRIPT_URL+"?action=status&id="+encodeURIComponent(id)+"&callback="+encodeURIComponent(cb);
      script.onerror=()=>{if(!done){done=true;clearTimeout(timer);script.remove();try{delete window[cb]}catch(e){};resolve(false)}};
      document.body.appendChild(script);
    });
  }

  form.addEventListener("submit",submit);
  $("newFormBtn").addEventListener("click",()=>{successBox.classList.add("hidden");form.classList.remove("hidden");form.reset();window.scrollTo({top:0,behavior:"smooth"});});
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
  loadQuestions();
})();
