import { fmt, type Market } from "@/lib/trading";

export interface Agent {
  id: string;
  name: string;
  role: string;
  room: number;
  color: string;
  hair: string;
  prompt: string;
}

export const ROOMS = ["Pesquisa", "Análise Gráfica", "Gestão de Risco", "Execução"];

const CENTERS: Record<number, [number, number]> = {
  0: [300, 95],
  2: [140, 205],
  1: [460, 205],
  3: [300, 315],
};
const HW = 105;
const HH = 52;
const SLOTS: [number, number][] = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [-0.5, 0.5],
  [0.5, 0.5],
];

function p(cx: number, cy: number, u: number, v: number, hw = HW, hh = HH): [number, number] {
  return [cx + ((u - v) * hw) / 2, cy + ((u + v) * hh) / 2];
}

export function statusFor(a: Agent, m: Market | null): string {
  if (!m) return "Aguardando...";
  if (a.room === 0) return `Contexto ${m.change >= 0 ? "▲" : "▼"} ${fmt(Math.abs(m.change), 1)}%`;
  if (a.room === 1) return `RSI ${fmt(m.rsi, 0)} • ${m.ema9 >= m.ema21 ? "Alta" : "Baixa"}`;
  if (a.room === 2) return `Risco ${fmt(m.risk, 0)} USDT`;
  return `Sinal: ${m.signal} ${m.signal === "COMPRA" ? "✓" : "✗"}`;
}

function Room({ idx }: { idx: number }) {
  const [cx, cy] = CENTERS[idx] ?? [300, 200];
  const top = p(cx, cy, -1, -1);
  const right = p(cx, cy, 1, -1);
  const bottom = p(cx, cy, 1, 1);
  const left = p(cx, cy, -1, 1);
  const h = 28;
  const pts = (a: [number, number][]) => a.map((q) => q.join(",")).join(" ");
  return (
    <g>
      <polygon points={pts([left, top, [top[0], top[1] - h], [left[0], left[1] - h]])} fill="#1e2a3d" />
      <polygon points={pts([top, right, [right[0], right[1] - h], [top[0], top[1] - h]])} fill="#26354d" />
      <polygon points={pts([top, right, bottom, left])} fill="#151d2b" stroke="#3b4c66" strokeWidth={1} />
      <text x={bottom[0]} y={bottom[1] + 11} textAnchor="middle" fontSize={9} fill="#d4af37" fontWeight={700}>
        {(ROOMS[idx] ?? "").toUpperCase()}
      </text>
    </g>
  );
}

function Desk({ x, y }: { x: number; y: number }) {
  const w = 14;
  const hh = 7;
  const z = 9;
  return (
    <g>
      <polygon points={`${x - w},${y - z} ${x},${y - z + hh} ${x},${y + hh} ${x - w},${y}`} fill="#5b4632" />
      <polygon points={`${x},${y - z + hh} ${x + w},${y - z} ${x + w},${y} ${x},${y + hh}`} fill="#7a5d40" />
      <polygon points={`${x - w},${y - z} ${x},${y - z - hh} ${x + w},${y - z} ${x},${y - z + hh}`} fill="#a07a52" />
      <rect x={x - 7} y={y - z - 14} width={14} height={9} rx={1} fill="#0f172a" stroke="#64748b" strokeWidth={0.6} />
      <rect x={x - 6} y={y - z - 13} width={12} height={7} fill="#22d3ee" opacity={0.85} />
    </g>
  );
}

function Person({ a, x, y, label, onClick }: { a: Agent; x: number; y: number; label: string; onClick: () => void }) {
  const bw = Math.max(40, label.length * 4.3 + 8);
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <line x1={x - 2} y1={y} x2={x - 2} y2={y - 9} stroke="#1f2937" strokeWidth={2.5} />
      <line x1={x + 2} y1={y} x2={x + 2} y2={y - 9} stroke="#1f2937" strokeWidth={2.5} />
      <rect x={x - 5} y={y - 21} width={10} height={13} rx={3} fill={a.color} />
      <circle cx={x} cy={y - 26} r={5} fill="#f1c9a5" />
      <path d={`M ${x - 5} ${y - 27} A 5 5 0 0 1 ${x + 5} ${y - 27} Z`} fill={a.hair} />
      <g>
        <rect x={x - bw / 2} y={y - 47} width={bw} height={13} rx={6} fill="#ffffff" stroke="#cbd5e1" strokeWidth={0.5} />
        <polygon points={`${x - 3},${y - 34.5} ${x + 3},${y - 34.5} ${x},${y - 31}`} fill="#ffffff" />
        <text x={x} y={y - 38} textAnchor="middle" fontSize={7} fill="#0f172a" fontWeight={600}>
          {label}
        </text>
      </g>
    </g>
  );
}

function Rest() {
  const cx = 300;
  const cy = 205;
  const t = p(cx, cy, -1, -1, 100, 50);
  const r = p(cx, cy, 1, -1, 100, 50);
  const b = p(cx, cy, 1, 1, 100, 50);
  const l = p(cx, cy, -1, 1, 100, 50);
  return (
    <g>
      <polygon points={[t, r, b, l].map((q) => q.join(",")).join(" ")} fill="#14532d" stroke="#22c55e" strokeWidth={1} />
      <polygon points="282,200 300,191 318,200 300,209" fill="#7c2d12" />
      <polygon points="282,200 300,209 300,215 282,206" fill="#5a1f0c" />
      <polygon points="300,209 318,200 318,206 300,215" fill="#9a3412" />
      <rect x={283} y={186} width={6} height={12} fill="#9a3412" />
      {([[265, 205], [335, 205]] as [number, number][]).map(([x, y]) => (
        <g key={x}>
          <rect x={x - 3} y={y - 4} width={6} height={6} fill="#78350f" />
          <circle cx={x} cy={y - 9} r={6} fill="#16a34a" />
          <circle cx={x + 3} cy={y - 13} r={4} fill="#22c55e" />
        </g>
      ))}
      <text x={300} y={232} textAnchor="middle" fontSize={8} fill="#86efac" fontWeight={700}>
        DESCANSO
      </text>
    </g>
  );
}

export function OfficeMap({ agents, market, onSelect }: { agents: Agent[]; market: Market | null; onSelect: (a: Agent) => void }) {
  const order = [0, 2, 1, -1, 3];
  return (
    <svg viewBox="0 0 600 420" className="w-full h-auto block select-none">
      {order.map((idx) => {
        if (idx === -1) return <Rest key="rest" />;
        const [cx, cy] = CENTERS[idx] ?? [300, 200];
        const inRoom = agents.filter((a) => a.room === idx);
        return (
          <g key={idx}>
            <Room idx={idx} />
            {SLOTS.map(([u, v], s) => {
              const [x, y] = p(cx, cy, u, v);
              const a = inRoom[s];
              return (
                <g key={s}>
                  {a && <Person a={a} x={x} y={y - 6} label={statusFor(a, market)} onClick={() => onSelect(a)} />}
                  <Desk x={x} y={y + 6} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
