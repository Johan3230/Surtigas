/* Pestaña 1: Centro de control */
'use strict';
/* ---------- Pestaña 1: Centro de control ---------- */
function hourly(){
  const out={dem:[],cap:[],wq:[],worst:[]};
  HF.forEach((hf,i)=>{
    const l=S.sedes.map(s=>M.evalSede(s,S.emps,{hf,mult:S.mult})), k=sys(l.map(e=>({e})));
    out.dem.push(k.lam);out.cap.push(k.cap);out.wq.push(k.wq);out.worst.push(Math.max(...l.map(e=>e.Wq)));
  });return out;
}
function viewControl(){
  const list=evs(),k=sys(list),act=S.emps.filter(e=>e.status!=='Incapacidad'&&e.status!=='Permiso').length,aus=36-act;
  const kp=(l,v,n,cls)=>`<div class="kpi"><div class="l">${l}</div><div class="v num">${v}</div><div class="n ${cls||''}">${n}</div></div>`;
  let h=`<div class="kpis">
    ${kp('Espera promedio (Wq)',f1(k.wq)+' <small>min</small>',k.wq>15?'Excede meta de 15 min':'Dentro de la meta de 15 min',k.wq>15?'t-crit':'t-ok')}
    ${kp('Ocupación global (ρ)',pct(k.rho),k.rho>M.RHO_MAX?'Alta ocupación (> 85%)':'Balanceada (≤ 85%)',k.rho>M.RHO_MAX?'t-warn':'t-ok')}
    ${kp('Cola total (Lq)',f1(k.lq),'usuarios esperando','muted')}
    ${kp('Cumplimiento SLA',pct(k.sla),'atendidos en ≤ 15 min',k.sla<.9?'t-warn':'t-ok')}
    ${kp('Agentes activos',act+' <small>/ 36</small>',aus+' con novedad (incapacidad / permiso)','muted')}
    ${kp('Sedes críticas',k.crit+' <small>/ 14</small>',k.crit?'Trigger Wq > 15 min activo':'Sin triggers activos',k.crit?'t-crit':'t-ok')}
  </div>
  <section><div class="sec-h"><div><h2>Estado operativo · 14 sedes Surtigas</h2><p class="sub">Toque una sede para ver su detalle y la recomendación del motor.</p></div>
  <div class="legend"><span class="t-ok"><i class="sw sq"></i>Normal</span><span class="t-warn"><i class="sw sq"></i>Alerta (Wq ≥ 10 o ρ ≥ 85%)</span><span class="t-crit"><i class="sw sq"></i>Crítico (Wq &gt; 15 min)</span></div></div>
  <div class="sedes">${list.map(({s,e})=>`<button class="sede ${e.status} ${S.sel===s.id?'sel':''}" data-act="sel" data-id="${s.id}" aria-pressed="${S.sel===s.id}">
    <div class="row"><div><h3>${s.name}</h3><span class="city">${s.city}</span></div><span class="pill ${e.status}">${ST[e.status]}</span></div>
    <div class="m3 num"><div><span>Espera Wq</span><b class="${e.status==='rojo'?'t-crit':e.status==='amarillo'?'t-warn':''}">${wq(e)}m</b></div><div><span>Cola Lq</span><b>${Math.round(e.Lq)}p</b></div><div><span>Ocup. ρ</span><b class="${e.rho>=M.RHO_MAX?'t-warn':''}">${e.stable?pct(e.rho):'≥100%'}</b></div></div>
    <div class="foot"><span>Ventanillas: <strong>${e.c}/${s.windows}</strong></span>${e.v?`<span style="color:var(--accent);font-weight:600">+${e.v} virtual</span>`:''}</div></button>`).join('')}</div></section>`;
  if(S.sel){h+=detail(S.sel)}
  h+=`<div class="two"><section class="card"><h2>Demanda vs. capacidad por franja</h2><p class="sub">Usuarios por hora de las 14 sedes (λ) contra la capacidad instalada con el personal actual (Σ c·μ).</p><div id="ch1"></div></section>
  <section class="card"><h2>Espera Wq por franja</h2><p class="sub">Promedio ponderado y sede más cargada, en minutos. La línea roja es el SLA de 15 min.</p><div id="ch2"></div></section></div>`;
  return h;
}
function detail(id){
  const s=sedeOf(id),e=evS(s),staff=S.emps.filter(x=>x.sedeId===id),virt=S.emps.filter(x=>x.status==='Canal Virtual'&&x.target===id);
  const cands=e.status!=='verde'?M.candidates(id,S.sedes,S.emps,ctx()).filter(c=>c.gain>.3):[];
  const top=cands[0];
  let rec;
  if(e.status==='verde')rec='Sede con nivel de servicio óptimo. No requiere acción.';
  else if(top)rec=top.type==='almuerzo'?`Reprogramar el almuerzo de <b>${top.emp.name}</b>: Wq pasaría de ${wq(e)} a ${wq(top.tAfter)} min.`:`Reasignar a <b>${top.emp.name}</b> (${top.donor.name}, ρ ${pct(top.dBefore.rho)}) al canal virtual: Wq pasaría de ${wq(e)} a ${wq(top.tAfter)} min.`;
  else rec=`No hay agentes con holgura para ceder. Para cumplir el SLA se necesitan ${e.needC} ventanillas atendiendo y hoy hay ${e.c}.`;
  return `<section class="card" id="detail"><div class="sec-h"><h2>Detalle de sede: ${s.name}</h2><button class="btn ghost" data-act="sel" data-id="${id}">Cerrar</button></div>
  <div class="cols3">
    <div class="box"><span class="t">Teoría de colas (M/M/c)</span>
      <div class="kv"><span>Llegadas efectivas λ</span><b class="num">${f1(e.lam)} u/h</b></div>
      <div class="kv"><span>Espera Wq</span><b class="num">${wq(e)} min</b></div>
      <div class="kv"><span>Cola Lq</span><b class="num">${f1(e.Lq)} usuarios</b></div>
      <div class="kv"><span>Ocupación ρ</span><b class="num">${e.stable?pct(e.rho):'≥ 100%'}</b></div>
      <div class="kv"><span>Prob. de esperar</span><b class="num">${pct(e.pw)}</b></div>
      <div class="kv"><span>Atendidos en ≤ 15 min</span><b class="num">${pct(M.sl(e,15))}</b></div></div>
    <div class="box"><span class="t">Capacidad instalada</span>
      <div class="kv"><span>Ventanillas totales</span><b>${s.windows}</b></div>
      <div class="kv"><span>Atendiendo ahora</span><b>${e.c}</b></div>
      <div class="kv"><span>Con novedad</span><b>${e.absent}</b></div>
      <div class="kv"><span>Agentes virtuales recibidos</span><b>${e.v}</b></div>
      <div class="kv"><span>Demanda desviada a virtual</span><b class="num">${f1(e.divert)} u/h</b></div>
      <div class="kv"><span>Ventanillas para SLA</span><b>${e.needC}</b></div></div>
    <div class="box" style="display:flex;flex-direction:column;justify-content:space-between;gap:8px"><div><span class="t">Recomendación algorítmica</span><p style="margin:0">${rec}</p></div>
      <div style="display:grid;gap:6px">${e.status!=='verde'?`<button class="btn pri" data-act="goBal" data-id="${id}">Ver solución de balanceo</button>`:''}<button class="btn" data-act="toQ" data-id="${id}">Analizar en teoría de colas</button></div></div>
  </div>
  <div class="box" style="margin-top:10px"><span class="t">Personal de la sede</span><div class="chips">${staff.map(x=>`<span class="chip">${x.name} · ${x.status}</span>`).join('')}${virt.map(x=>`<span class="chip" style="border-color:var(--accent);color:var(--accent)">+ ${x.name} (virtual)</span>`).join('')}</div></div></section>`;
}
function drawControl(){
  const h=hourly(),lab=HOURS;
  lineChart($('#ch1'),{title:'Demanda y capacidad por hora',xs:HF.map((_,i)=>i),labels:lab,ymax:Math.ceil(Math.max(...h.dem,...h.cap)/50)*50,unit:' u/h',series:[{name:'Demanda λ',color:'var(--c1)',vals:h.dem,area:true},{name:'Capacidad Σ c·μ',color:'var(--c2)',vals:h.cap,dash:true}]});
  lineChart($('#ch2'),{title:'Espera por hora',xs:HF.map((_,i)=>i),labels:lab,ymax:60,unit:' min',ref:{v:15,label:'SLA 15 min'},series:[{name:'Promedio ponderado',color:'var(--c1)',vals:h.wq},{name:'Sede más cargada',color:'var(--c2)',vals:h.worst,dash:true}]});
}
