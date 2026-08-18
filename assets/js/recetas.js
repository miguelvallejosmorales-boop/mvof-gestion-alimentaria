/* MVOF · RECETAS  (v3.0 · badge de origen INTA/Propio) */
let DRAWER_PLATO=null, DRAWER_ING_LIST=[], EDIT_ING=null;

/* ---- Badge de origen (nuevo v3.0) ---- */
function badgeFuente(fuente){
  const f = (fuente || 'MANUAL').toString().toUpperCase();
  if (f === 'INTA')       return '<span class="badge-src src-inta" title="Cargado desde la Biblioteca INTA 2018">🌿 INTA</span>';
  if (f === 'INTA_MATCH') return '<span class="badge-src src-match" title="Propio enriquecido con datos INTA">✅ INTA</span>';
  return '<span class="badge-src src-manual" title="Ingrediente propio (datos manuales)">✍️ Propio</span>';
}

function cambiarSubTab(sub){
  document.querySelectorAll("#mod-recetas .tab").forEach(t=>t.classList.toggle("active", t.dataset.sub===sub));
  const sp=$("sub-platos"), si=$("sub-ingredientes");
  if (sp) sp.classList.toggle("hidden", sub!=="platos");
  if (si) si.classList.toggle("hidden", sub!=="ingredientes");
}

function renderFiltroCat(){
  const el=$("filtroCat"); if(!el) return;
  el.innerHTML = '<option value="">Todas las categorías</option>' +
    CATEGORIAS.map(c=>`<option value="${c.categoria_id}">${c.nombre}</option>`).join("");
}

function renderPlatos(){
  const fcEl=$("filtroCat"), qEl=$("buscarPlato");
  const fc=fcEl?fcEl.value:"", q=qEl?qEl.value.toLowerCase():"";
  let lista=PLATOS.slice();
  if (fc) lista=lista.filter(p=>p.categoria_id==fc);
  if (q) lista=lista.filter(p=>p.nombre.toLowerCase().includes(q));
  const tb=$("tbl-platos"); if(!tb) return;
  const puedeEditar=tienePermiso("recetas.editar"), puedeEliminar=tienePermiso("recetas.eliminar");
  if (!lista.length){
    tb.innerHTML='<tr><td colspan="7" class="empty">Sin resultados</td></tr>';
  } else {
    tb.innerHTML=lista.map(p=>{
      const cat=CATEGORIAS.find(c=>c.categoria_id===p.categoria_id);
      let acciones="";
      if (puedeEditar)   acciones+=`<button class="btn btn-soft btn-mini" onclick="editarPlato(${p.plato_id})">✏️</button>`;
      if (puedeEliminar) acciones+=`<button class="btn btn-danger btn-mini" onclick="eliminarPlato(${p.plato_id})">🗑️</button>`;
      if (!acciones) acciones='—';
      return `<tr>
        <td><b>${p.nombre}</b></td>
        <td><span class="tag-cat">${cat?cat.nombre:'—'}</span></td>
        <td class="nutri">${(+p.kcal_total).toFixed(1)}</td>
        <td class="nutri">${(+p.prot_total).toFixed(1)}</td>
        <td class="nutri">${(+p.carb_total).toFixed(1)}</td>
        <td class="nutri">${(+p.grasa_total).toFixed(1)}</td>
        <td><div class="acciones">${acciones}</div></td>
      </tr>`;
    }).join("");
  }
  const st=$("statsPlatos"); if(st) st.textContent = `📋 ${lista.length} platos`;
}

document.addEventListener("input",e=>{
  if (e.target.id==="filtroCat"||e.target.id==="buscarPlato") renderPlatos();
  if (e.target.id==="buscarIng") renderIngredientes();
  if (e.target.id==="buscarUsuario" && typeof renderTablaUsuarios==="function") renderTablaUsuarios();
});
document.addEventListener("change",e=>{
  if (e.target.id==="filtroCat") renderPlatos();
  if (e.target.id==="filtroFuenteIng") renderIngredientes();   // filtro por origen (v3.0)
});

