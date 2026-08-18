/* MVOF · CONTROL DE PERMISOS */
const MAPA_MODULOS_PERMISO = {
  minutas:    "minutas.ver",
  recetas:    "recetas.ver",
  dashboard:  "dashboard.ver",
  compras:    "compras.ver",
  inventario: "inventario.ver",
  usuarios:   "usuarios.gestionar",
  auditoria:  "auditoria.ver",
  config:     "config.editar"
};
const ORDEN_MODULOS = ["minutas","recetas","dashboard","compras","inventario","usuarios","auditoria","config"];
function tienePermiso(codigo){
  return Array.isArray(PERMISOS_ACTUAL) && PERMISOS_ACTUAL.includes(codigo);
}
function moduloPermitido(mod){
  const p=MAPA_MODULOS_PERMISO[mod];
  if (!p) return true;
  return tienePermiso(p);
}
function primerModuloPermitido(){
  for (const m of ORDEN_MODULOS){ if (moduloPermitido(m)) return m; }
  return "minutas";
}
function aplicarPermisos(){
  document.querySelectorAll(".nav-item[data-mod]").forEach(el=>{
    el.classList.toggle("perm-hidden", !moduloPermitido(el.dataset.mod));
  });
  document.querySelectorAll("[data-perm]").forEach(el=>{
    el.classList.toggle("perm-hidden", !tienePermiso(el.dataset.perm));
  });
  const activo=(location.hash||"#minutas").replace("#","");
  if (!moduloPermitido(activo)){
    const primer=primerModuloPermitido();
    irA(primer);
  }
}
