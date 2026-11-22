/* Gráfico de líneas SVG con hover */
'use strict';
/* ---------- gráfico de líneas SVG con hover ---------- */
function lineChart(el,cfg){
  const W=640,H=cfg.h||210,L=38,R=14,T=12,B=26,xs=cfg.xs;
  const xmin=xs[0],xmax=xs[xs.length-1];
  let ymax=cfg.ymax;if(!ymax){let m=Math.max(...cfg.series.flatMap(s=>s.vals),cfg.ref?cfg.ref.v:0)*1.12;const p=Math.pow(10,Math.floor(Math.log10(m||1)));ymax=Math.ceil(m/p*2)/2*p||1}
  const sx=x=>L+(x-xmin)/((xmax-xmin)||1)*(W-L-R), sy=y=>T+(1-Math.min(y,ymax)/ymax)*(H-T-B);
  let g='';
  for(let i=0;i<=4;i++){const v=ymax*i/4,y=sy(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L-6}" y="${y+3}" text-anchor="end">${v%1?v.toFixed(1):v}</text>`}
  const step=cfg.labels?Math.ceil(xs.length/ (cfg.maxTicks||8)):1;
  if(cfg.labels){xs.forEach((x,i)=>{if(i%step===0)g+=`<text x="${sx(x)}" y="${H-8}" text-anchor="middle">${cfg.labels[i]}</text>`})}
  else{for(let i=0;i<=5;i++){const v=xmin+(xmax-xmin)*i/5;g+=`<text x="${sx(v)}" y="${H-8}" text-anchor="middle">${Math.round(v)}</text>`}}
  if(cfg.xtitle)g+=`<text x="${W-R}" y="${H-1}" text-anchor="end">${cfg.xtitle}</text>`;
  if(cfg.ref)g+=`<line x1="${L}" x2="${W-R}" y1="${sy(cfg.ref.v)}" y2="${sy(cfg.ref.v)}" stroke="var(--crit)" stroke-dasharray="5 4"/><text x="${W-R}" y="${sy(cfg.ref.v)-4}" text-anchor="end" style="fill:var(--crit)">${cfg.ref.label}</text>`;
  let paths='';
  cfg.series.forEach(s=>{
    const d=xs.map((x,i)=>(i?'L':'M')+sx(x).toFixed(1)+' '+sy(s.vals[i]).toFixed(1)).join('');
    if(s.area)paths+=`<path d="${d}L${sx(xmax)} ${sy(0)}L${sx(xmin)} ${sy(0)}Z" fill="${s.color}" opacity=".13"/>`;
    paths+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="6 4"':''} stroke-linejoin="round"/>`;
  });
  let mk='';
  if(cfg.marker){const m=cfg.marker;mk=`<circle cx="${sx(m.x)}" cy="${sy(m.y)}" r="5" fill="${cfg.series[0].color}" stroke="var(--surface)" stroke-width="2"/><text x="${Math.min(sx(m.x)+8,W-R-60)}" y="${Math.max(sy(m.y)-8,T+8)}" style="fill:var(--fg);font-weight:600">${m.label}</text>`}
  const legend=cfg.series.length>1?`<div class="legend" style="margin-bottom:6px">${cfg.series.map(s=>`<span><i class="sw ${s.dash?'dash':''}" style="border-color:${s.color}"></i>${s.name}</span>`).join('')}</div>`:'';
  el.innerHTML=`${legend}<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title}">${g}${paths}${mk}<line id="vl" y1="${T}" y2="${H-B}" stroke="var(--muted)" visibility="hidden"/><g id="dots"></g><rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent" id="hit"/></svg><div class="tip" hidden></div></div>`;
  const svg=el.querySelector('svg'),tip=el.querySelector('.tip'),vl=svg.querySelector('#vl'),dots=svg.querySelector('#dots');
  const move=ev=>{
    const r=svg.getBoundingClientRect(),vx=(ev.clientX-r.left)/r.width*W;
    let bi=0,bd=1e9;xs.forEach((x,i)=>{const d=Math.abs(sx(x)-vx);if(d<bd){bd=d;bi=i}});
    const x=sx(xs[bi]);vl.setAttribute('x1',x);vl.setAttribute('x2',x);vl.setAttribute('visibility','visible');
    dots.innerHTML=cfg.series.map(s=>`<circle cx="${x}" cy="${sy(s.vals[bi])}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    tip.hidden=false;tip.style.left=Math.max(14,Math.min(86,x/W*100))+'%';
    tip.innerHTML=`<b>${cfg.labels?cfg.labels[bi]:(cfg.xname||'x')+' = '+xs[bi].toFixed(0)}</b>`+cfg.series.map(s=>`<span style="color:${s.color}">●</span> ${s.name}: <b style="display:inline">${f1(s.vals[bi])}${cfg.unit||''}</b>`).join('<br>');
  };
  const hit=svg.querySelector('#hit');
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerdown',move);
  hit.addEventListener('pointerleave',()=>{tip.hidden=true;vl.setAttribute('visibility','hidden');dots.innerHTML=''});
}
