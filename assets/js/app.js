/* MVOF - APP ROUTER */
function toggleSidebar(){
  const sidebar = $("sidebar");
  const layout = document.querySelector(".layout");
  sidebar.classList.toggle("show");
  if (layout) layout.classList.toggle("sidebar-open", sidebar.classList.contains("show"));
}
function irA(mod){
  if (USUARIO_ACTUAL && !moduloPermitido(mod)){
    toast("No tienes permiso para este modulo","err");
    const primer=primerModuloPermitido();
    if (primer===mod) return;
    location.hash=primer; return;
  }
  location.hash=mod;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.mod===mod));
  document.querySelectorAll(".module").forEach(m=>m.classList.toggle("active", m.id==="mod-"+mod));
  $("sidebar").classList.remove("show");
  const layoutEl = document.querySelector(".layout");
  if (layoutEl) layoutEl.classList.remove("sidebar-open");
  if (mod==="dashboard") renderDashboard();
  if (mod==="compras")   renderCompras();
  if (mod==="usuarios")  renderModuloUsuarios();
  if (mod==="auditoria") renderModuloAuditoria();
  if (mod==="inventario") renderModuloInventario();
}
window.addEventListener("hashchange",()=>{ const m=location.hash.replace("#","")||"minutas"; irA(m); });
async function cargarTodo(){
  cargarConfig();
  if (!USUARIO_ACTUAL){ return; }
  if (!SUPA.url||!SUPA.key){ setBadge(false); toast("Configura Supabase primero","err"); irA("config"); return; }
  if ($("loader-min")) $("loader-min").classList.add("show");
  try{
    const [cats,platos,ingrs,casinos,ader,minutasSaved] = await Promise.all([
      supaFetch("/categorias?select=*&order=orden.asc"),
      supaFetch("/platos?select=*&activo=eq.true&order=nombre.asc"),
      supaFetch("/ingredientes?select=*&activo=eq.true&order=nombre.asc"),
      supaFetch("/casinos?select=*&activo=eq.true&order=nombre.asc"),
      supaFetch("/aderezos?select=*&activo=eq.true&order=nombre.asc"),
      supaFetch("/minutas?select=minuta_id,nombre,mes,semana_inicio,casino_id&order=creado_en.desc&limit=50"),
    ]);
    CATEGORIAS=cats; PLATOS=platos; INGREDIENTES=ingrs;
    CASINOS=casinos; ADEREZOS=ader; MINUTAS_SAVED=minutasSaved;
    setBadge(true);
    renderCasinos(); renderTablaMinuta(); renderAderezos();
    renderFiltroCat(); renderPlatos(); renderIngredientes();
    renderMinutaSelectCompras();
    aplicarPermisos();
    toast("OK " + platos.length + " platos · " + ingrs.length + " ingredientes");
  }catch(e){
    console.error(e); setBadge(false); toast("Error: "+e.message,"err");
  }finally{
    if ($("loader-min")) $("loader-min").classList.remove("show");
  }
}
window.addEventListener("DOMContentLoaded",()=>{
  cargarConfig(); cargarUsuarioSesion();
  if (!USUARIO_ACTUAL){ mostrarLogin(); return; }
  const initMod=location.hash.replace("#","")||"minutas";
  mostrarApp(); irA(initMod); cargarTodo();
});
