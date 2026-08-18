/* MVOF · AUTH */
function cargarUsuarioSesion(){
  const raw=localStorage.getItem("mvof_user"); if (!raw) return;
  try{
    USUARIO_ACTUAL=JSON.parse(raw);
    PERMISOS_ACTUAL=Array.isArray(USUARIO_ACTUAL.permisos)?USUARIO_ACTUAL.permisos:[];
  }catch(e){
    localStorage.removeItem("mvof_user"); USUARIO_ACTUAL=null; PERMISOS_ACTUAL=[];
  }
}
async function doLogin(){
  const u=$("login-user").value.trim();
  const p=$("login-pass").value;
  const err=$("login-error"); err.classList.remove("show");
  if (!u||!p){ err.textContent="Completa usuario y contraseña"; err.classList.add("show"); return; }
  $("login-btn").disabled=true;
  $("login-btn").textContent="Conectando...";
  try{
    const url = SUPA.url+"/rest/v1/rpc/mvof_login";
    const resp = await fetch(url, {
      method:"POST",
      headers:{ "apikey": SUPA.key, "Authorization": "Bearer "+SUPA.key, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({p_username:u, p_password:p})
    });
    if (!resp.ok){
      const txt = await resp.text();
      if (txt.includes("Credenciales") || txt.includes("encontrado") || txt.includes("invalidas")){
        throw new Error("Usuario o contraseña incorrectos");
      }
      throw new Error("HTTP " + resp.status + ": " + txt.substring(0,200));
    }
    const data = await resp.json();
    if (!data){ throw new Error("Respuesta vacía del servidor"); }
    USUARIO_ACTUAL = data;
    if (typeof logAccion === "function") logAccion("LOGIN", "SESION", data.usuario_id, "Inicio de sesion");
    PERMISOS_ACTUAL = Array.isArray(data.permisos) ? data.permisos : [];
    localStorage.setItem("mvof_user", JSON.stringify(data));
    $("login-user").value=""; $("login-pass").value="";
    mostrarApp();
    toast("Bienvenido " + data.nombre_completo);
    await cargarTodo();
  }catch(e){
    let msg = e.message || "Error desconocido";
    if (msg.includes("Failed to fetch") || msg.includes("Load failed") || msg.includes("NetworkError")){
      msg = "No se pudo conectar al servidor. Verifica tu conexión e intenta en modo privado.";
    }
    err.textContent = "❌ " + msg; err.classList.add("show");
  }finally{
    $("login-btn").disabled=false; $("login-btn").textContent="Iniciar sesión";
  }
}
function doLogout(){
  if (USUARIO_ACTUAL && typeof logAccion === "function") logAccion("LOGOUT", "SESION", USUARIO_ACTUAL.usuario_id, "Cierre de sesion");
  localStorage.removeItem("mvof_user");
  USUARIO_ACTUAL=null; PERMISOS_ACTUAL=[];
  const um=$("user-menu"); if (um) um.classList.remove("show");
  mostrarLogin(); toast("Sesión cerrada");
}
function mostrarLogin(){
  $("auth-overlay").classList.remove("hidden");
  document.querySelector(".layout").classList.add("hidden");
  document.querySelector("footer").classList.add("hidden");
  setTimeout(()=>{ const i=$("login-user"); if (i) i.focus(); },100);
}
function mostrarApp(){
  $("auth-overlay").classList.add("hidden");
  document.querySelector(".layout").classList.remove("hidden");
  document.querySelector("footer").classList.remove("hidden");
  renderUserChip(); aplicarPermisos();
}
function renderUserChip(){
  const c=$("user-chip-container"); if (!c||!USUARIO_ACTUAL) return;
  const u=USUARIO_ACTUAL;
  const inicial=(u.nombre_completo||u.username||"U").charAt(0);
  c.innerHTML=`<div class="user-chip" onclick="toggleUserMenu(event)">
    <div class="user-avatar">${inicial}</div>
    <div class="user-info"><b>${u.nombre_completo||u.username}</b><small>${u.perfil_nombre||""}</small></div>
    <span class="arrow">▼</span>
    <div class="user-menu" id="user-menu">
      <div class="user-menu-header"><b>${u.nombre_completo||""}</b><small>${u.email||u.username}</small></div>
      <button class="user-menu-item" onclick="abrirModalCuenta()"><span>👤</span> Mi cuenta</button>
      <div class="user-menu-divider"></div>
      <button class="user-menu-item danger" onclick="doLogout()"><span>🚪</span> Cerrar sesión</button>
    </div>
  </div>`;
}
function toggleUserMenu(e){ if (e) e.stopPropagation(); const m=$("user-menu"); if (m) m.classList.toggle("show"); }
document.addEventListener("click",e=>{
  const m=$("user-menu");
  if (m&&m.classList.contains("show")){ if (!e.target.closest(".user-chip")) m.classList.remove("show"); }
});
function abrirModalCuenta(){
  const u=USUARIO_ACTUAL; if (!u) return;
  $("user-menu")?.classList.remove("show");
  $("mc-username").textContent=u.username;
  $("mc-nombre").textContent=u.nombre_completo;
  $("mc-email").textContent=u.email||"—";
  $("mc-perfil").textContent=u.perfil_nombre;
  $("mc-casino").textContent=u.casino_nombre||"—";
  $("mc-actual").value=""; $("mc-nuevo").value=""; $("mc-confirmar").value="";
  $("modalCuenta").classList.add("show");
}
function cerrarModalCuenta(){ $("modalCuenta").classList.remove("show"); }
async function guardarPassword(){
  const actual=$("mc-actual").value, nuevo=$("mc-nuevo").value, conf=$("mc-confirmar").value;
  if (!actual||!nuevo||!conf){ toast("Completa todos los campos","err"); return; }
  if (nuevo.length<6){ toast("Mín 6 caracteres","err"); return; }
  if (nuevo!==conf){ toast("Las contraseñas no coinciden","err"); return; }
  try{
    const resp=await fetch(SUPA.url+"/rest/v1/rpc/mvof_cambiar_password",{
      method:"POST",
      headers:{"apikey":SUPA.key,"Authorization":"Bearer "+SUPA.key,"Content-Type":"application/json"},
      body: JSON.stringify({p_usuario_id:USUARIO_ACTUAL.usuario_id,p_password_actual:actual,p_password_nuevo:nuevo})
    });
    if (!resp.ok){ const txt=await resp.text(); throw new Error(txt.includes("incorrecto")?"Password actual incorrecto":"Error al actualizar"); }
    toast("✅ Contraseña actualizada"); cerrarModalCuenta();
  }catch(e){ toast(e.message,"err"); }
}
document.addEventListener("keydown",e=>{
  if (e.key==="Enter"&&(e.target.id==="login-user"||e.target.id==="login-pass")) doLogin();
});
