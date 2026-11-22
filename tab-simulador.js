/* Pestaña 5: Simulador */
'use strict';
/* ---------- Pestaña 5: Simulador ---------- */
function viewSim(){
  const presets=[['Día normal',1],['Quincena',1.3],['Día de corte',1.6],['Vencimiento',2]];
  return `<section class="card"><h2>Simulador intradía y picos de demanda</h2><p class="sub">Cambie la franja y la afluencia: todo el sistema (centro de control, balanceo) se recalcula con esos valores.</p></section>
  <section class="card"><div class="field"><span>Franja horaria</span></div><div class="hours" id="hrs">${HOURS.map((h,i)=>`<button data-act="hour" data-i="${i}" aria-pressed="${S.hour===i}">${h}</button>`).join('')}</div>
  <div style="height:14px"></div><div class="field"><span>Escenario de afluencia</span></div><div class="presets" id="presets">${presets.map(p=>`<button data-act="preset" data-v="${p[1]}" aria-pressed="${Math.abs(S.mult-p[1])<.01}">${p[0]} ${Math.round(p[1]*100)}%</button>`).join('')}</div>
  <div class="slider"><div class="row"><label for="mult">Aumento de demanda intradía</label><b id="vmult">${Math.round(S.mult*100)}%</b></div><input id="mult" type="range" min="0.8" max="2" step="0.1" value="${S.mult}" data-in="mult"></div>
  <button class="btn" data-act="resetSim">Volver a 09:00 · 100%</button></section>
  <div id="simout"></div>`;
}
function drawSim(){
  const list=evs(),k=sys(list),extra=list.reduce((a,{e})=>a+Math.max(0,e.needC-e.c),0);
  const ref0={hf:HF[2],mult:1};
  const mx=Math.max(30,...list.map(({e})=>e.Wq));
  $('#vmult').textContent=Math.round(S.mult*100)+'%';
  $('#simout').innerHTML=`<div class="kpis">
   <div class="kpi"><div class="l">Franja simulada</div><div class="v num">${HOURS[S.hour]}</div><div class="n muted">demanda ×${S.mult.toFixed(1)} · factor horario ${HF[S.hour].toFixed(2)}</div></div>
   <div class="kpi"><div class="l">Espera promedio</div><div class="v num">${f1(k.wq)} <small>min</small></div><div class="n ${k.wq>15?'t-crit':'t-ok'}">${k.wq>15?'Excede 15 min':'Dentro del SLA'}</div></div>
   <div class="kpi"><div class="l">Sedes críticas</div><div class="v num">${k.crit} <small>/ 14</small></div><div class="n ${k.crit?'t-crit':'t-ok'}">${k.crit?'Requieren acción':'Sin triggers'}</div></div>
   <div class="kpi"><div class="l">Cumplimiento SLA</div><div class="v num">${pct(k.sla)}</div><div class="n muted">atendidos en ≤ 15 min</div></div>
   <div class="kpi"><div class="l">Refuerzo requerido</div><div class="v num">${extra} <small>ventanillas</small></div><div class="n muted">para cumplir SLA en todas las sedes</div></div></div>
  <section class="card"><h3>Espera Wq por sede</h3><p class="sub">Barras ordenadas por sede. La línea punteada marca los 15 minutos del SLA.</p><div class="bars" style="margin-top:10px">${list.map(({s,e})=>`<div class="bar"><span class="nm" title="${s.name}">${s.name}</span><div class="tr"><div class="fl ${e.status}" style="width:${Math.min(100,e.Wq/mx*100)}%"></div><div class="ref" style="left:${15/mx*100}%"></div></div><b class="num" style="text-align:right">${wq(e)} min</b></div>`).join('')}</div></section>
  <div class="tbl"><table><thead><tr><th>Sede</th><th class="r">λ (u/h)</th><th class="r">Ventanillas</th><th class="r">ρ</th><th class="r">Wq (min)</th><th class="r">Δ vs. base</th><th>Estado</th><th class="r">Refuerzo</th></tr></thead><tbody>${list.map(({s,e})=>{const b=M.evalSede(s,S.emps,ref0),d=e.Wq-b.Wq;return `<tr><td><b>${s.name}</b></td><td class="r num">${f1(e.lam)}</td><td class="r num">${e.c}</td><td class="r num">${e.stable?pct(e.rho):'≥100%'}</td><td class="r num">${wq(e)}</td><td class="r num ${d>0.05?'t-crit':d<-0.05?'t-ok':''}">${d>0?'+':''}${f1(d)}</td><td><span class="pill ${e.status}">${ST[e.status]}</span></td><td class="r num">${e.needC>e.c?'+'+(e.needC-e.c):'—'}</td></tr>`}).join('')}</tbody></table></div>`;
}
