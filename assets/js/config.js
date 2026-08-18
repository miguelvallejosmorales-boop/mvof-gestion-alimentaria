/* MVOF · CONFIG GLOBAL */
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const SUPA_DEFAULTS = {
  url:    "https://mvabxucjnclpgvisbnii.supabase.co",
  key:    "sb_publishable_tRndmgIVjRA-Fp0hPOKsHA_KtIRfIiF",
  schema: "minutas"
};
let SUPA = { url:"", key:"", schema:"minutas" };
let CONECTADO = false;
let USUARIO_ACTUAL = null;
let PERMISOS_ACTUAL = [];
let CATEGORIAS=[], PLATOS=[], INGREDIENTES=[];
let CASINOS=[], ADEREZOS=[], MINUTAS_SAVED=[];
function $(id){ return document.getElementById(id); }
function toast(msg, tipo="ok"){
  const t = $("toast"); if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + tipo;
  setTimeout(()=>t.classList.remove("show"), 3500);
}
function setBadge(ok){
  const b = $("badge"); if (!b) return;
  if (ok){ b.innerHTML = "● Conectado"; b.className = "status-badge ok"; CONECTADO = true; }
  else   { b.innerHTML = "● Sin conexión"; b.className = "status-badge bad"; CONECTADO = false; }
}
function cargarConfig(){
  let url    = localStorage.getItem("supa_url");
  let key    = localStorage.getItem("supa_key");
  let schema = localStorage.getItem("supa_schema");
  if (!url || !key){
    url    = SUPA_DEFAULTS.url;
    key    = SUPA_DEFAULTS.key;
    schema = SUPA_DEFAULTS.schema;
    localStorage.setItem("supa_url", url);
    localStorage.setItem("supa_key", key);
    localStorage.setItem("supa_schema", schema);
  }
  if (key && key.length < SUPA_DEFAULTS.key.length && SUPA_DEFAULTS.key.startsWith(key)){
    key = SUPA_DEFAULTS.key;
    localStorage.setItem("supa_key", key);
  }
  SUPA.url    = url;
  SUPA.key    = key;
  SUPA.schema = schema || "minutas";
  if ($("cfg-url"))    $("cfg-url").value    = SUPA.url;
  if ($("cfg-key"))    $("cfg-key").value    = SUPA.key;
  if ($("cfg-schema")) $("cfg-schema").value = SUPA.schema;
}
async function guardarConfig(){
  const url = $("cfg-url").value.trim().replace(/\/$/,"");
  const key = $("cfg-key").value.trim();
  const schema = $("cfg-schema").value.trim() || "minutas";
  if (!url || !key){ toast("Completa URL y key","err"); return; }
  SUPA = { url, key, schema };
  localStorage.setItem("supa_url", url);
  localStorage.setItem("supa_key", key);
  localStorage.setItem("supa_schema", schema);
  toast("Reconectando...");
  await cargarTodo();
}
function resetConfig(){
  if (!confirm("¿Restaurar la configuración por defecto?")) return;
  localStorage.removeItem("supa_url");
  localStorage.removeItem("supa_key");
  localStorage.removeItem("supa_schema");
  cargarConfig();
  toast("Configuración restaurada");
}
async function probarConexion(){
  const url = $("cfg-url").value.trim().replace(/\/$/,"");
  const key = $("cfg-key").value.trim();
  const schema = $("cfg-schema").value.trim() || "minutas";
  if (!url || !key){ toast("Completa URL y key","err"); return; }
  try{
    const resp = await fetch(url+"/rest/v1/categorias?select=categoria_id&limit=1",{
      headers:{ "apikey":key, "Authorization":"Bearer "+key, "Accept-Profile":schema }
    });
    if (!resp.ok){ const txt = await resp.text(); throw new Error(`HTTP ${resp.status}: ${txt}`); }
    const data = await resp.json();
    toast(`✅ Conexión OK (${data.length} resultado)`);
  }catch(e){ toast("❌ "+e.message,"err"); }
}
async function supaFetch(path, opts={}){
  if (!SUPA.url || !SUPA.key) throw new Error("Supabase no configurado");
  const isWrite = opts.method && opts.method!=="GET";
  const headers = {
    "apikey": SUPA.key,
    "Authorization": "Bearer "+SUPA.key,
    "Content-Type":"application/json",
    "Accept":"application/json",
  };
  if (isWrite) headers["Content-Profile"] = SUPA.schema;
  else         headers["Accept-Profile"]  = SUPA.schema;
  if (isWrite) headers["Prefer"] = "return=representation";
  const resp = await fetch(SUPA.url+"/rest/v1"+path, { ...opts, headers });
  if (!resp.ok){ const txt = await resp.text(); throw new Error(`HTTP ${resp.status}: ${txt}`); }
  if (resp.status===204) return null;
  return resp.json();
}