function abrirDrawerPlato(){
  if (!tienePermiso("recetas.crear")){ toast("Sin permiso","err"); return; }
  DRAWER_PLATO=null; DRAWER_ING_LIST=[];
  const set=(id,v)=>{ const el=$(id); if(el) el.value=v; };
  const t=$("drawerTitle"); if(t) t.textContent="Nueva receta";
  set("d-nombre",""); set("d-porciones",1); set("d-tiempo",""); set("d-tags",""); set("d-prep","");
  renderCatSel(null); renderIngSel(); renderIngLista(); recalcularVivo();
  const bg=$("drawerBg"), dr=$("drawer");
  if (bg) bg.classList.add("show"); if (dr) dr.classList.add("show");
}

async function editarPlato(plato_id){
  if (!tienePermiso("recetas.editar")){ toast("Sin permiso","err"); return; }
  try{
    const det=await supaFetch(`/platos?plato_id=eq.${plato_id}&select=*,plato_ingrediente(*,ingredientes(*))`);
    if (!det.length){ toast("No encontrado","err"); return; }
    const p=det[0]; DRAWER_PLATO=p;
    DRAWER_ING_LIST=(p.plato_ingrediente||[]).map(pi=>({
      ingrediente_id:pi.ingrediente_id, nombre:pi.ingredientes.nombre, unidad:pi.ingredientes.unidad,
      kcal_100:+pi.ingredientes.kcal_100, prot_100:+pi.ingredientes.prot_100,
      carb_100:+pi.ingredientes.carb_100, grasa_100:+pi.ingredientes.grasa_100,
      cantidad:+pi.cantidad, notas:pi.notas||""
    }));
    const set=(id,v)=>{ const el=$(id); if(el) el.value=v; };
    const t=$("drawerTitle"); if(t) t.textContent="Editar: "+p.nombre;
    set("d-nombre",p.nombre); set("d-porciones",p.porciones||1); set("d-tiempo",p.tiempo_min||"");
    set("d-tags",Array.isArray(p.tags)?p.tags.join(", "):""); set("d-prep",p.preparacion||"");
    renderCatSel(p.categoria_id); renderIngSel(); renderIngLista(); recalcularVivo();
    const bg=$("drawerBg"), dr=$("drawer");
    if (bg) bg.classList.add("show"); if (dr) dr.classList.add("show");
  }catch(e){ toast("Error: "+e.message,"err"); }
}

function cerrarDrawer(){
  const bg=$("drawerBg"), dr=$("drawer");
  if (bg) bg.classList.remove("show"); if (dr) dr.classList.remove("show");
}

function renderCatSel(sel_id){
  const el=$("d-cat"); if(!el) return;
  el.innerHTML=CATEGORIAS.map(c=>`<option value="${c.categoria_id}" ${c.categoria_id===sel_id?'selected':''}>${c.nombre}</option>`).join("");
}

function renderIngSel(){
  const el=$("d-ing-sel"); if(!el) return;
  el.innerHTML='<option value="">Selecciona ingrediente...</option>' +
    INGREDIENTES.map(i=>`<option value="${i.ingrediente_id}">${i.nombre} (${i.unidad})</option>`).join("");
}

function renderIngLista(){
  const c=$("d-ing-lista"); if(!c) return;
  if (!DRAWER_ING_LIST.length){ c.innerHTML='<div class="empty" style="padding:14px">Aún no hay ingredientes</div>'; return; }
  c.innerHTML=DRAWER_ING_LIST.map((ing,i)=>`
    <div class="ing-row">
      <span>${ing.nombre}</span>
      <input type="number" step="0.001" value="${ing.cantidad}" onchange="cambiarCantidad(${i}, this.value)">
      <span class="nutri">${ing.unidad}</span>
      <button class="ing-x" onclick="quitarIngrediente(${i})">✕</button>
    </div>`).join("");
}

function agregarIngrediente(){
  const selEl=$("d-ing-sel"), cantEl=$("d-ing-cant");
  const id=selEl?+selEl.value:0, cant=cantEl?+cantEl.value:0;
  if (!id||!cant){ toast("Selecciona y cantidad","err"); return; }
  if (DRAWER_ING_LIST.find(x=>x.ingrediente_id===id)){ toast("Ya está","err"); return; }
  const ing=INGREDIENTES.find(i=>i.ingrediente_id===id);
  DRAWER_ING_LIST.push({ingrediente_id:id, nombre:ing.nombre, unidad:ing.unidad,
    kcal_100:+ing.kcal_100, prot_100:+ing.prot_100, carb_100:+ing.carb_100, grasa_100:+ing.grasa_100, cantidad:cant, notas:""});
  if (selEl) selEl.value=""; if (cantEl) cantEl.value="";
  renderIngLista(); recalcularVivo();
}

