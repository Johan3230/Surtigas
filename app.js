/* Render principal, eventos e inicialización */
'use strict';
/* ---------- render ---------- */
function renderHeader(){
  const k=sys(evs());
  $('#slot').textContent=`Franja ${HOURS[S.hour]} · demanda ×${S.mult.toFixed(1)}`;
  const bal=S.tab; const tabs=$('#tabs');
  tabs.innerHTML=TABS.map(([id,l],i)=>`<button role="tab" data-act="tab" data-id="${id}" aria-selected="${S.tab===id}">${i+1}. ${l}${id==='balanceo'&&k.crit?`<span class="badge">${k.crit}</span>`:''}</button>`).join('');
}
function render(){
  renderHeader();
  const v=$('#view');
  v.innerHTML=({control:viewControl,colas:viewColas,personal:viewPersonal,balanceo:viewBalanceo,sim:viewSim})[S.tab]();
  if(S.tab==='control')drawControl();
  if(S.tab==='colas')drawColas();
  if(S.tab==='sim')drawSim();
}
function go(tab){S.tab=tab;if(location.hash!=='#'+tab)history.replaceState(null,'','#'+tab);render();window.scrollTo({top:0})}

/* ---------- eventos ---------- */
document.addEventListener('click',ev=>{
  const t=ev.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act,id=t.dataset.id;
  if(a==='closeM'){if(ev.target===t)closeModal();return}
  if(a==='closeM2'){closeModal();return}
  if(a==='tab')go(id);
  else if(a==='sel'){S.sel=S.sel===+id?null:+id;render();if(S.sel)$('#detail')?.scrollIntoView({behavior:'smooth',block:'nearest'})}
  else if(a==='goBal'){go('balanceo')}
  else if(a==='toQ'){const e=evS(sedeOf(+id));S.qtSede=id;S.qt={lam:Math.max(1,Math.min(120,Math.round(e.lam))),mu:sedeOf(+id).mu,c:Math.max(1,Math.min(12,e.c))};go('colas')}
  else if(a==='live'){S.live=!S.live;t.setAttribute('aria-pressed',S.live);clearInterval(liveTimer);if(S.live){liveTimer=setInterval(tick,3000);toast('Modo en vivo: la demanda de cada sede varía cada 3 segundos.')}}
  else if(a==='batch'){const b=$('#batchBtn');b.disabled=true;b.textContent='⚡ Optimizando…';setTimeout(()=>{b.disabled=false;b.textContent='⚡ Batch 06:00 AM';batch()},500)}
  else if(a==='phone'){const on=!$('#app').classList.contains('phone');$('#app').classList.toggle('phone',on);t.setAttribute('aria-pressed',on)}
  else if(a==='theme'){const r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.dataset.theme=dark?'light':'dark';render()}
  else if(a==='filt'){S.filt=t.dataset.st;$('#efilt').value=S.filt;$('#stchips').innerHTML=statChips();$('#emps').innerHTML=empHtml()}
  else if(a==='nov')openModal(id);
  else if(a==='back'){
    const e=empOf(id),was=e.status,tg=e.target;
    const t2=describe([e.sedeId,...(tg?[tg]:[])],()=>setStatus(e,'En Ventanilla'));
    logAdd(`${e.name} vuelve a ventanilla (antes: ${was}). ${t2}`);toast(`${e.name} reintegrado. ${t2}`);render();
  }
  else if(a==='exec'){
    const sid=+id,top=M.candidates(sid,S.sedes,S.emps,ctx()).filter(c=>c.gain>.3),c=top.find(x=>x.emp.id===S.pick[sid])||top[0];
    if(c){const tx=applyCand(c,sid);toast('Ejecutado. '+tx);render()}
  }
  else if(a==='resetAll'){reset();render();toast('Datos restablecidos al estado inicial.')}
  else if(a==='hour'){S.hour=+t.dataset.i;render()}
  else if(a==='preset'){S.mult=+t.dataset.v;render()}
  else if(a==='resetSim'){S.hour=2;S.mult=1;S.sedes.forEach(s=>s.noise=1);render()}
});
document.addEventListener('input',ev=>{
  const t=ev.target,k=t.dataset.in;if(!k)return;
  if(k==='qt'){S.qt[t.dataset.k]=+t.value;S.qtSede='';$('#qsede').value='';drawColas()}
  else if(k==='mult'){S.mult=+t.value;renderHeader();drawSim();document.querySelectorAll('#presets button').forEach(b=>b.setAttribute('aria-pressed',Math.abs(S.mult-+b.dataset.v)<.01))}
  else if(k==='search'){S.q=t.value;$('#emps').innerHTML=empHtml()}
});
document.addEventListener('change',ev=>{
  const t=ev.target,k=t.dataset.in;if(!k)return;
  if(k==='qsede'){S.qtSede=t.value;if(t.value){const s=sedeOf(+t.value),e=evS(s);S.qt={lam:Math.max(1,Math.min(120,Math.round(e.lam))),mu:s.mu,c:Math.max(1,Math.min(12,e.c))}}render()}
  else if(k==='filt'){S.filt=t.value;$('#stchips').innerHTML=statChips();$('#emps').innerHTML=empHtml()}
  else if(k==='pick'){S.pick[+t.dataset.id]=t.value;render()}
});
document.addEventListener('submit',ev=>{
  if(ev.target.id!=='novform')return;ev.preventDefault();
  const e=empOf($('#nemp').value);if(!e)return;const tipo=$('#ntipo').value,was=e.status,tg=e.target;
  const tx=describe([e.sedeId,...(tg?[tg]:[])],()=>setStatus(e,tipo));
  logAdd(`Novedad registrada: ${e.name} → ${tipo} (antes: ${was}). ${tx}`);closeModal();toast(`${e.name}: ${tipo}. ${tx}`);render();
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#modal').hidden)closeModal()});
function tick(){
  S.sedes.forEach(s=>{s.noise=Math.max(.85,Math.min(1.25,s.noise+(Math.random()-.5)*.1))});
  if(['control','balanceo','sim'].includes(S.tab)&&$('#modal').hidden){
    const y=window.scrollY;render();window.scrollTo(0,y);
  }
}
setInterval(()=>{$('#clk').textContent=now()},1000);
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h)&&h!==S.tab){S.tab=h;render()}});

const emps=M.buildEmployees();base={emps,sedes:M.buildSedes(emps)};reset();
const h0=location.hash.slice(1);if(TABS.some(t=>t[0]===h0))S.tab=h0;
$('#clk').textContent=now();
render();
window.__S=S;
