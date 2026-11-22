/* Estado global, constantes y utilidades (KPIs, toast, bitácora) */
'use strict';
const M=window.MOAR, HOURS=M.HOURS, HF=M.HOUR_F;
const $=s=>document.querySelector(s);
const f1=n=>(Math.round(n*10)/10).toFixed(1), pct=n=>Math.round(n*100)+'%';
const wq=e=>e.stable?f1(e.Wq):'≥60';
const ST={rojo:'Crítico',amarillo:'Alerta',verde:'Normal'};
const TABS=[['control','Centro de control'],['colas','Teoría de colas'],['personal','Personal'],['balanceo','Canal virtual'],['sim','Simulador']];
const S={tab:'control',hour:2,mult:1,live:false,sel:null,q:'',filt:'ALL',pick:{},log:[],qt:{lam:28,mu:8,c:4},qtSede:'',novEmp:'',novTipo:'Incapacidad'};
let base=null,liveTimer=null,toastTimer=null;

function reset(){S.emps=JSON.parse(JSON.stringify(base.emps));S.sedes=JSON.parse(JSON.stringify(base.sedes));S.hour=2;S.mult=1;S.log=[];S.pick={};S.sel=null}
const ctx=()=>({hf:HF[S.hour],mult:S.mult});
const evS=s=>M.evalSede(s,S.emps,ctx());
const evs=()=>S.sedes.map(s=>({s,e:evS(s)}));
const sedeOf=id=>S.sedes.find(x=>x.id===id);
const empOf=id=>S.emps.find(x=>x.id===id);
const now=()=>new Date().toLocaleTimeString('es-CO',{hour12:true});
function logAdd(msg){S.log.unshift({t:now(),msg});S.log=S.log.slice(0,40)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,5200)}
function sys(list){ // KPIs globales
  let lam=0,cap=0,wqs=0,lq=0,sla=0,crit=0;
  list.forEach(({e})=>{lam+=e.lam;cap+=e.c*e.mu;wqs+=e.lam*e.Wq;lq+=e.Lq;sla+=e.lam*M.sl(e,15);if(e.status==='rojo')crit++});
  return{lam,cap,wq:lam?wqs/lam:0,rho:cap?lam/cap:0,lq,sla:lam?sla/lam:1,crit};
}
