/* MVOF Modulo Inventario */
let INV_STOCK = [];
let INV_MOVIMIENTOS = [];
let INV_BODEGAS = [];
let INV_BODEGA_ACTUAL = null;
let INV_TAB_ACTUAL = "stock";
let EGRESO_ING_ID = null;
let EGRESO_BODEGA_ID = null;
async function rpcInv(fn, body){
  const resp = await fetch(SUPA.url+"/rest/v1/rpc/"+fn, {
    method:"POST",
    headers:{ "apikey": SUPA.key, "Authorization": "Bearer "+SUPA.key, "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify(body||{})
  });
  if (!resp.ok){ const t=await resp.text(); throw new Error(t||("HTTP "+resp.status)); }
  if (resp.status===204) return null;
  return resp.json();
}
async function cargarBodegas(){
  try{
    const resp = await fetch(SUPA.url+"/rest/v1/bodegas?select=*&activo=eq.true&order=nombre.asc",{
      headers:{"apikey":SUPA.key,"Authorization":"Bearer "+SUPA.key,"Accept-Profile":SUPA.schema}
    });
    INV_BODEGAS = await resp.json() || [];
    if (INV_BODEGAS.length && !INV_BODEGA_ACTUAL) INV_BODEGA_ACTUAL = INV_BODEGAS[0].bodega_id;
  }catch(e){ toast("Error cargando bodegas: "+e.message,"err"); }
}
async function renderModuloInventario(){
  if (!tienePermiso("inventario.ver")){ toast("Sin permiso","err"); irA("minutas"); return; }
  await cargarBodegas();
  renderSelectorBodegas();
  renderTabInventario(INV_TAB_ACTUAL);
}
function renderSelectorBodegas(){
  const sel = $("inv-bodega-sel"); if (!sel) return;
  sel.innerHTML = '<option value="">Todas las bodegas</option>' +
    INV_BODEGAS.map(function(b){ return '<option value="'+b.bodega_id+'" '+(b.bodega_id===INV_BODEGA_ACTUAL?"selected":"")+'>'+b.nombre+'</option>'; }).join("");
}
function cambiarBodegaInv(){
  const v = $("inv-bodega-sel").value;
  INV_BODEGA_ACTUAL = v ? +v : null;
  renderTabInventario(INV_TAB_ACTUAL);
}
async function renderTabInventario(tab){
  INV_TAB_ACTUAL = tab;
  document.querySelectorAll("#mod-inventario .tab").forEach(function(t){ t.classList.toggle("active", t.dataset.subinv===tab); });
  ["dashboard","stock","movimientos"].forEach(function(t){ const el = $("inv-tab-"+t); if (el) el.classList.toggle("hidden", t!==tab); });
  if (tab==="dashboard") await renderDashboardInv();
  if (tab==="stock")     await renderStockInv();
  if (tab==="movimientos") await renderMovimientosInv();
}
async function renderDashboardInv(){
  try{
    const d = await rpcInv("mvof_dashboard_inventario", {p_casino_id:null});
    const card=(l,v,s)=>'<div class="card card-pad metric"><div class="label">'+l+'</div><div class="value">'+(v||0)+'</div><div class="sub">'+s+'</div></div>';
    $("inv-cards").innerHTML =
      card("Productos",d.total_productos,"En stock") + card("Bodegas",d.total_bodegas,"Activas") +
      card("Stock bajo",d.productos_bajo,"Reposicion") + card("Agotados",d.productos_agotados,"Sin stock") +
      card("Por vencer",d.productos_por_vencer,"Proximos 7 dias") + card("Vencidos",d.productos_vencidos,"Revisar") +
      card("Movimientos hoy",d.movimientos_hoy,"24h");
  }catch(e){ toast("Error dashboard: "+e.message,"err"); }
}
async function renderStockInv(){
  try{
    INV_STOCK = await rpcInv("mvof_listar_stock", {p_bodega_id: INV_BODEGA_ACTUAL, p_casino_id: null}) || [];
    const inp = $("inv-buscar");
    const q = (inp && inp.value ? inp.value : "").toLowerCase();
    let lista = INV_STOCK.slice();
    if (q) lista = lista.filter(function(s){ return (s.ingrediente_nombre||"").toLowerCase().indexOf(q) >= 0; });
    const tb = $("tbl-inv-stock");
    if (!lista.length){ tb.innerHTML = '<tr><td colspan="8" class="empty">Sin productos en stock</td></tr>'; }
    else {
      const puedeEgresar = tienePermiso("inventario.egresar");
      tb.innerHTML = lista.map(function(s){
        const badge = badgeEstadoStock(s.estado, s.dias_a_vencer);
        const acciones = puedeEgresar
          ? '<button class="btn btn-soft btn-mini" onclick="abrirModalEgreso('+s.ingrediente_id+','+s.bodega_id+')">− Egresar</button>'
          : '<span class="nutri">—</span>';
        return '<tr>'+
          '<td><b>'+s.ingrediente_nombre+'</b>'+(s.marca?'<br><small class="nutri">'+s.marca+'</small>':"")+'</td>'+
          '<td class="nutri">'+s.bodega_nombre+'</td>'+
          '<td class="nutri" style="font-weight:600;color:var(--ink)">'+(+s.cantidad_actual).toFixed(2)+' '+s.unidad+'</td>'+
          '<td class="nutri">'+(s.stock_minimo||"—")+'</td>'+
          '<td class="nutri">'+(s.ubicacion_fisica||"—")+'</td>'+
          '<td class="nutri">'+(s.fecha_vencimiento||"—")+'</td>'+
          '<td>'+badge+'</td>'+
          '<td>'+acciones+'</td>'+
        '</tr>';
      }).join("");
    }
    $("inv-stock-stats").textContent = lista.length+" productos";
  }catch(e){ toast("Error stock: "+e.message,"err"); }
}
function badgeEstadoStock(estado, dias){
  const map = {
    OK: {t:"OK", c:"activo"}, BAJO: {t:"BAJO", c:"warning"}, AGOTADO: {t:"AGOTADO", c:"inactivo"},
    POR_VENCER: {t:"Vence en "+dias+"d", c:"warning"}, VENCIDO: {t:"VENCIDO", c:"inactivo"}
  };
  const b = map[estado] || {t:estado, c:"activo"};
  return '<span class="badge-estado '+b.c+'">'+b.t+'</span>';
}
async function renderMovimientosInv(){
  try{
    INV_MOVIMIENTOS = await rpcInv("mvof_listar_movimientos", {
      p_limit:200, p_offset:0, p_bodega_id: INV_BODEGA_ACTUAL, p_ingrediente_id: null, p_tipo: null, p_desde: null, p_hasta: null
    }) || [];
    const tb = $("tbl-inv-mov");
    if (!INV_MOVIMIENTOS.length){ tb.innerHTML = '<tr><td colspan="8" class="empty">Sin movimientos</td></tr>'; }
    else {
      tb.innerHTML = INV_MOVIMIENTOS.map(function(m){
        const badgeT = m.tipo==="INGRESO" ? '<span class="badge-estado activo">+ INGRESO</span>' : '<span class="badge-estado inactivo">− EGRESO</span>';
        return '<tr>'+
          '<td class="nutri">'+m.fecha+'</td>'+
          '<td>'+badgeT+'</td>'+
          '<td><b>'+(m.ingrediente_nombre||"—")+'</b></td>'+
          '<td class="nutri">'+(m.bodega_nombre||"—")+'</td>'+
          '<td class="nutri" style="font-weight:600">'+(+m.cantidad).toFixed(2)+' '+(m.unidad||"")+'</td>'+
          '<td class="nutri">'+(m.motivo||"—")+'</td>'+
          '<td class="nutri">'+(m.nombre_completo||m.username||"—")+'</td>'+
          '<td class="nutri">'+(m.documento||m.proveedor||m.notas||"—")+'</td>'+
        '</tr>';
      }).join("");
    }
    $("inv-mov-stats").textContent = INV_MOVIMIENTOS.length+" movimientos";
  }catch(e){ toast("Error movimientos: "+e.message,"err"); }
}
function abrirModalIngreso(){
  if (!tienePermiso("inventario.ingresar")){ toast("Sin permiso","err"); return; }
  ["ing-ingrediente-id","ing-nombre","ing-marca","ing-cantidad","ing-vencimiento","ing-proveedor","ing-documento","ing-notas"].forEach(id=>{ const el=$(id); if(el) el.value=""; });
  $("ing-unidad").value = "gr";
  const sel = $("ing-bodega");
  sel.innerHTML = INV_BODEGAS.map(function(b){ return '<option value="'+b.bodega_id+'" '+(b.bodega_id===INV_BODEGA_ACTUAL?"selected":"")+'>'+b.nombre+'</option>'; }).join("");
  $("modalIngreso").classList.add("show");
}
function cerrarModalIngreso(){ $("modalIngreso").classList.remove("show"); }
async function escanearIngreso(){
  if (typeof abrirScanner === "function"){ abrirScanner(async function(codigo){ await procesarCodigoIngreso(codigo); }); }
  else { await escanearManualIngreso(); }
}
async function escanearManualIngreso(){
  const codigo = prompt("Codigo de barras (8-13 digitos):");
  if (!codigo) return;
  await procesarCodigoIngreso(codigo.trim());
}
async function procesarCodigoIngreso(codigo){
  if (typeof buscarProductoPorCodigoBarra !== "function"){ toast("barcode.js no cargado","err"); return; }
  const producto = await buscarProductoPorCodigoBarra(codigo);
  if (!producto) return;
  let ing = INGREDIENTES.find(function(i){ return i.codigo_barra === codigo; });
  if (!ing){
    try{
      const created = await supaFetch("/ingredientes",{
        method:"POST",
        body: JSON.stringify({ nombre: producto.nombre, marca: producto.marca, codigo_barra: codigo, imagen_url: producto.imagen_url,
          unidad: producto.unidad, kcal_100: producto.kcal_100, prot_100: producto.prot_100, carb_100: producto.carb_100, grasa_100: producto.grasa_100, fuente:"MANUAL" })
      });
      ing = created[0]; INGREDIENTES.push(ing);
      toast("Producto nuevo agregado al catalogo");
    }catch(e){ toast("Error: "+e.message,"err"); return; }
  }
  $("ing-ingrediente-id").value = ing.ingrediente_id;
  $("ing-nombre").value = ing.nombre;
  $("ing-marca").value = ing.marca || producto.marca || "";
  $("ing-unidad").value = ing.unidad || "gr";
}
function buscarIngredienteManual(){
  const nombre = prompt("Nombre del ingrediente:"); if (!nombre) return;
  const ing = INGREDIENTES.find(function(i){ return i.nombre.toLowerCase().indexOf(nombre.toLowerCase()) >= 0; });
  if (!ing){ toast("No encontrado en el catalogo","err"); return; }
  $("ing-ingrediente-id").value = ing.ingrediente_id;
  $("ing-nombre").value = ing.nombre;
  $("ing-marca").value = ing.marca || "";
  $("ing-unidad").value = ing.unidad || "gr";
}
async function guardarIngreso(){
  const ing_id = +$("ing-ingrediente-id").value;
  const bodega_id = +$("ing-bodega").value;
  const cantidad = +$("ing-cantidad").value;
  if (!ing_id){ toast("Selecciona un producto","err"); return; }
  if (!bodega_id){ toast("Selecciona bodega","err"); return; }
  if (!cantidad || cantidad <= 0){ toast("Cantidad invalida","err"); return; }
  try{
    await rpcInv("mvof_ingresar_stock", {
      p_bodega_id: bodega_id, p_ingrediente_id: ing_id, p_cantidad: cantidad, p_unidad: $("ing-unidad").value,
      p_fecha_venc: $("ing-vencimiento").value || null, p_proveedor: $("ing-proveedor").value || null,
      p_documento: $("ing-documento").value || null, p_usuario_id: USUARIO_ACTUAL && USUARIO_ACTUAL.usuario_id,
      p_username: USUARIO_ACTUAL && USUARIO_ACTUAL.username, p_notas: $("ing-notas").value || null
    });
    toast("Ingreso registrado: "+cantidad+" "+$("ing-unidad").value);
    cerrarModalIngreso(); renderTabInventario(INV_TAB_ACTUAL);
  }catch(e){ toast("Error: "+e.message,"err"); }
}
function abrirModalEgreso(ing_id, bodega_id){
  if (!tienePermiso("inventario.egresar")){ toast("Sin permiso","err"); return; }
  EGRESO_ING_ID = ing_id; EGRESO_BODEGA_ID = bodega_id;
  const s = INV_STOCK.find(function(x){ return x.ingrediente_id===ing_id && x.bodega_id===bodega_id; });
  if (!s) return;
  $("eg-producto").textContent = s.ingrediente_nombre;
  $("eg-stock").textContent = "Disponible: "+(+s.cantidad_actual).toFixed(2)+" "+s.unidad;
  $("eg-cantidad").value = ""; $("eg-motivo").value = "CONSUMO"; $("eg-notas").value = "";
  $("modalEgreso").classList.add("show");
}
function cerrarModalEgreso(){ $("modalEgreso").classList.remove("show"); }
async function guardarEgreso(){
  const cantidad = +$("eg-cantidad").value;
  if (!cantidad || cantidad <= 0){ toast("Cantidad invalida","err"); return; }
  const motivo = $("eg-motivo").value;
  if (USUARIO_ACTUAL && USUARIO_ACTUAL.perfil_codigo === "COCINA" && motivo !== "CONSUMO"){ toast("Cocina solo puede registrar consumo","err"); return; }
  try{
    await rpcInv("mvof_egresar_stock", {
      p_bodega_id: EGRESO_BODEGA_ID, p_ingrediente_id: EGRESO_ING_ID, p_cantidad: cantidad, p_motivo: motivo,
      p_usuario_id: USUARIO_ACTUAL && USUARIO_ACTUAL.usuario_id, p_username: USUARIO_ACTUAL && USUARIO_ACTUAL.username, p_notas: $("eg-notas").value || null
    });
    toast("Egreso registrado"); cerrarModalEgreso(); renderTabInventario(INV_TAB_ACTUAL);
  }catch(e){ toast("Error: "+e.message,"err"); }
}
document.addEventListener("input", function(e){ if (e.target.id==="inv-buscar") renderStockInv(); });