function cambiarCantidad(i,v){ DRAWER_ING_LIST[i].cantidad=+v||0; recalcularVivo(); }
function quitarIngrediente(i){ DRAWER_ING_LIST.splice(i,1); renderIngLista(); recalcularVivo(); }

function recalcularVivo(){
  let cal=0,prot=0,carb=0,gt=0;
  DRAWER_ING_LIST.forEach(ing=>{ const f=ing.cantidad/100; cal+=ing.kcal_100*f; prot+=ing.prot_100*f; carb+=ing.carb_100*f; gt+=ing.grasa_100*f; });
  const set=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };
  set("t-cal",cal.toFixed(1)); set("t-prot",prot.toFixed(1)); set("t-carb",carb.toFixed(1)); set("t-gt",gt.toFixed(1));
}

async function guardarPlato(){
  const esEdicion=!!DRAWER_PLATO;
  if (!tienePermiso(esEdicion?"recetas.editar":"recetas.crear")){ toast("Sin permiso","err"); return; }
  const nombre=$("d-nombre").value.trim();
  if (!nombre){ toast("Falta nombre","err"); return; }
  const categoria_id=+$("d-cat").value;
  if (!categoria_id){ toast("Falta categoría","err"); return; }
  const tagsTxt=$("d-tags").value.trim();
  const tags=tagsTxt?tagsTxt.split(",").map(t=>t.trim()).filter(Boolean):[];
  const body={nombre, categoria_id, porciones:+$("d-porciones").value||1, tiempo_min:+$("d-tiempo").value||null, tags, preparacion:$("d-prep").value.trim()||null};
  try{
    let plato_id;
    if (DRAWER_PLATO){
      plato_id=DRAWER_PLATO.plato_id;
      await supaFetch(`/platos?plato_id=eq.${plato_id}`,{method:"PATCH", body:JSON.stringify(body)});
      await supaFetch(`/plato_ingrediente?plato_id=eq.${plato_id}`,{method:"DELETE"});
    } else {
      const created=await supaFetch("/platos",{method:"POST", body:JSON.stringify(body)});
      plato_id=created[0].plato_id;
    }
    if (DRAWER_ING_LIST.length){
      const filas=DRAWER_ING_LIST.map(i=>({plato_id, ingrediente_id:i.ingrediente_id, cantidad:i.cantidad, notas:i.notas||null}));
      await supaFetch("/plato_ingrediente",{method:"POST", body:JSON.stringify(filas)});
    }
    toast("✅ Receta guardada"); cerrarDrawer(); await cargarTodo();
  }catch(e){ toast("Error: "+e.message,"err"); }
}

async function eliminarPlato(plato_id){
  if (!tienePermiso("recetas.eliminar")){ toast("Sin permiso","err"); return; }
  const p=PLATOS.find(x=>x.plato_id===plato_id);
  if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
  try{ await supaFetch(`/platos?plato_id=eq.${plato_id}`,{method:"DELETE"}); toast("🗑️ Eliminado"); await cargarTodo(); }
  catch(e){ toast("Error: "+e.message,"err"); }
}

