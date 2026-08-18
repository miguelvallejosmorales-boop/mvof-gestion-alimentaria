/* MVOF · DASHBOARD */
function renderDashboard(){
  if (!PLATOS.length){ $("stats-cards").innerHTML='<div class="card card-pad metric"><div class="label">Sin datos</div><div class="value">—</div></div>'; return; }
  const metric=(l,v,s)=>`<div class="card card-pad metric"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`;
  $("stats-cards").innerHTML =
    metric("📋 Platos",PLATOS.length,"En el catálogo") +
    metric("🥕 Ingredientes",INGREDIENTES.length,"Maestro") +
    metric("📅 Minutas",MINUTAS_SAVED.length,"Guardadas") +
    metric("🏢 Casinos",CASINOS.length,"Activos");

  const conteo={};
  PLATOS.forEach(p=>{ conteo[p.categoria_id]=(conteo[p.categoria_id]||0)+1; });
  const maxC=Math.max(...Object.values(conteo),1);
  $("dist-cat").innerHTML=CATEGORIAS.map(c=>{
    const n=conteo[c.categoria_id]||0, pct=Math.round(n/maxC*100);
    return `<div class="bar-row"><span>${c.nombre}</span><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div><span class="nutri">${n}</span></div>`;
  }).join("");

  const t10c=[...PLATOS].sort((a,b)=>+b.kcal_total-+a.kcal_total).slice(0,10);
  const mxC=+t10c[0].kcal_total||1;
  $("top-cal").innerHTML=t10c.map(p=>{
    const pct=Math.round(+p.kcal_total/mxC*100);
    return `<div class="bar-row"><span>${p.nombre}</span><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div><span class="nutri">${(+p.kcal_total).toFixed(0)}</span></div>`;
  }).join("");

  const t10p=[...PLATOS].sort((a,b)=>+b.prot_total-+a.prot_total).slice(0,10);
  const mxP=+t10p[0].prot_total||1;
  $("top-prot").innerHTML=t10p.map(p=>{
    const pct=Math.round(+p.prot_total/mxP*100);
    return `<div class="bar-row"><span>${p.nombre}</span><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div><span class="nutri">${(+p.prot_total).toFixed(1)}</span></div>`;
  }).join("");

  const u=MINUTAS_SAVED.slice(0,5);
  if (!u.length){ $("ultimas-min").innerHTML='<div class="empty">No hay minutas guardadas aún.</div>'; }
  else {
    $("ultimas-min").innerHTML=u.map(m=>`<div class="bar-row" style="grid-template-columns:1fr auto auto;gap:12px">
      <span><b>#${m.minuta_id}</b> · ${m.nombre}</span>
      <span class="nutri">${m.semana_inicio||""}</span>
      <button class="btn btn-mini btn-soft" onclick="cargarMinutaPorId(${m.minuta_id})">📂 Cargar</button></div>`).join("");
  }
}
