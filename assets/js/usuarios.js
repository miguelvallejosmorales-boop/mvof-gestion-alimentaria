/* MVOF · MÓDULO USUARIOS (solo ADMIN) */
let PERFILES_DISPONIBLES = [];
let USUARIOS_LISTA = [];
let EDIT_USUARIO = null;
async function rpcCall(funcName, body){
  const resp = await fetch(SUPA.url+"/rest/v1/rpc/"+funcName, {
    method:"POST",
    headers:{ "apikey": SUPA.key, "Authorization": "Bearer "+SUPA.key, "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify(body||{})
  });
  if (!resp.ok){ const txt = await resp.text(); throw new Error(txt || `HTTP ${resp.status}`); }
  if (resp.status===204) return null;
  return resp.json();
}
async function cargarUsuariosYPerfiles(){
  try{
    const [usuarios, perfiles] = await Promise.all([ rpcCall("mvof_listar_usuarios"), rpcCall("mvof_listar_perfiles") ]);
    USUARIOS_LISTA = usuarios || [];
    PERFILES_DISPONIBLES = perfiles || [];
  }catch(e){ toast("Error cargando usuarios: "+e.message, "err"); }
}
async function renderModuloUsuarios(){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso", "err"); irA("minutas"); return; }
  await cargarUsuariosYPerfiles();
  renderTablaUsuarios();
}
function fmtFecha(d){
  if (!d) return "—";
  const dt = new Date(d); if (isNaN(dt.getTime())) return "—";
  const pad = n => String(n).padStart(2,"0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function renderTablaUsuarios(){
  const q = ($("buscarUsuario")?.value || "").toLowerCase();
  let lista = USUARIOS_LISTA.slice();
  if (q) lista = lista.filter(u => (u.username||"").toLowerCase().includes(q) || (u.nombre_completo||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q));
  const tb = $("tbl-usuarios");
  if (!lista.length){ tb.innerHTML = '<tr><td colspan="7" class="empty">Sin usuarios. Crea el primero.</td></tr>'; }
  else {
    tb.innerHTML = lista.map(u => {
      const inicial = (u.nombre_completo || u.username || "U").charAt(0);
      const estadoCls = u.activo ? "activo" : "inactivo";
      const estadoTxt = u.activo ? "● Activo" : "● Inactivo";
      const toggleIc = u.activo ? "⏸️" : "▶️";
      return `<tr>
        <td><div class="user-cell"><div class="user-avatar-table">${inicial}</div><div class="user-cell-info"><b>${u.nombre_completo || u.username}</b><small>@${u.username}</small></div></div></td>
        <td class="nutri">${u.email || "—"}</td>
        <td><span class="badge-perfil">${u.perfil_nombre || "—"}</span></td>
        <td class="nutri">${u.casino_nombre || "—"}</td>
        <td><span class="badge-estado ${estadoCls}">${estadoTxt}</span></td>
        <td class="nutri">${fmtFecha(u.ultimo_login)}</td>
        <td><div class="acciones">
          <button class="btn btn-mini btn-soft" onclick="abrirModalEditarUsuario(${u.usuario_id})">✏️</button>
          <button class="btn btn-mini btn-soft" onclick="resetPasswordUsuario(${u.usuario_id})">🔑</button>
          <button class="btn btn-mini btn-soft" onclick="toggleUsuario(${u.usuario_id})">${toggleIc}</button>
          <button class="btn btn-mini btn-danger" onclick="eliminarUsuario(${u.usuario_id})">🗑️</button>
        </div></td>
      </tr>`;
    }).join("");
  }
  const activos = USUARIOS_LISTA.filter(u=>u.activo).length;
  $("stats-usuarios").textContent = `👥 ${USUARIOS_LISTA.length} usuarios · ${activos} activos`;
}
function renderPerfilesSelectModal(){
  const sel = $("m-user-perfil");
  const actual = EDIT_USUARIO ? EDIT_USUARIO.perfil_id : null;
  sel.innerHTML = '<option value="">Selecciona perfil...</option>' +
    PERFILES_DISPONIBLES.map(p => `<option value="${p.perfil_id}" ${p.perfil_id===actual?'selected':''}>${p.nombre}</option>`).join("");
}
function renderCasinosSelectModal(){
  const sel = $("m-user-casino");
  const actual = EDIT_USUARIO ? EDIT_USUARIO.casino_id : null;
  sel.innerHTML = '<option value="">Todos los casinos</option>' +
    CASINOS.map(c => `<option value="${c.casino_id}" ${c.casino_id===actual?'selected':''}>${c.nombre}</option>`).join("");
}
function abrirModalNuevoUsuario(){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso","err"); return; }
  EDIT_USUARIO = null;
  $("modalUsuarioTitle").textContent = "Nuevo usuario";
  $("m-user-username").value = ""; $("m-user-username").disabled = false;
  $("m-user-nombre").value = ""; $("m-user-email").value = ""; $("m-user-password").value = "";
  $("m-user-pass-group").classList.remove("hidden");
  renderPerfilesSelectModal(); renderCasinosSelectModal();
  $("modalUsuario").classList.add("show");
}
function abrirModalEditarUsuario(id){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso","err"); return; }
  const u = USUARIOS_LISTA.find(x=>x.usuario_id===id); if (!u) return;
  EDIT_USUARIO = u;
  $("modalUsuarioTitle").textContent = "Editar usuario";
  $("m-user-username").value = u.username; $("m-user-username").disabled = true;
  $("m-user-nombre").value = u.nombre_completo || ""; $("m-user-email").value = u.email || "";
  $("m-user-pass-group").classList.add("hidden");
  renderPerfilesSelectModal(); renderCasinosSelectModal();
  $("modalUsuario").classList.add("show");
}
function cerrarModalUsuario(){ $("modalUsuario").classList.remove("show"); }
async function guardarUsuarioForm(){
  const username = $("m-user-username").value.trim().toLowerCase();
  const nombre = $("m-user-nombre").value.trim();
  const email = $("m-user-email").value.trim();
  const perfil_id = +$("m-user-perfil").value;
  const casino_id = $("m-user-casino").value ? +$("m-user-casino").value : null;
  const password = $("m-user-password").value;
  if (!nombre){ toast("Falta el nombre","err"); return; }
  if (!perfil_id){ toast("Selecciona perfil","err"); return; }
  try{
    if (EDIT_USUARIO){
      await rpcCall("mvof_actualizar_usuario", { p_usuario_id: EDIT_USUARIO.usuario_id, p_nombre: nombre, p_email: email || null, p_perfil_id: perfil_id, p_casino_id: casino_id });
      toast("✅ Usuario actualizado");
    } else {
      if (!username){ toast("Falta username","err"); return; }
      if (!password || password.length < 6){ toast("Password mín 6 caracteres","err"); return; }
      await rpcCall("mvof_crear_usuario", { p_username: username, p_password: password, p_nombre: nombre, p_email: email || null, p_perfil_id: perfil_id, p_casino_id: casino_id });
      toast("✅ Usuario creado");
    }
    cerrarModalUsuario(); await renderModuloUsuarios();
  }catch(e){ toast("Error: "+e.message, "err"); }
}
async function resetPasswordUsuario(id){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso","err"); return; }
  const u = USUARIOS_LISTA.find(x=>x.usuario_id===id); if (!u) return;
  const nueva = prompt(`Nuevo password para ${u.username} (mín 6 caracteres):`);
  if (!nueva) return;
  if (nueva.length < 6){ toast("Mín 6 caracteres","err"); return; }
  try{ await rpcCall("mvof_resetear_password", { p_usuario_id:id, p_password_nuevo:nueva }); toast(`✅ Password de ${u.username} actualizado`); }
  catch(e){ toast("Error: "+e.message,"err"); }
}
async function toggleUsuario(id){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso","err"); return; }
  const u = USUARIOS_LISTA.find(x=>x.usuario_id===id); if (!u) return;
  try{ const nuevo = await rpcCall("mvof_toggle_usuario", { p_usuario_id:id }); toast(`${u.username} ahora está ${nuevo ? "activo ✅" : "inactivo ⏸️"}`); await renderModuloUsuarios(); }
  catch(e){ toast("Error: "+e.message,"err"); }
}
async function eliminarUsuario(id){
  if (!tienePermiso("usuarios.gestionar")){ toast("Sin permiso","err"); return; }
  const u = USUARIOS_LISTA.find(x=>x.usuario_id===id); if (!u) return;
  if (USUARIO_ACTUAL && USUARIO_ACTUAL.usuario_id === id){ toast("No puedes eliminar tu propio usuario","err"); return; }
  if (!confirm(`¿Eliminar el usuario "${u.username}"?\n\nEsta acción NO se puede deshacer.`)) return;
  try{ await rpcCall("mvof_eliminar_usuario", { p_usuario_id:id }); toast(`🗑️ Usuario ${u.username} eliminado`); await renderModuloUsuarios(); }
  catch(e){ toast("Error: "+e.message,"err"); }
}
