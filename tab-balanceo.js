/* Pestaña 4: Balanceo de personal */
'use strict';
/* ---------- Pestaña 4: Balanceo ---------- */
function applyCand(c,sedeId){
  const e=empOf(c.emp.id);
  if(c.type==='almuerzo'){const t=describe([sedeId],()=>setStatus(e,'En Ventanilla'));logAdd(`Almuerzo reprogramado: ${e.name} vuelve a ventanilla. ${t}`);return t}
  const t=describe([sedeId,e.sedeId],()=>setStatus(e,'Canal Virtual',sedeId));
  logAdd(`Reasignación virtual: ${e.name} (${sedeOf(e.sedeId).name}) atiende ${sedeOf(sedeId).name}. ${t}`);return t;
}
function viewBalanceo(){
  const list=evs().filter(x=>x.e.status!=='verde').sort((a,b)=>b.e.Wq-a.e.Wq);
  const virt=S.emps.filter(e=>e.status==='Canal Virtual');
  const cards=list.map(({s,e})=>{
    const top=M.candidates(s.id,S.sedes,S.emps,ctx()).filter(c=>c.gain>.3).slice(0,5);
    const pick=top.find(c=>c.emp.id===S.pick[s.id])||top[0];
    const trig=e.status==='rojo'?`<span class="pill rojo">Trigger: ${e.stable?'Wq > 15 min':'saturada'}</span>`:`<span class="pill amarillo">Alerta preventiva</span>`;
    let body;
    if(!pick)body=`<div class="proj"><b>Sin agentes disponibles para ceder.</b><span>Ninguna sede tiene holgura suficiente sin quedar fuera de SLA. Se necesitan <b>${e.needC}</b> ventanillas atendiendo (hoy ${e.c}): requiere refuerzo o reprogramar novedades.</span></div>`;
    else{
      const opt=c=>c.type==='almuerzo'?`Reprogramar almuerzo de ${c.emp.name}`:`${c.emp.name} · ${c.donor.name} (ρ ${pct(c.dBefore.rho)} → ${pct(c.dAfter.rho)})`;
      body=`<div class="field" style="margin:0"><label for="p${s.id}">Sugerencia MOAR</label><select id="p${s.id}" data-in="pick" data-id="${s.id}">${top.map(c=>`<option value="${c.emp.id}" ${c.emp.id===pick.emp.id?'selected':''}>${opt(c)}</option>`).join('')}</select></div>
      <div class="proj"><span>Destino · ${s.name}: Wq <b>${wq(e)}</b> → <b class="g">${wq(pick.tAfter)}</b> min · ρ ${e.stable?pct(e.rho):'≥100%'} → ${pct(pick.tAfter.rho)}</span>${pick.donor?`<span>Origen · ${pick.donor.name}: Wq ${wq(pick.dBefore)} → ${wq(pick.dAfter)} min · ρ ${pct(pick.dBefore.rho)} → ${pct(pick.dAfter.rho)}</span>`:''}</div>
      <button class="btn pri" data-act="exec" data-id="${s.id}" style="justify-content:center">✓ ${pick.type==='almuerzo'?'Reprogramar almuerzo':'Ejecutar reasignación virtual'}</button>`;
    }
    return `<div class="acard ${e.status}"><div class="row">${trig}<span class="muted num" style="font-size:11px">${HOURS[S.hour]} · ×${S.mult.toFixed(1)}</span></div>
      <div><h3 style="font-size:15px">${e.status==='rojo'?'Saturación':'Riesgo'} en ${s.name}</h3><p class="sub">Wq = ${wq(e)} min · ${Math.round(e.Lq)} usuarios en cola · ocupación ${e.stable?pct(e.rho):'≥100%'} · ${e.c} ventanillas</p></div>${body}</div>`;
  }).join('');
  return `<section class="card"><div class="sec-h" style="margin:0"><div><h2>Recomendador de redistribución dinámica</h2><p class="sub">Sedes con holgura ceden agentes con habilidad virtual a las sedes congestionadas. Cada propuesta se calcula con Erlang C antes de ejecutarse.</p></div>
  <div class="tools"><button class="btn pri" data-act="batch">⚡ Optimizar automáticamente</button><button class="btn" data-act="resetAll">Restablecer datos</button></div></div></section>
  ${list.length?`<div class="alerts">${cards}</div>`:'<section class="card empty"><b>Todas las sedes cumplen el SLA.</b><br>No hay alertas ni triggers activos en esta franja.</section>'}
  <div class="two"><section class="card"><h3 style="margin-bottom:8px">Reasignaciones virtuales activas (${virt.length})</h3>${virt.length?virt.map(e=>`<div class="row" style="padding:6px 0;border-top:1px solid var(--line);align-items:center"><span><b>${e.name}</b><br><span class="muted" style="font-size:12px">${sedeOf(e.sedeId).name} → atiende ${sedeOf(e.target).name}</span></span><button class="btn" data-act="back" data-id="${e.id}">Revertir</button></div>`).join(''):'<p class="sub">No hay agentes en canal virtual.</p>'}</section>
  <section class="card"><h3 style="margin-bottom:8px">Bitácora de decisiones</h3><div class="log">${S.log.length?S.log.map(l=>`<div><time>${l.t}</time><span>${l.msg}</span></div>`).join(''):'<p class="sub">Aún no se ha ejecutado ninguna acción.</p>'}</div></section></div>`;
}
function batch(){
  let n=0;const before=sys(evs()).crit;
  for(let it=0;it<14;it++){
    const reds=evs().filter(x=>x.e.status==='rojo').sort((a,b)=>b.e.Wq-a.e.Wq);let did=false;
    for(const {s} of reds){
      const c=M.candidates(s.id,S.sedes,S.emps,ctx()).filter(x=>x.gain>.3)[0];
      if(c){applyCand(c,s.id);n++;did=true;break}
    }
    if(!did)break;
  }
  const after=sys(evs());
  const msg=n?`Batch: ${n} acción(es) aplicada(s). Sedes críticas ${before} → ${after.crit}.`:before?`Batch: sin acciones posibles. ${before} sede(s) crítica(s) necesitan refuerzo.`:'Batch: no hay sedes críticas, nada que optimizar.';
  logAdd(msg);toast(msg);render();
}
