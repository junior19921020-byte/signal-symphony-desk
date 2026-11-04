import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoLoginGate } from "@/components/DemoLoginGate";

/** Architectural shell only. No trading, auth, or Phaser state is modified. */
function ArchitectureShell() {
  const iso = (u: number, v: number) => ({ x: 550 + (u - v) * 35, y: 112 + (u + v) * 18 });
  const poly = (pts: { x: number; y: number }[]) => pts.map(p => `${p.x},${p.y}`).join(" ");
  const room = (u: number, v: number) => {
    if (u < 4 && v < 4) return "diretoria";
    if (u < 4 && v >= 4) return "pesquisa";
    if (u >= 4 && v < 4) return "trading";
    if (u >= 8 && v >= 8) return "entrada";
    if (u >= 8 && v >= 4) return "recepcao";
    if (u >= 4 && v >= 8) return "risco";
    return "central";
  };
  const palette: Record<string, [string, string]> = {
    diretoria: ["#b68a58", "#c69a66"], pesquisa: ["#8b939e", "#9aa3ad"],
    trading: ["#7d8c9b", "#8998a7"], recepcao: ["#c38b55", "#d19c63"],
    risco: ["#bc8958", "#ca9767"], entrada: ["#536275", "#5d6d80"],
    central: ["#38485d", "#40516a"],
  };
  const tiles = Array.from({ length: 144 }, (_, i) => {
    const u = i % 12, v = Math.floor(i / 12), p = iso(u, v);
    return { key: i, points: poly([p, iso(u + 1, v), iso(u + 1, v + 1), iso(u, v + 1)]),
      color: palette[room(u, v)][(u + v) % 2] };
  });
  // A partition is a true isometric segment with glass height, not a screen-space rectangle.
  const glass = (a: [number, number], b: [number, number], key: string) => {
    const p = iso(...a), q = iso(...b), h = 65;
    return <g key={key}>
      <polygon points={poly([p,q,{x:q.x,y:q.y-h},{x:p.x,y:p.y-h}])} fill="#74c9ed" fillOpacity=".22" stroke="#b5d9eb" strokeWidth="3"/>
      <line x1={p.x} y1={p.y-h} x2={q.x} y2={q.y-h} stroke="#dce9f3" strokeWidth="5"/>
      <line x1={p.x} y1={p.y-30} x2={q.x} y2={q.y-30} stroke="#7bb5d3" strokeWidth="2" opacity=".65"/>
      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#334155" strokeWidth="6"/>
    </g>;
  };
  const walls: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    // Back exterior walls with vertical glazing.
    for (const [a,b] of [[[0,i],[0,i+1]],[[i,0],[i+1,0]]] as [[number,number],[number,number]][]) {
      const p=iso(...a),q=iso(...b),h=88;
      walls.push(<g key={`outer-${a.join("-")}-${b.join("-")}`}>
        <polygon points={poly([p,q,{x:q.x,y:q.y-h},{x:p.x,y:p.y-h}])} fill="#576778" stroke="#c9d3df" strokeWidth="3"/>
        <polygon points={poly([{x:p.x,y:p.y-15},{x:q.x,y:q.y-15},{x:q.x,y:q.y-h+12},{x:p.x,y:p.y-h+12}])} fill="#70b8e8" fillOpacity=".7"/>
        <line x1={p.x} y1={p.y-h} x2={q.x} y2={q.y-h} stroke="#e2e8f0" strokeWidth="6"/>
      </g>);
    }
  }
  // Gaps at indices 5 and 6 are doorways, reserved for automatic doors later.
  for (const axis of ["u","v"] as const) for (const n of [4,8]) for (let i=0;i<12;i++) {
    if (i===5 || i===6) continue;
    const a: [number,number] = axis==="u" ? [n,i] : [i,n];
    const b: [number,number] = axis==="u" ? [n,i+1] : [i+1,n];
    walls.push(glass(a,b,`${axis}-${n}-${i}`));
  }
  const signs = [
    {title:"DIRETORIA",u:1.7,v:1.7},{title:"PESQUISA & NOTÍCIAS",u:1.8,v:8.4},
    {title:"TRADING",u:8.4,v:1.8},{title:"RECEPÇÃO",u:9.7,v:6.4},
    {title:"GESTÃO DE RISCO",u:6.4,v:9.7},{title:"HALL CENTRAL",u:6,v:6},
  ];
  return <svg viewBox="0 0 1100 730" role="img" aria-label="Modelo arquitetônico isométrico de toda a empresa, sem móveis" className="h-auto w-full">
    <defs>
      <linearGradient id="shell-bg" x2="0" y2="1"><stop stopColor="#091427"/><stop offset="1" stopColor="#162238"/></linearGradient>
      <filter id="shell-glow"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect width="1100" height="730" fill="url(#shell-bg)"/>
    <text x="40" y="44" fill="#e2e8f0" fontSize="22" fontWeight="bold">SIGNAL SYMPHONY DESK</text>
    <text x="40" y="70" fill="#7dd3fc" fontSize="15">ETAPA 1 — ARQUITETURA COMPLETA • SEM MOBILIÁRIO</text>
    <polygon points={poly([iso(0,0),iso(12,0),iso(12,12),iso(0,12)])} fill="#111827" stroke="#1e3a5f" strokeWidth="20"/>
    {tiles.map(t=><polygon key={t.key} points={t.points} fill={t.color} stroke="#a8b5c5" strokeOpacity=".24" strokeWidth="1"/>)}
    <polygon points={poly([iso(4,4),iso(8,4),iso(8,8),iso(4,8)])} fill="none" stroke="#22c7ff" strokeWidth="4" opacity=".85"/>
    <polygon points={poly([iso(4,4),iso(8,4),iso(8,8),iso(4,8)])} fill="none" stroke="#22c7ff" strokeWidth="11" opacity=".3" filter="url(#shell-glow)"/>
    {walls}
    {signs.map(s=>{const p=iso(s.u,s.v);return <g key={s.title}>
      <rect x={p.x-91} y={p.y-15} width="182" height="29" rx="5" fill="#0b1525" fillOpacity=".93" stroke="#38bdf8" strokeOpacity=".75"/>
      <text x={p.x} y={p.y+4} textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">{s.title}</text>
    </g>;})}
    <text x="550" y="668" textAnchor="middle" fill="#93c5fd" fontSize="17">ENTRADA PRINCIPAL • ACESSO AO HALL</text>
    <text x="550" y="696" textAnchor="middle" fill="#94a3b8" fontSize="13">Paredes, pisos e divisórias primeiro. Portas, móveis e agentes serão integrados depois.</text>
  </svg>;
}

export const Route = createFileRoute("/architecture-preview")({
  head: () => ({ meta: [{ title: "Arquitetura | Signal Symphony Desk" }] }),
  component: () => <DemoLoginGate>
    <main className="min-h-screen bg-slate-950 px-3 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link to="/phaser-preview" className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm">← Voltar ao laboratório Phaser</Link>
        <h1 className="text-2xl font-bold text-cyan-400">Modelo arquitetônico da empresa</h1>
        <p className="text-sm text-slate-300">Primeira etapa: distribuição completa dos setores, piso, paredes e vidro. Prévia independente para validar a planta antes de criar móveis, personagens e interações.</p>
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"><ArchitectureShell/></div>
        <p className="text-xs text-slate-400">Esta é uma primeira aproximação geométrica da imagem de referência, não a arte final. Não altera o escritório atual nem executa operações financeiras.</p>
      </div>
    </main>
  </DemoLoginGate>,
});
