/* MVOF · COMPRAS */
let COMPRAS_PLATOS=[];
function renderMinutaSelectCompras(){
  if (!$("compraMinuta")) return;
  $("compraMinuta").innerHTML='<option value="">— elige minuta —</option>' +
    MINUTAS_SAVED.map(m=>`<option value="${m.minuta_id}">#${m.minuta_id} · ${m.nombre} · ${m.semana_inicio}</option>`).join("");
}
function renderCompras(){
  renderMinutaSelectCompras();
  COMPRAS_PLATOS=[];
  renderTablaRaciones();
  if ($("tbl-compras")) $("tbl-compras").innerHTML='<tr><td colspan="3" class="empty">Primero carga los platos y ajusta las raciones</td></tr>';
  if ($("statsCompra")) $("statsCompra").textContent="";
}
async function cargarPlatosCompras(){
  const id=+$("compraMinuta").value;
  if (!id){ toast("Selecciona una minuta","err"); return; }
  try{
    const det=await supaFetch(`/minuta_detalle?minuta_id=eq.${id}&select=dia_semana,categoria_id,plato_id,platos(plato_id,nombre,categoria_id)`);
    const map={};
    det.forEach(d=>{
      const p=d.platos; if (!p) return;
      const k=p.plato_id;
      if (!map[k]){
        const cat=CATEGORIAS.find(c=>c.categoria_id===p.categoria_id);
        map[k]={plato_id:p.plato_id, nombre:p.nombre, categoria:cat?cat.nombre:"—", dias:[], raciones:1};
      }
      map[k].dias.push(d.dia_semana);
    });
    COMPRAS_PLATOS=Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    renderTablaRaciones();
    toast(`✅ ${COMPRAS_PLATOS.length} platos cargados`);
  }catch(e){ toast("Error: "+e.message,"err"); }
}
function renderTablaRaciones(){
  const tb=$("tbl-raciones"); if (!tb) return;
  if (!COMPRAS_PLATOS.length){
    tb.innerHTML='<tr><td colspan="5" class="empty">Selecciona una minuta y haz clic en "Cargar platos"</td></tr>';
    if ($("statsRaciones")) $("statsRaciones").textContent="";
    if ($("box-raciones")) $("box-raciones").classList.remove("activa");
    return;
  }
  if ($("box-raciones")) $("box-raciones").classList.add("activa");
  tb.innerHTML=COMPRAS_PLATOS.map(p=>{
    const diasTxt=p.dias.slice().sort().map(d=>DIAS[d-1].slice(0,3)).join(", ");
    return `<tr>
      <td><b>${p.nombre}</b></td>
      <td><span class="tag-cat">${p.categoria}</span></td>
      <td class="nutri">${diasTxt}</td>
      <td><input class="input-raciones" type="number" min="1" value="${p.raciones}" onchange="cambiarRaciones(${p.plato_id}, this.value)"></td>
      <td><button class="btn btn-mini btn-danger" onclick="quitarPlatoCompras(${p.plato_id})">🗑️</button></td>
    </tr>`;
  }).join("");
  const totalRac=COMPRAS_PLATOS.reduce((a,b)=>a+(+b.raciones||0),0);
  if ($("statsRaciones")) $("statsRaciones").textContent = `🍽️ ${COMPRAS_PLATOS.length} platos · ${totalRac} raciones`;
}
function cambiarRaciones(plato_id, valor){
  const p=COMPRAS_PLATOS.find(x=>x.plato_id===plato_id);
  if (p){
    p.raciones=Math.max(1,+valor||1);
    const totalRac=COMPRAS_PLATOS.reduce((a,b)=>a+(+b.raciones||0),0);
    if ($("statsRaciones")) $("statsRaciones").textContent = `🍽️ ${COMPRAS_PLATOS.length} platos · ${totalRac} raciones`;
  }
}
function quitarPlatoCompras(plato_id){
  COMPRAS_PLATOS=COMPRAS_PLATOS.filter(p=>p.plato_id!==plato_id);
  renderTablaRaciones();
}
async function generarLista(){
  if (!tienePermiso("compras.generar")){ toast("Sin permiso","err"); return; }
  if (!COMPRAS_PLATOS.length){ toast("Carga primero los platos","err"); return; }
  try{
    const ids=COMPRAS_PLATOS.map(p=>p.plato_id).join(",");
    const datos=await supaFetch(`/platos?plato_id=in.(${ids})&select=plato_id,plato_ingrediente(cantidad,ingredientes(ingrediente_id,nombre,unidad))`);
    const racionesMap={};
    COMPRAS_PLATOS.forEach(p=>{ racionesMap[p.plato_id]=+p.raciones||1; });
    const map={};
    datos.forEach(plato=>{
      const r=racionesMap[plato.plato_id]||1;
      (plato.plato_ingrediente||[]).forEach(pi=>{
        const ing=pi.ingredientes, k=ing.ingrediente_id;
        if (!map[k]) map[k]={nombre:ing.nombre, unidad:ing.unidad, total:0};
        map[k].total += (+pi.cantidad)*r;
      });
    });
    const filas=Object.values(map).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    if (!filas.length){
      $("tbl-compras").innerHTML='<tr><td colspan="3" class="empty">Los platos aún no tienen ingredientes cargados.</td></tr>';
      $("statsCompra").textContent=""; return;
    }
    $("tbl-compras").innerHTML=filas.map(f=>`<tr><td><b>${f.nombre}</b></td><td class="nutri">${f.unidad}</td><td class="nutri" style="font-weight:600">${f.total.toFixed(2)}</td></tr>`).join("");
    const totalRac=COMPRAS_PLATOS.reduce((a,b)=>a+(+b.raciones||0),0);
    $("statsCompra").textContent = `🛒 ${filas.length} ingredientes · ${totalRac} raciones`;
    if (typeof logAccion==="function") logAccion("GENERAR_LISTA","COMPRAS",null,`${filas.length} ingredientes`);
    toast(`✅ Lista generada (${filas.length} ingredientes)`);
  }catch(e){ toast("Error: "+e.message,"err"); }
}
