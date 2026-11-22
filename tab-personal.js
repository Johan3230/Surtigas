/* Pestaña 3: Personal (incluye modal de novedades) */
'use strict';
/* ---------- Pestaña 3: Personal ---------- */
const AUS=['Incapacidad','Permiso'];
function empLoad(e,emap){
  if(e.status==='En Ventanilla'||e.status==='Activo'){const r=emap[e.sedeId];return r.stable?Math.max(5,Math.min(99,Math.round(r.rho*100)+((e.idx*7)%11)-5)):99}
  if(e.status==='Canal Virtual'){const r=emap[e.target],v=r.v||1;return Math.min(99,Math.round(r.divert/(v*M.MUV)*100))}
  return null;
}
function empList(){
  const emap={};S.sedes.forEach(s=>emap[s.id]=evS(s));
  const q=S.q.toLowerCase();
  return S.emps.filter(e=>{
    const sn=sedeOf(e.sedeId).name.toLowerCase();
    return (e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q)||sn.includes(q))&&(S.filt==='ALL'||e.status===S.filt);
  }).map(e=>({e,l:empLoad(e,emap)}));
}
function spill(st){return `<span class="pill ${AUS.includes(st)?'rojo':st==='Almuerzo'?'amarillo':st==='Canal Virtual'?'gris':'verde'}">${st}</span>`}
function empHtml(){
  const rows=empList();if(!rows.length)return '<div class="empty">Ningún colaborador coincide con el filtro.</div>';
  const dest=e=>e.status==='Canal Virtual'?` → ${sedeOf(e.target).name}`:'';
  const act=e=>`<button class="btn" data-act="nov" data-id="${e.id}">Novedad</button>${e.status!=='En Ventanilla'?`<button class="btn pri" data-act="back" data-id="${e.id}">Reintegrar</button>`:''}`;
  return `<div class="desk"><div class="tbl"><table><thead><tr><th>ID / Nombre</th><th>Sede</th><th>Habilidades</th><th>Estado</th><th>Atendiendo</th><th class="r">Carga ρ</th><th></th></tr></thead><tbody>${rows.map(({e,l})=>`<tr><td><b>${e.name}</b><br><span class="muted">${e.id} · ${e.role}</span></td><td>${sedeOf(e.sedeId).name}${dest(e)}</td><td>${e.skills.presencial?'<span class="pill gris">Presencial</span> ':''}${e.skills.virtual?'<span class="pill verde">Virtual</span> ':''}${e.skills.brilla?'<span class="pill amarillo">Brilla</span>':''}</td><td>${spill(e.status)}</td><td class="num">${e.status==='En Ventanilla'||e.status==='Canal Virtual'?e.ticket:'-'}</td><td class="r num">${l===null?'-':l+'%'}</td><td style="white-space:nowrap">${act(e)}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="mob card" style="padding:0">${rows.map(({e,l})=>`<div class="ecard"><div class="row"><div><b>${e.name}</b><div class="muted" style="font-size:11px">${e.id}</div></div>${spill(e.status)}</div><div class="foot"><span>${sedeOf(e.sedeId).name}${dest(e)}</span><span>ρ: <strong>${l===null?'N/A':l+'%'}</strong></span></div><div class="chips">${act(e)}</div></div>`).join('')}</div>`;
}
function viewPersonal(){
  const cnt=st=>S.emps.filter(e=>e.status===st).length;
  const sts=['En Ventanilla','Canal Virtual','Almuerzo','Incapacidad','Permiso'];
  return `<section class="card"><div class="sec-h" style="margin:0"><div><h2>Matriz de colaboradores · 36 agentes</h2><p class="sub">Registre una novedad y el sistema recalcula de inmediato la cola de la sede afectada.</p></div><button class="btn warn" data-act="nov" data-id="">Registrar novedad</button></div></section>
  <div class="chips" id="stchips">${statChips()}</div>
  <div class="filters"><input type="text" id="esearch" placeholder="Buscar por nombre, ID o sede..." value="${S.q}" data-in="search" aria-label="Buscar colaborador"><select id="efilt" data-in="filt" aria-label="Filtrar por estado"><option value="ALL">Todos los estados</option>${sts.map(s=>`<option ${S.filt===s?'selected':''}>${s}</option>`).join('')}</select></div>
  <div id="emps">${empHtml()}</div>`;
}
function statChips(){
  const sts=['En Ventanilla','Canal Virtual','Almuerzo','Incapacidad','Permiso'];
  return `<button class="chip" data-act="filt" data-st="ALL" aria-pressed="${S.filt==='ALL'}">Todos ${S.emps.length}</button>`+sts.map(s=>`<button class="chip" data-act="filt" data-st="${s}" aria-pressed="${S.filt===s}">${s} ${S.emps.filter(e=>e.status===s).length}</button>`).join('');
}
function openModal(id){
  S.novEmp=id||'';const m=$('#modal');m.hidden=false;
  m.innerHTML=`<div class="modal" data-act="closeM"><form class="card" id="novform" role="dialog" aria-modal="true" aria-label="Registrar novedad"><h2>Registrar novedad de personal</h2><p class="sub" style="margin-bottom:12px">El sistema recalcula Wq, Lq y ρ de la sede al guardar.</p>
  <div class="field"><label for="nemp">Colaborador</label><select id="nemp" required><option value="">— Seleccionar agente (36) —</option>${S.emps.map(e=>`<option value="${e.id}" ${e.id===S.novEmp?'selected':''}>${e.name} · ${sedeOf(e.sedeId).name} · ${e.status}</option>`).join('')}</select></div>
  <div class="field"><label for="ntipo">Tipo de novedad</label><select id="ntipo"><option value="Incapacidad">Incapacidad médica</option><option value="Permiso">Permiso / licencia</option><option value="Almuerzo">Ventana de almuerzo</option></select></div>
  <div class="chips" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="closeM2">Cancelar</button><button type="submit" class="btn pri">Guardar y recalcular</button></div></form></div>`;
  $('#nemp').focus();
}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
function setStatus(emp,status,target){emp.status=status;emp.target=target||null}
function describe(sedeIds,fn){
  const ids=[...new Set(sedeIds)],b=ids.map(id=>evS(sedeOf(id)));fn();
  return ids.map((id,i)=>{const a=evS(sedeOf(id));return `${sedeOf(id).name}: Wq ${wq(b[i])} → ${wq(a)} min`}).join(' · ');
}
