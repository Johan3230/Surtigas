/* Pestaña 2: Teoría de colas */
'use strict';
/* ---------- Pestaña 2: Teoría de colas ---------- */
function viewColas(){
  const q=S.qt;
  return `<section class="card"><h2>Simulador de teoría de colas M/M/c (Erlang C)</h2><p class="sub">Mueva los parámetros y vea el comportamiento exacto de la cola. También puede cargar la situación real de una sede.</p></section>
  <div class="two"><section class="card"><h3 style="margin-bottom:10px">Parámetros</h3>
    <div class="field"><label for="qsede">Cargar desde una sede</label><select id="qsede" data-in="qsede"><option value="">— Valores manuales —</option>${S.sedes.map(s=>`<option value="${s.id}" ${String(S.qtSede)===String(s.id)?'selected':''}>${s.name}</option>`).join('')}</select></div>
    <div class="slider"><div class="row"><label for="qlam">Tasa de llegadas (λ)</label><b id="vlam">${q.lam} u/h</b></div><input id="qlam" type="range" min="1" max="120" value="${q.lam}" data-in="qt" data-k="lam"></div>
    <div class="slider"><div class="row"><label for="qmu">Atención por ventanilla (μ)</label><b id="vmu">${q.mu} u/h</b></div><input id="qmu" type="range" min="2" max="20" value="${q.mu}" data-in="qt" data-k="mu"></div>
    <div class="slider"><div class="row"><label for="qc">Ventanillas atendiendo (c)</label><b id="vc">${q.c}</b></div><input id="qc" type="range" min="1" max="12" value="${q.c}" data-in="qt" data-k="c"></div>
    <div class="note"><b>Umbrales SLA Surtigas</b><br>Wq máximo: 15 min · Ocupación máxima ρ: 85% · Holgura (ρ &lt; 50%): habilita ceder agentes al canal virtual.</div>
    <div class="note"><span class="f">ρ = λ / (c·μ)<br>P(esperar) = Erlang C(c, λ/μ)<br>Wq = P(esperar) / (c·μ − λ)<br>Lq = λ·Wq   ·   W = Wq + 1/μ</span></div></section>
  <section class="card"><h3 style="margin-bottom:10px">Métricas resultantes</h3><div id="qout"></div></section></div>
  <div class="two"><section class="card"><h3>Espera según la demanda</h3><p class="sub">Con c y μ actuales. La curva se dispara al acercarse a ρ = 100%.</p><div id="qc1"></div></section>
  <section class="card"><h3>Espera según ventanillas</h3><p class="sub">Con λ y μ actuales. Muestra cuántas ventanillas cumplen el SLA.</p><div id="qc2"></div></section></div>`;
}
function drawColas(){
  const {lam,mu,c}=S.qt,q=M.qm(c,lam,mu),need=M.neededC(lam,mu);
  $('#vlam').textContent=lam+' u/h';$('#vmu').textContent=mu+' u/h';$('#vc').textContent=c;
  const met=(l,v,cls)=>`<div class="met"><span>${l}</span><b class="num ${cls||''}">${v}</b></div>`;
  $('#qout').innerHTML=`<div class="mets">${met('Ocupación (ρ)',q.stable?pct(q.rho):'≥ 100%',q.rho>M.RHO_MAX?'t-warn':'t-ok')}${met('Espera (Wq)',q.stable?f1(q.Wq)+' min':'≥ 60 min',q.Wq>15?'t-crit':'t-ok')}${met('Cola (Lq)',f1(q.Lq))}${met('En sistema (W)',q.stable?f1(q.W)+' min':'—')}${met('Prob. de esperar',pct(q.pw))}${met('Atendidos ≤ 15 min',pct(M.sl(q,15)),M.sl(q,15)<.9?'t-warn':'t-ok')}</div>
  ${!q.stable?`<div class="alert">Sistema inestable: la demanda (${lam} u/h) supera la capacidad (${c*mu} u/h). La cola crece sin límite.</div>`:q.Wq>15?`<div class="alert">Trigger activo: Wq supera 15 min. Dispara la recomendación de redistribución.</div>`:''}
  <div class="note">Ventanillas mínimas para cumplir SLA (Wq ≤ 15 min y ρ ≤ 85%): <b>${need}</b> ${need>c?`(faltan ${need-c})`:need<c?`(sobran ${c-need})`:'(justo las necesarias)'}.${q.stable&&q.rho<M.HOLGURA?' Hay holgura (ρ &lt; 50%): podría ceder agentes al canal virtual.':''}</div>`;
  const mx=Math.max(lam*1.5,c*mu*1.15,20),xs=[],v=[];for(let i=0;i<=48;i++){const x=1+(mx-1)*i/48;xs.push(x);v.push(M.qm(c,x,mu).Wq)}
  lineChart($('#qc1'),{title:'Wq contra λ',xs,ymax:60,unit:' min',xname:'λ',xtitle:'λ (u/h)',ref:{v:15,label:'SLA 15 min'},series:[{name:'Wq',color:'var(--c1)',vals:v,area:true}],marker:{x:Math.min(lam,mx),y:q.Wq,label:'actual '+(q.stable?f1(q.Wq):'≥60')+' min'}});
  const xc=[],vc=[];for(let i=1;i<=12;i++){xc.push(i);vc.push(M.qm(i,lam,mu).Wq)}
  lineChart($('#qc2'),{title:'Wq contra ventanillas',xs:xc,labels:xc.map(String),ymax:60,unit:' min',xname:'c',xtitle:'ventanillas',ref:{v:15,label:'SLA 15 min'},series:[{name:'Wq',color:'var(--c1)',vals:vc,area:true}],marker:{x:c,y:q.Wq,label:'c = '+c},maxTicks:12});
}