/* ---- INGREDIENTES con columna ORIGEN + filtro por fuente (v3.0) ---- */
function renderIngredientes(){
  const qEl=$("buscarIng"); const q=qEl?qEl.value.toLowerCase():"";
  const fEl=$("filtroFuenteIng"); const fSrc=fEl?fEl.value:"";
  let lista=INGREDIENTES.slice();
  if (q) lista=lista.filter(i=>i.nombre.toLowerCase().includes(q));
  if (fSrc) lista=lista.filter(i=>((i.fuente||'MANUAL').toString().toUpperCase()===fSrc));
  const tb=$("tbl-ing"); if(!tb) return;
  const puedeEditar=tienePermiso("ingredientes.editar"), puedeEliminar=tienePermiso("ingredientes.eliminar");
  if (!lista.length){
    tb.innerHTML='<tr><td colspan="8" class="empty">Sin ingredientes.</td></tr>';
  } else {
    tb.innerHTML=lista.map(i=>{
      let acciones="";
      if (puedeEditar)   acciones+=`<button class="btn btn-soft btn-mini" onclick="editarIng(${i.ingrediente_id})">✏️</button>`;
      if (puedeEliminar) acciones+=`<button class="btn btn-danger btn-mini" onclick="eliminarIng(${i.ingrediente_id})">🗑️</button>`;
      if (!acciones) acciones='—';
      return `<tr>
        <td><b>${i.nombre}</b></td>
        <td>${badgeFuente(i.fuente)}</td>
        <td class="nutri">${i.unidad}</td>
        <td class="nutri">${(+i.kcal_100).toFixed(2)}</td>
        <td class="nutri">${(+i.prot_100).toFixed(2)}</td>
        <td class="nutri">${(+i.carb_100).toFixed(2)}</td>
        <td class="nutri">${(+i.grasa_100).toFixed(2)}</td>
        <td><div class="acciones">${acciones}</div></td>
      </tr>`;
    }).join("");
  }
  const st=$("statsIng");
  if (st){
    const nInta =lista.filter(i=>(i.fuente||'').toString().toUpperCase()==='INTA').length;
    const nMatch=lista.filter(i=>(i.fuente||'').toString().toUpperCase()==='INTA_MATCH').length;
    const nMan  =lista.filter(i=>(i.fuente||'MANUAL').toString().toUpperCase()==='MANUAL').length;
    st.textContent = `🥕 ${lista.length} · 🌿 ${nInta} · ✅ ${nMatch} · ✍️ ${nMan}`;
  }
}

function abrirModalIng(){
  if (!tienePermiso("ingredientes.crear")){ toast("Sin permiso","err"); return; }
  EDIT_ING=null;
  const t=$("modalIngTitle"); if(t) t.textContent="Nuevo ingrediente";
  ["i-nombre","i-kcal","i-prot","i-carb","i-grasa"].forEach(id=>{ const el=$(id); if(el) el.value=""; });
  const u=$("i-unidad"); if(u) u.value="gr";
  const m=$("modalIng"); if(m) m.classList.add("show");
}
function cerrarModalIng(){ const m=$("modalIng"); if(m) m.classList.remove("show"); }

function editarIng(id){
  if (!tienePermiso("ingredientes.editar")){ toast("Sin permiso","err"); return; }
  const i=INGREDIENTES.find(x=>x.ingrediente_id===id); if (!i) return;
  EDIT_ING=i;
  const set=(id,v)=>{ const el=$(id); if(el) el.value=v; };
  const t=$("modalIngTitle"); if(t) t.textContent="Editar: "+i.nombre;
  set("i-nombre",i.nombre); set("i-unidad",i.unidad); set("i-kcal",i.kcal_100);
  set("i-prot",i.prot_100); set("i-carb",i.carb_100); set("i-grasa",i.grasa_100);
  const m=$("modalIng"); if(m) m.classList.add("show");
}

async function guardarIngrediente(){
  if (!tienePermiso(EDIT_ING?"ingredientes.editar":"ingredientes.crear")){ toast("Sin permiso","err"); return; }
  const nombre=$("i-nombre").value.trim(); if (!nombre){ toast("Falta nombre","err"); return; }
  const body={nombre, unidad:$("i-unidad").value, kcal_100:+$("i-kcal").value||0, prot_100:+$("i-prot").value||0, carb_100:+$("i-carb").value||0, grasa_100:+$("i-grasa").value||0};
  if (!EDIT_ING) body.fuente='MANUAL'; // los creados a mano quedan como Propio
  try{
    if (EDIT_ING) await supaFetch(`/ingredientes?ingrediente_id=eq.${EDIT_ING.ingrediente_id}`,{method:"PATCH", body:JSON.stringify(body)});
    else await supaFetch("/ingredientes",{method:"POST", body:JSON.stringify(body)});
    toast("✅ Guardado"); cerrarModalIng(); await cargarTodo();
  }catch(e){ toast("Error: "+e.message,"err"); }
}

async function eliminarIng(id){
  if (!tienePermiso("ingredientes.eliminar")){ toast("Sin permiso","err"); return; }
  const i=INGREDIENTES.find(x=>x.ingrediente_id===id);
  if (!confirm(`¿Eliminar "${i.nombre}"?`)) return;
  try{ await supaFetch(`/ingredientes?ingrediente_id=eq.${id}`,{method:"DELETE"}); toast("🗑️ Eliminado"); await cargarTodo(); }
  catch(e){ toast("Error: "+e.message,"err"); }
}
