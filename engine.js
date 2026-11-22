/* Motor Surtigas MOAR: teoría de colas M/M/c (Erlang C), datos y balanceo */
(function (root) {
  const CAP = 60;            // tope de espera mostrada (min) cuando el sistema es inestable
  const MUV = 5;             // usuarios/h que absorbe un agente virtual
  const SLA_WQ = 15, RHO_MAX = 0.85, HOLGURA = 0.5;
  const ACTIVE = ['En Ventanilla', 'Activo'];

  function qm(c, lam, mu) {
    const base = { c, lam, mu };
    if (lam <= 0) return { ...base, rho: 0, pw: 0, Wq: 0, Lq: 0, W: 60 / mu, stable: true };
    if (c <= 0) return { ...base, rho: 1, pw: 1, Wq: CAP, Lq: lam * CAP / 60, W: CAP + 60 / mu, stable: false };
    const a = lam / mu, rho = a / c;
    if (rho >= 1) return { ...base, rho, pw: 1, Wq: CAP, Lq: lam * CAP / 60, W: CAP + 60 / mu, stable: false };
    let B = 1; for (let k = 1; k <= c; k++) B = a * B / (k + a * B);
    const pw = B / (1 - rho * (1 - B));
    const Wq = Math.min(CAP, pw / (c * mu - lam) * 60);
    return { ...base, rho, pw, Wq, Lq: lam * Wq / 60, W: Wq + 60 / mu, stable: true };
  }
  const sl = (q, t) => q.stable ? 1 - q.pw * Math.exp(-(q.c * q.mu - q.lam) * t / 60) : 0;
  function neededC(lam, mu, wq = SLA_WQ, rhoMax = RHO_MAX) {
    for (let c = Math.max(1, Math.ceil(lam / mu)); c < 60; c++) {
      const q = qm(c, lam, mu); if (q.stable && q.Wq <= wq && q.rho <= rhoMax) return c;
    }
    return 60;
  }
  const statusOf = q => (!q.stable || q.Wq > SLA_WQ) ? 'rojo' : (q.Wq >= 10 || q.rho >= RHO_MAX) ? 'amarillo' : 'verde';

  const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const HOUR_F = [0.24, 0.59, 1.0, 1.135, 0.92, 0.70, 0.51, 0.86, 1.03, 0.65, 0.27];

  // sede: [nombre, ciudad, personal, mu, tipo de calibración, objetivo]
  const SEDES_DEF = [
    ['Cartagena - Centro', 'Cartagena', 6, 8, 'wq', 16.5],
    ['Cartagena - Pie de la Popa', 'Cartagena', 3, 8, 'wq', 13.2],
    ['Montería - Principal', 'Montería', 5, 8, 'wq', 17.1],
    ['Sincelejo - Centro', 'Sincelejo', 3, 8, 'rho', 0.62],
    ['Magangué', 'Magangué', 3, 8, 'rho', 0.45],
    ['El Carmen de Bolívar', 'Bolívar', 2, 8, 'rho', 0.41],
    ['Turbaco', 'Bolívar', 2, 8, 'wq', 14.0],
    ['Corozal', 'Sucre', 2, 8, 'rho', 0.58],
    ['Lorica', 'Córdoba', 2, 8, 'wq', 15.8],
    ['Sahagún', 'Córdoba', 2, 8, 'rho', 0.48],
    ['Montelíbano', 'Córdoba', 2, 8, 'rho', 0.67],
    ['Cereté', 'Córdoba', 2, 8, 'wq', 11.2],
    ['Arjona', 'Bolívar', 1, 8, 'rho', 0.38],
    ['Ciénaga de Oro', 'Córdoba', 1, 8, 'rho', 0.44],
  ];
  const NAMES = ['Carlos Mendoza','Ana María Torres','Jorge Luis Ríos','Diana Patricia Gómez','Camilo Andrés Silva','Lucía Fernández','Mateo Gutiérrez','Valentina Ortiz','Santiago Morales','Daniela Castro','Gabriel Martínez','Mariana López','Felipe Vargas','Sofia Hernández','Andrés Felipe Ruiz','Paula Andrea Jaramillo','Diego Alejandro León','Laura Camila Morales','Nicolás Jiménez','Carolina Herrera','Sebastian Ospina','Isabella Gómez','Esteban Ramírez','Manuela Suárez','Samuel David Díaz','Alejandro Aguilar','Valery Vanessa Reyes','Juliana Peña','Tomas Enrique Romero','Salomé Cardona','David Eduardo Navarro','Victoria Eugina Gil','Juan Pablo Molina','Gabriela Restrepo','Emmanuel Cepeda','Sara Lucía Acosta'];

  function buildEmployees() {
    const seq = []; SEDES_DEF.forEach((d, i) => { for (let k = 0; k < d[2]; k++) seq.push(i + 1); });
    const order = NAMES.map((_, i) => i);           // posición -> índice de nombre
    [[0, 17], [5, 20]].forEach(([a, b]) => { const t = order[a]; order[a] = order[b]; order[b] = t; });
    return seq.map((sedeId, pos) => {
      const i = order[pos];
      const virtual = i % 2 === 0 || i % 3 === 0 || i === 5, brilla = i % 3 === 0;
      let status = 'En Ventanilla', target = null;
      if (i === 12) status = 'Incapacidad';
      else if (i === 25) status = 'Permiso';
      else if (pos === 1 || pos === 7) status = 'Almuerzo';
      else if (pos === 14) { status = 'Canal Virtual'; target = 1; }
      return {
        id: 'EMP-' + (101 + i), idx: i, name: NAMES[i], sedeId, target,
        role: brilla ? 'Atención Presencial / Brilla' : virtual ? 'Multiskill (Presencial/Virtual)' : 'Atención Presencial',
        skills: { presencial: true, virtual, brilla, pqr: true }, status, ticket: 'TK-' + (1000 + i),
      };
    });
  }

  function calibrate(emps) {          // devuelve λ base (09:00) por sede
    return SEDES_DEF.map((d, k) => {
      const id = k + 1, mu = d[3];
      const c = emps.filter(e => e.sedeId === id && ACTIVE.includes(e.status)).length;
      const v = emps.filter(e => e.status === 'Canal Virtual' && e.target === id).length;
      let lamEff;
      if (d[4] === 'rho') lamEff = d[5] * c * mu;
      else { let lo = 0, hi = c * mu - 1e-6; for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; qm(c, m, mu).Wq < d[5] ? lo = m : hi = m; } lamEff = (lo + hi) / 2; }
      let lamRaw = lamEff; if (v) lamRaw = lamEff + v * MUV;   // el virtual absorbe v*MUV (< 50% de la demanda)
      return Math.round(lamRaw * 10) / 10;
    });
  }

  function buildSedes(emps) {
    const lam = calibrate(emps);
    return SEDES_DEF.map((d, k) => ({ id: k + 1, name: d[0], city: d[1], windows: d[2], mu: d[3], lam: lam[k], noise: 1 }));
  }

  // Estado derivado de una sede dado el contexto
  function evalSede(s, emps, ctx) {
    const c = emps.filter(e => e.sedeId === s.id && ACTIVE.includes(e.status)).length;
    const v = emps.filter(e => e.status === 'Canal Virtual' && e.target === s.id).length;
    const lamRaw = s.lam * ctx.hf * ctx.mult * s.noise;
    const divert = Math.min(v * MUV, lamRaw * 0.5);
    const q = qm(c, lamRaw - divert, s.mu);
    return { ...q, c, v, lamRaw, divert, status: statusOf(q), needC: neededC(lamRaw - divert, s.mu), absent: emps.filter(e => e.sedeId === s.id && (e.status === 'Incapacidad' || e.status === 'Permiso')).length };
  }

  // Recomendaciones de balanceo para una sede congestionada
  function candidates(sedeId, sedes, emps, ctx) {
    const s = sedes.find(x => x.id === sedeId), before = evalSede(s, emps, ctx);
    const out = [];
    emps.forEach(e => {
      if (e.status === 'Almuerzo' && e.sedeId === sedeId) {
        const trial = emps.map(x => x.id === e.id ? { ...x, status: 'En Ventanilla' } : x);
        const tAfter = evalSede(s, trial, ctx);
        out.push({ type: 'almuerzo', emp: e, donor: null, tBefore: before, tAfter, gain: before.Wq - tAfter.Wq, cost: 0 });
        return;
      }
      if (!ACTIVE.includes(e.status) || !e.skills.virtual || e.sedeId === sedeId) return;
      const ds = sedes.find(x => x.id === e.sedeId);
      const dBefore = evalSede(ds, emps, ctx);
      if (dBefore.c < 2) return;
      const trial = emps.map(x => x.id === e.id ? { ...x, status: 'Canal Virtual', target: sedeId } : x);
      const dAfter = evalSede(ds, trial, ctx), tAfter = evalSede(s, trial, ctx);
      if (!dAfter.stable || dAfter.Wq > 12 || dAfter.rho > RHO_MAX + 0.05) return;
      if (dBefore.rho >= HOLGURA + 0.3 && dAfter.Wq > 10) return;
      out.push({ type: 'virtual', emp: e, donor: ds, dBefore, dAfter, tBefore: before, tAfter, gain: before.Wq - tAfter.Wq, cost: dAfter.Wq - dBefore.Wq });
    });
    out.sort((a, b) => (b.gain - b.cost * 0.7) - (a.gain - a.cost * 0.7));
    return out;
  }

  root.MOAR = { qm, sl, neededC, statusOf, evalSede, candidates, buildEmployees, buildSedes, HOURS, HOUR_F, CAP, MUV, SLA_WQ, RHO_MAX, HOLGURA, ACTIVE };
  if (typeof module !== 'undefined') module.exports = root.MOAR;
})(typeof window !== 'undefined' ? window : globalThis);
