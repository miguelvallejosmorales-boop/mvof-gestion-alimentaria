/* MVOF · MÓDULO AUDITORÍA */
let AUDIT_LOG = [];
let AUDIT_FILTROS = { p_limit: 200, p_offset: 0 };
async function rpcCallAudit(funcName, body){
  const resp = await fetch(SUPA.url+"/rest/v1/rpc/"+funcName, {
    method:"POST",
    headers:{ "apikey": SUPA.key, "Authorization": "Bearer "+SUPA.key, "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify(body||{})
  });
  if (!resp.ok){ const txt = await resp.text(); throw new Error(txt || `HTTP ${resp.status}`); }
  if (resp.status===204) return null;
  return resp.json();
}
async function logAccion(accion, entidad, entidad_id, descripcion, datos){
  if (!USUARIO_ACTUAL) return;
  try{
    await rpcCallAudit("mvof_log", {
      p_usuario_id: USUARIO_ACTUAL.usuario_id, p_username: USUARIO_ACTUAL.username,
      p_casino_id: USUARIO_ACTUAL.casino_id || null, p_accion: accion, p_entidad: entidad,
      p_entidad_id: entidad_id || null, p_descripcion: descripcion || null, p_datos: datos || null,
      p_user_agent: navigator.userAgent.substring(0, 300)
    });
  }catch(e){ console.warn("[Audit] No se pudo registrar:", e.message); }
}
async function cargarAuditoria(){
  try{ AUDIT_LOG = await rpcCallAudit("mvof_listar_auditoria", AUDIT_FILTROS) || []; }
  catch(e){ toast("Error cargando auditoría: "+e.message, "err"); AUDIT_LOG = []; }
}
async function renderModuloAuditoria(){
  if (!tienePermiso("auditoria.ver")){ toast("Sin permiso", "err"); irA("minutas"); return; }
  await cargarAuditoria();
  renderTablaAuditoria();
}
function fmtFechaCompleta(d){
  if (!d) return "—";
  const dt = new Date(d); if (isNaN(dt.getTime())) return "—";
  const pad = n => String(n).padStart(2,"0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}
function badgeAccion(accion){
  const cls = (accion || "").toUpperCase();
  return `<span class="badge-accion ${cls}">${accion}</span>`;
}
function renderTablaAuditoria(){
  const q = ($("buscarAuditoria")?.value || "").toLowerCase();
  let lista = AUDIT_LOG.slice();
  if (q) lista = lista.filter(a => (a.username||"").toLowerCase().includes(q) || (a.descripcion||"").toLowerCase().includes(q) || (a.entidad||"").toLowerCase().includes(q) || (a.accion||"").toLowerCase().includes(q));
  const tb = $("tbl-auditoria");
  if (!lista.length){ tb.innerHTML = '<tr><td colspan="6" class="empty">Sin registros</td></tr>'; }
  else {
    tb.innerHTML = lista.map(a => {
      const inicial = (a.nombre_completo || a.username || "S").charAt(0);
      return `<tr>
        <td class="nutri">${fmtFechaCompleta(a.fecha)}</td>
        <td><div class="user-cell"><div class="user-avatar-table">${inicial}</div><div class="user-cell-info"><b>${a.nombre_completo || a.username || "Sistema"}</b><small>@${a.username || "—"}</small></div></div></td>
        <td class="nutri">${a.casino_nombre || "—"}</td>
        <td>${badgeAccion(a.accion)}</td>
        <td class="nutri">${a.entidad}</td>
        <td>${a.descripcion || "—"}</td>
      </tr>`;
    }).join("");
  }
  $("stats-auditoria").textContent = `📋 ${lista.length} registros`;
}
function aplicarFiltrosAuditoria(){
  const desde = $("audit-desde").value;
  const hasta = $("audit-hasta").value;
  const accion = $("audit-accion").value.trim();
  AUDIT_FILTROS = { p_limit: 200, p_offset: 0, p_usuario_id: null, p_casino_id: null, p_accion: accion || null, p_entidad: null,
    p_desde: desde ? desde + " 00:00:00" : null, p_hasta: hasta ? hasta + " 23:59:59" : null };
  cargarAuditoria().then(renderTablaAuditoria);
}
function limpiarFiltrosAuditoria(){
  $("audit-desde").value = ""; $("audit-hasta").value = ""; $("audit-accion").value = ""; $("buscarAuditoria").value = "";
  AUDIT_FILTROS = { p_limit: 200, p_offset: 0 };
  cargarAuditoria().then(renderTablaAuditoria);
}
function exportarCSVAuditoria(){
  if (!AUDIT_LOG.length){ toast("No hay datos para exportar","err"); return; }
  const headers = ["Fecha","Usuario","Username","Casino","Acción","Entidad","ID Entidad","Descripción"];
  const rows = AUDIT_LOG.map(a => [ fmtFechaCompleta(a.fecha), a.nombre_completo || "", a.username || "", a.casino_nombre || "", a.accion || "", a.entidad || "", a.entidad_id || "", (a.descripcion || "").replace(/"/g,'""') ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `auditoria_mvof_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("✅ CSV exportado");
}
document.addEventListener("input", e => { if (e.target.id === "buscarAuditoria") renderTablaAuditoria(); });
