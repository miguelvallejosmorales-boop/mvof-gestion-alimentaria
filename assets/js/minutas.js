/* MVOF · MÓDULO MINUTAS */
let MINUTA_CARGADA_ID = null;
let MODAL_PR_CAT = null;
function renderCasinos(){
  $("casinoSel").innerHTML = CASINOS.map(c=>`<option value="${c.casino_id}">${c.nombre}</option>`).join("");
}
function renderTablaMinuta(){
  $("thead-row").innerHTML = "<th>Categoría</th>" + DIAS.map(d=>`<th>${d}</th>`).join("");
  const tbody = $("tbody-min"); tbody.innerHTML = "";
  const puedeCrearPlato = typeof tienePermiso==="function" && tienePermiso("recetas.crear");
  CATEGORIAS.forEach(cat=>{
    const tr = document.createElement("tr");
    const sub = cat.subtitulo ? `<div class="cat-sub">${cat.subtitulo}</div>` : "";
    const safe = (cat.nombre||"").replace(/'/g,"\\'");
    const btnPlato = puedeCrearPlato ? `<button class="btn btn-mini btn-soft" onclick="abrirPlatoRapido(${cat.categoria_id},'${safe}')">＋</button>` : "";
    tr.innerHTML = `<td class="cat"><div class="cat-wrap"><div class="cat-name">${cat.nombre}${sub}</div>${btnPlato}</div></td>`;
    for (let d=0; d<7; d++){
      const td = document.createElement("td");
      td.innerHTML = selectorPlato(cat.categoria_id, d);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  const trT = document.createElement("tr");
  trT.className = "totales";
  trT.innerHTML = `<td class="cat">TOTAL DÍA</td>` + DIAS.map((_,d)=>`<td id="total-${d}">—</td>`).join("");
  tbody.appendChild(trT);
  recalcularMin();
}
function selectorPlato(catId, dia){
  const platos = PLATOS.filter(p=>p.categoria_id===catId);
  const opts = platos.map(p=>`<option value="${p.plato_id}">${p.nombre}</option>`).join("");
  return `<select class="plato" data-cat="${catId}" data-dia="${dia}" onchange="onCambioMin(this)"><option value="">— seleccionar —</option>${opts}</select><div class="info" id="info-${catId}-${dia}"></div>`;
}
function onCambioMin(sel){
  const catId=+sel.dataset.cat, dia=sel.dataset.dia, pid=+sel.value;
  const info=$(`info-${catId}-${dia}`);
  if (!pid){ if(info) info.innerHTML=""; recalcularMin(); return; }
  const p=PLATOS.find(x=>x.plato_id===pid);
  if (p && info) info.innerHTML = `<b>Cal</b> ${(+p.kcal_total).toFixed(1)} · <b>P</b> ${(+p.prot_total).toFixed(1)} · <b>C</b> ${(+p.carb_total).toFixed(1)} · <b>GT</b> ${(+p.grasa_total).toFixed(1)}`;
  recalcularMin();
}
function recalcularMin(){
  for (let d=0; d<7; d++){
    let cal=0,prot=0,carb=0,gt=0;
    document.querySelectorAll(`select.plato[data-dia="${d}"]`).forEach(s=>{
      if (!s.value) return;
      const p=PLATOS.find(x=>x.plato_id===+s.value);
      if (!p) return;
      cal+=+p.kcal_total; prot+=+p.prot_total; carb+=+p.carb_total; gt+=+p.grasa_total;
    });
    const c=$(`total-${d}`);
    if (c) c.innerHTML = `Cal ${cal.toFixed(1)} · P ${prot.toFixed(1)} · C ${carb.toFixed(1)} · GT ${gt.toFixed(1)}`;
  }
}
function renderAderezos(){
  $("aderezos-list").innerHTML = ADEREZOS.map(a=>`<span>${a.nombre}</span>`).join("");
}
function limpiarMinuta(){
  if (!confirm("¿Limpiar todas las selecciones?")) return;
  document.querySelectorAll("select.plato").forEach(s=>{ s.value=""; onCambioMin(s); });
}
function nuevaSemana(){
  document.querySelectorAll("select.plato").forEach(s=>{ s.value=""; onCambioMin(s); });
  $("nombreMinuta").value=""; $("mes").value=""; $("fechaInicio").value="";
  MINUTA_CARGADA_ID=null;
}
async function guardarMinutaDB(){
  if (!tienePermiso("minutas.crear")){ toast("Sin permiso","err"); return; }
  if (!CONECTADO){ toast("Sin conexión","err"); return; }
  const casino_id=+$("casinoSel").value, nombre=$("nombreMinuta").value.trim();
  const mes=$("mes").value.trim(), semana_inicio=$("fechaInicio").value;
  if (!casino_id){ toast("Selecciona casino","err"); return; }
  if (!nombre){ toast("Pon un nombre","err"); return; }
  if (!semana_inicio){ toast("Selecciona la semana","err"); return; }
  const detalles=[];
  document.querySelectorAll("select.plato").forEach(s=>{
    if (s.value) detalles.push({dia_semana:(+s.dataset.dia)+1, categoria_id:+s.dataset.cat, plato_id:+s.value});
  });
  if (!detalles.length){ toast("La minuta está vacía","err"); return; }
  try{
    const cab=await supaFetch("/minutas",{method:"POST", body:JSON.stringify({casino_id,nombre,mes,semana_inicio,estado:"borrador"})});
    const minuta_id=cab[0].minuta_id;
    const filas=detalles.map(d=>({minuta_id,...d}));
    await supaFetch("/minuta_detalle",{method:"POST", body:JSON.stringify(filas)});
    MINUTA_CARGADA_ID=minuta_id;
    toast(`✅ Minuta guardada (#${minuta_id})`);
    if (typeof logAccion==="function") logAccion("CREAR","MINUTA",minuta_id,"Minuta "+nombre);
    MINUTAS_SAVED=await supaFetch("/minutas?select=minuta_id,nombre,mes,semana_inicio,casino_id&order=creado_en.desc&limit=50");
    renderMinutaSelectCompras();
  }catch(e){ toast("Error: "+e.message,"err"); }
}
async function cargarMinutaDB(){
  if (!CONECTADO){ toast("Sin conexión","err"); return; }
  try{
    if (!MINUTAS_SAVED.length){ toast("No hay minutas guardadas","err"); return; }
    const opts=MINUTAS_SAVED.map(m=>`#${m.minuta_id} · ${m.nombre} · ${m.semana_inicio}`).join("\n");
    const elegir=prompt("Minutas guardadas (escribe #ID):\n\n"+opts);
    if (!elegir) return;
    const id=parseInt(elegir.replace(/[^\d]/g,""),10);
    await cargarMinutaPorId(id);
  }catch(e){ toast("Error: "+e.message,"err"); }
}
async function cargarMinutaPorId(id){
  irA("minutas");
  const m=MINUTAS_SAVED.find(x=>x.minuta_id===id);
  if (!m){ toast("No encontrada","err"); return; }
  $("casinoSel").value=m.casino_id; $("nombreMinuta").value=m.nombre||""; $("mes").value=m.mes||""; $("fechaInicio").value=m.semana_inicio||"";
  const det=await supaFetch(`/minuta_detalle?minuta_id=eq.${id}&select=*`);
  document.querySelectorAll("select.plato").forEach(s=>{ s.value=""; onCambioMin(s); });
  det.forEach(d=>{
    const sel=document.querySelector(`select.plato[data-cat="${d.categoria_id}"][data-dia="${d.dia_semana-1}"]`);
    if (sel){ sel.value=d.plato_id; onCambioMin(sel); }
  });
  MINUTA_CARGADA_ID=id;
  toast(`✅ Minuta #${id} cargada`);
}
function abrirPlatoRapido(catId, catNombre){
  if (!tienePermiso("recetas.crear")){ toast("Sin permiso","err"); return; }
  MODAL_PR_CAT=catId;
  $("mpr-cat").textContent="Categoría: "+catNombre;
  ["mpr-nombre","mpr-cal","mpr-prot","mpr-carb","mpr-gt"].forEach(id=>$(id).value="");
  $("modalPlatoRapido").classList.add("show");
}
function cerrarPlatoRapido(){ $("modalPlatoRapido").classList.remove("show"); }
async function crearPlatoRapido(){
  if (!tienePermiso("recetas.crear")){ toast("Sin permiso","err"); return; }
  const nombre=$("mpr-nombre").value.trim();
  if (!nombre){ toast("Falta nombre","err"); return; }
  try{
    await supaFetch("/platos",{method:"POST", body:JSON.stringify({
      categoria_id:MODAL_PR_CAT, nombre,
      kcal_total:+$("mpr-cal").value||0, prot_total:+$("mpr-prot").value||0,
      carb_total:+$("mpr-carb").value||0, grasa_total:+$("mpr-gt").value||0
    })});
    cerrarPlatoRapido(); toast("✅ Plato creado"); await cargarTodo();
  }catch(e){ toast("Error: "+e.message,"err"); }
}
