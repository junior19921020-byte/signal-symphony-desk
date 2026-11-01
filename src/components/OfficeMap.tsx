import React, { useEffect, useMemo, useState } from "react";
import { fmt, type Market } from "@/lib/trading";

export type ActivityMode = "Atendendo" | "Pausa" | "Reunião" | "Foco";
export type RiskProfile = "Conservador" | "Moderado" | "Agressivo";
export type AllowedSide = "AMBOS" | "COMPRA" | "VENDA";

export interface Agent {
  id: string;
  name: string;
  role: string;
  room: number;
  color: string;
  hair: string;
  prompt: string;
  station?: string;
  activity?: ActivityMode;
  startTime?: string;
  endTime?: string;
  is247?: boolean;
  days?: boolean[];
  riskProfile?: RiskProfile;
  allowedSide?: AllowedSide;
  trailingStop?: boolean;
}

export const ROOMS = [
  { id: 0, title: "Pesquisa & Notícias", code: "C01" },
  { id: 1, title: "Análise Gráfica", code: "C02" },
  { id: 2, title: "Gestão de Risco", code: "C03" },
  { id: 3, title: "Mesa de Execução", code: "C04" },
  { id: 4, title: "Recepção", code: "REC" },
  { id: 5, title: "Sala de Reunião", code: "MEET" },
  { id: 6, title: "Descompressão & Jogos", code: "LOUNGE" },
  { id: 7, title: "Diretoria & Foco Quant", code: "EXEC" },
];

const HIRE_CATALOG: Array<{
  name: string;
  role: string;
  color: string;
  hair: string;
  station: string;
  desc: string;
  why: string;
  prompt: string;
}> = [
  {
    name: "Rafael — Caçador de Rompimentos",
    role: "Analista Gráfica",
    color: "#2563eb",
    hair: "#1e293b",
    station: "C05",
    desc: "Monitora rompimentos de suporte, resistência e explosões de volume nas velas de 5m e 15m.",
    why: "identifica movimentos fortes no início da tendência antes do cruzamento atrasado das médias.",
    prompt: "Você é Rafael, especialista em price action, rompimentos de suporte/resistência e volume explosivo.",
  },
  {
    name: "Caio — Fluxo & Baleias",
    role: "Analista de Notícias",
    color: "#0891b2",
    hair: "#451a03",
    station: "C06",
    desc: "Rastreia agressão compradora/vendedora no livro de ofertas e movimentação institucional.",
    why: "filtra entradas falsas confirmando se o dinheiro forte está comprando ou vendendo a mercado.",
    prompt: "Você é Caio, analista de fluxo de ordens (order flow), agressão de compra/venda e liquidez.",
  },
  {
    name: "Bia — Scalper RSI & Bollinger",
    role: "Analista Gráfica",
    color: "#db2777",
    hair: "#7c2d12",
    station: "C07",
    desc: "Opera exaustão de preço, divergências de RSI e retorno à média9/21 em operações rápidas.",
    why: "aproveita correções rápidas tanto na COMPRA (Long) quanto na VENDA (Short).",
    prompt: "Você é Bia, especialista em scalping quantitativo, divergências de RSI e retorno às médias móveis.",
  },
  {
    name: "Leo — Guardião de Stop & Breakeven",
    role: "Diretora de Risco",
    color: "#dc2626",
    hair: "#facc15",
    station: "C08",
    desc: "Protege o patrimônio movendo o Stop Loss para o ponto de entrada (breakeven) e travando lucros.",
    why: "impede que operações vencedoras voltem e fechem no prejuízo.",
    prompt: "Você é Leo, gestor de risco focado em proteção de drawdown, relação retorno/risco 2:1 e trailing stop.",
  },
];

const SUIT_COLORS = ["#2563eb", "#9333ea", "#dc2626", "#16a34a", "#0891b2", "#ea580c", "#db2777", "#4f46e5"];
const HAIR_COLORS = ["#111827", "#7c2d12", "#facc15", "#451a03", "#991b1b", "#374151"];
const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// Coordenadas (x, y) no mapa SVG 900x540 para cada estação e ambiente
const DESK_COORDS: Record<string, { x: number; y: number; label: string }> = {
  C01: { x: 525, y: 205, label: "Estação C01" },
  C02: { x: 575, y: 230, label: "Estação C02" },
  C03: { x: 625, y: 255, label: "Estação C03" },
  C04: { x: 675, y: 280, label: "Estação C04" },
  C05: { x: 465, y: 255, label: "Estação C05" },
  C06: { x: 515, y: 280, label: "Estação C06" },
  C07: { x: 565, y: 305, label: "Estação C07" },
  C08: { x: 615, y: 330, label: "Estação C08" },
};

const ACTIVITY_SPOTS: Record<ActivityMode, Array<{ x: number; y: number; label: string }>> = {
  Atendendo: Object.values(DESK_COORDS),
  Pausa: [
    { x: 255, y: 315, label: "Mesa de Sinuca" },
    { x: 185, y: 270, label: "Café & Lounge" },
    { x: 310, y: 345, label: "Área de Descanso" },
    { x: 235, y: 245, label: "Fliperama & Bebidas" },
  ],
  Reunião: [
    { x: 410, y: 385, label: "Mesa de Reunião 1" },
    { x: 445, y: 405, label: "Mesa de Reunião 2" },
    { x: 480, y: 425, label: "Mesa de Reunião 3" },
    { x: 385, y: 410, label: "Mesa de Reunião 4" },
  ],
  Foco: [
    { x: 350, y: 145, label: "Sala da Diretoria" },
    { x: 310, y: 175, label: "Lounge Executivo" },
    { x: 415, y: 165, label: "Cabine Quant" },
    { x: 265, y: 195, label: "Mesa Estratégica" },
  ],
};

export function statusFor(agent: Agent, market: Market | null): string {
  const act = agent.activity || "Atendendo";
  const st = agent.station || `C0${(agent.room % 8) + 1}`;
  if (act === "Pausa") return `Em pausa • Descompressão`;
  if (act === "Reunião") return `Em reunião • Comitê de Risco`;
  if (act === "Foco") return `Em foco profundo • Sala Quant`;
  if (!market) return `Analisando na Estação ${st}...`;
  const r = agent.role.toLowerCase();
  if (r.includes("notícia") || r.includes("noticia") || r.includes("pesquisa") || agent.room === 0) {
    return `${market.research.trend} • Vol ${(market.buyRatio * 100).toFixed(0)}% (${st})`;
  }
  if (r.includes("gráfica") || r.includes("grafica") || r.includes("quant") || agent.room === 1) {
    return `Gráfico ${market.chart.trend} • RSI ${fmt(market.rsi, 0)} (${st})`;
  }
  if (r.includes("risco") || agent.room === 2) {
    return market.riskApproved ? `Risco ✓ Aprovado (${st})` : `Risco ✗ Vetado (${st})`;
  }
  return `Sinal: ${market.signal} (${st})`;
}

export function OfficeMap({
  agents: propAgents,
  market,
  onSelectAgent,
}: {
  agents: Agent[];
  market: Market | null;
  onSelectAgent?: (a: Agent) => void;
}) {
  const [localAgents, setLocalAgents] = useState<Agent[]>(propAgents);
  const [topTab, setTopTab] = useState<"Quadro" | "Avisos" | "Relatório" | "Voz" | null>("Quadro");
  const [subTab, setSubTab] = useState<"EQUIPE" | "CONTRATAR" | "ANDAR">("EQUIPE");
  const [configAgent, setConfigAgent] = useState<Agent | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [spawningIds, setSpawningIds] = useState<Record<string, boolean>>({});
  const [floorName, setFloorName] = useState("18º Andar • Mesa de Operações");
  const [dayMode, setDayMode] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [clock, setClock] = useState("12:48");
  const [alerts, setAlerts] = useState<Array<{ time: string; title: string; detail: string; side: string }>>([]);

  // Sincroniza agentes salvos com propriedades estendidas
  useEffect(() => {
    try {
      const saved = localStorage.getItem("td_agents_v2");
      if (saved) {
        const parsed = JSON.parse(saved) as Agent[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalAgents(parsed);
          return;
        }
      }
    } catch { /* */ }
    setLocalAgents(
      propAgents.map((a, idx) => ({
        ...a,
        station: a.station || `C0${idx + 1}`,
        activity: a.activity || "Atendendo",
        startTime: a.startTime || "08:00",
        endTime: a.endTime || "18:00",
        is247: a.is247 ?? true,
        days: a.days || [true, true, true, true, true, true, true],
        riskProfile: a.riskProfile || "Moderado",
        allowedSide: a.allowedSide || "AMBOS",
        trailingStop: a.trailingStop ?? true,
      }))
    );
  }, [propAgents]);

  const updateAgents = (next: Agent[]) => {
    setLocalAgents(next);
    try {
      localStorage.setItem("td_agents_v2", JSON.stringify(next));
      localStorage.setItem("td_agents", JSON.stringify(next));
    } catch { /* */ }
  };

  // Relógio em tempo real na barra de Expediente
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(d.toTimeString().slice(0, 5));
    };
    tick();
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, []);

  // Registra alertas de oportunidade e lê por voz se ativado
  useEffect(() => {
    if (!market) return;
    const now = new Date().toTimeString().slice(0, 5);
    const entry = {
      time: now,
      title: market.signal === "AGUARDAR" ? `Monitoramento ${market.symbol}` : `Oportunidade de ${market.signal} em ${market.symbol}`,
      detail: `Preço $${fmt(market.price)} • SL $${fmt(market.sl)} • TP $${fmt(market.tp)} • ${market.chart.note}`,
      side: market.signal,
    };
    setAlerts((prev) => [entry, ...prev.filter((x) => x.detail !== entry.detail)].slice(0, 15));

    if (voiceEnabled && market.signal !== "AGUARDAR" && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(
          `Atenção mesa: oportunidade de ${market.signal} em ${market.symbol} a ${fmt(market.price, 0)} dólares. Stop loss em ${fmt(market.sl, 0)} e alvo em ${fmt(market.tp, 0)}.`
        );
        u.lang = "pt-BR";
        window.speechSynthesis.speak(u);
      } catch { /* */ }
    }
  }, [market?.signal, market?.time, voiceEnabled]);

  const counts = useMemo(() => {
    const c = { Atendendo: 0, Pausa: 0, Reunião: 0, Foco: 0 };
    localAgents.forEach((a) => {
      const mode = a.activity || "Atendendo";
      c[mode] = (c[mode] || 0) + 1;
    });
    return c;
  }, [localAgents]);

  const hireAgent = (tpl: (typeof HIRE_CATALOG)[number]) => {
    const id = `ag_${Date.now()}`;
    const usedStations = new Set(localAgents.map((a) => a.station));
    const freeStation = Object.keys(DESK_COORDS).find((k) => !usedStations.has(k)) || tpl.station;
    const newAg: Agent = {
      id,
      name: tpl.name.split(" — ")[0] || tpl.name,
      role: tpl.role,
      room: tpl.role.includes("Notícia") ? 0 : tpl.role.includes("Gráfica") ? 1 : tpl.role.includes("Risco") ? 2 : 3,
      color: tpl.color,
      hair: tpl.hair,
      prompt: tpl.prompt,
      station: freeStation,
      activity: "Atendendo",
      startTime: "08:00",
      endTime: "18:00",
      is247: true,
      days: [true, true, true, true, true, true, true],
      riskProfile: "Moderado",
      allowedSide: "AMBOS",
      trailingStop: true,
    };
    // Animação saindo da Recepção até a Estação
    setSpawningIds((s) => ({ ...s, [id]: true }));
    updateAgents([...localAgents, newAg]);
    setHoveredId(id);
    setTimeout(() => {
      setSpawningIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }, 1800);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#0e1726]">
      {/* BARRA SUPERIOR DOURADA DE EXPEDIENTE (IDÊNTICA AO VÍDEO) */}
      <div className="bg-gradient-to-r from-[#f6d345] via-[#f4c63d] to-[#eab308] text-slate-950 px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          <div className="pr-3 border-r border-slate-950/15">
            <div className="text-sm sm:text-base font-extrabold leading-none tracking-tight font-mono">{clock}</div>
            <div className="text-[9px] font-bold tracking-widest uppercase opacity-75">EXPEDIENTE</div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-center">
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-none">{counts.Atendendo}</div>
              <div className="text-[9px] font-medium opacity-80">atendendo</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-none">{counts.Pausa}</div>
              <div className="text-[9px] font-medium opacity-80">em pausa</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-none">{counts.Reunião}</div>
              <div className="text-[9px] font-medium opacity-80">reunião</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-none">{counts.Foco}</div>
              <div className="text-[9px] font-medium opacity-80">foco</div>
            </div>
          </div>
        </div>

        {/* Botões Superiores: Quadro | Avisos | Relatório | Voz */}
        <div className="flex items-center gap-1.5">
          {(["Quadro", "Avisos", "Relatório", "Voz"] as const).map((tab) => {
            const active = topTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setTopTab(active ? null : tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  active
                    ? "bg-slate-950 text-amber-300 border-slate-950 shadow"
                    : "bg-amber-200/60 hover:bg-amber-100/80 text-slate-900 border-slate-950/15"
                }`}
              >
                {tab === "Voz" && voiceEnabled ? "🔊 Voz" : tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: CENÁRIO ISOMÉTRICO + PAINEL LATERAL */}
      <div className="relative flex flex-col lg:flex-row">
        {/* CENÁRIO ISOMÉTRICO ARQUITETÔNICO COMPLETO (ESTILO DO VÍDEO) */}
        <div
          className={`relative flex-1 min-h-[380px] sm:min-h-[460px] transition-colors duration-500 overflow-hidden select-none ${
            dayMode
              ? "bg-gradient-to-br from-[#67b2b8] via-[#8ec5be] to-[#d9d6b8]"
              : "bg-gradient-to-br from-[#0b1324] via-[#111c35] to-[#1e293b]"
          }`}
        >
          {/* Etiqueta do Andar no Canto Superior Esquerdo */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full shadow border border-slate-300/60 text-[11px] font-semibold text-slate-800">
            <span>🏢 {floorName}</span>
            <span className="text-emerald-600 font-bold">• {localAgents.length} agentes no andar</span>
          </div>

          {/* Legenda rápida de toque */}
          <div className="absolute bottom-2.5 left-3 z-10 bg-slate-950/75 backdrop-blur text-slate-200 px-3 py-1 rounded-full text-[10px] flex items-center gap-2">
            <span>👆 Toque em qualquer agente para configurar horário, atividade, aparência ou abrir o cérebro (IA)</span>
          </div>

          <svg viewBox="0 0 900 540" className="w-full h-full max-h-[540px] block">
            <defs>
              <filter id="isoShadow" x="-15%" y="-15%" width="130%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.35" />
              </filter>
              {/* Padrão de piso claro quadriculado */}
              <pattern id="lightTile" width="24" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 24 6 L 12 12 L 0 6 Z" fill="#f1efe7" stroke="#e2dfd5" strokeWidth="0.7" />
              </pattern>
              {/* Padrão de piso de madeira quente (Diretoria e Recepção) */}
              <pattern id="woodFloor" width="20" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 20 5 L 10 10 L 0 5 Z" fill="#d99b52" stroke="#c5863e" strokeWidth="0.6" />
              </pattern>
            </defs>

            {/* BASE ARQUITETÔNICA DO ESCRITÓRIO INTEIRO */}
            <g filter="url(#isoShadow)">
              {/* Laje externa e espessura do piso */}
              <polygon points="430,45 830,245 450,495 50,295" fill="#1e293b" />
              <polygon points="50,295 450,495 450,512 50,312" fill="#334155" />
              <polygon points="830,245 450,495 450,512 830,262" fill="#0f172a" />

              {/* Piso Principal Quadriculado Claro */}
              <polygon points="430,52 818,246 450,486 62,292" fill="url(#lightTile)" />

              {/* PISO DE MADEIRA: SALA DA DIRETORIA (Topo Esquerdo) */}
              <polygon points="345,95 475,160 365,225 235,160" fill="url(#woodFloor)" stroke="#b47532" strokeWidth="1" />

              {/* PISO DE MADEIRA: RECEPÇÃO (Topo Direito/Central) */}
              <polygon points="485,80 615,145 535,195 405,130" fill="url(#woodFloor)" stroke="#b47532" strokeWidth="1" />

              {/* PISO SALA DE REUNIÃO (Inferior Central) */}
              <polygon points="355,345 525,430 450,480 280,395" fill="#e7e4da" stroke="#cbd5e1" strokeWidth="1" />

              {/* PAREDES EXTERNAS TRASEIRAS ESCURAS (Estilo do Vídeo) */}
              {/* Parede Traseira Esquerda */}
              <polygon points="62,292 430,52 430,22 62,262" fill="#1e222d" stroke="#0f172a" strokeWidth="1" />
              {/* Parede Traseira Direita */}
              <polygon points="430,52 818,246 818,216 430,22" fill="#262b38" stroke="#0f172a" strokeWidth="1" />

              {/* Quadros e Telões nas Paredes Traseiras */}
              {/* Quadro Branco / Gráfico na Diretoria */}
              <polygon points="365,82 415,52 415,35 365,65" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
              <polyline points="370,60 382,50 392,53 408,40" fill="none" stroke="#16a34a" strokeWidth="2" />

              {/* Letreiro Dourado na Recepção */}
              <polygon points="465,52 515,77 515,60 465,35" fill="#18181b" stroke="#f59e0b" strokeWidth="1.2" />
              <text x="490" y="58" fontSize="6.5" fill="#facc15" fontWeight="bold" textAnchor="middle" transform="skewY(26)">
                TRADING
              </text>

              {/* DIVISÓRIAS INTERNAS DE VIDRO TRANSLÚCIDO */}
              {/* Vidro da Diretoria */}
              <polygon points="235,160 365,225 365,200 235,135" fill="#38bdf8" fillOpacity="0.22" stroke="#bae6fd" strokeWidth="1" />
              <polygon points="365,225 475,160 475,135 365,200" fill="#0ea5e9" fillOpacity="0.18" stroke="#bae6fd" strokeWidth="1" />

              {/* Vidro da Recepção com Porta Aberta */}
              <polygon points="405,130 460,158 460,136 405,108" fill="#38bdf8" fillOpacity="0.25" stroke="#e0f2fe" strokeWidth="1" />
              <polygon points="490,173 535,195 535,173 490,151" fill="#38bdf8" fillOpacity="0.25" stroke="#e0f2fe" strokeWidth="1" />

              {/* Vidro da Sala de Reunião (Inferior) */}
              <polygon points="355,345 525,430 525,406 355,321" fill="#38bdf8" fillOpacity="0.2" stroke="#bae6fd" strokeWidth="1" />
              <polygon points="280,395 355,345 355,321 280,371" fill="#0284c7" fillOpacity="0.22" stroke="#bae6fd" strokeWidth="1" />

              {/* 1. MOBÍLIA DA DIRETORIA EXECUTIVA (Topo Esquerdo) */}
              {/* Sofá de Couro Caramelo */}
              <g transform="translate(295, 138)">
                <polygon points="0,12 28,-4 40,2 12,18" fill="#c2591a" />
                <polygon points="0,12 0,4 28,-12 28,-4" fill="#9a3412" />
                <polygon points="12,18 40,2 40,8 12,24" fill="#7c2d12" />
              </g>
              {/* Mesa Executiva do Diretor */}
              <g transform="translate(365, 128)">
                <polygon points="0,10 26,-4 42,4 16,18" fill="#78350f" />
                <polygon points="16,18 42,4 42,10 16,24" fill="#451a03" />
                {/* Monitor Executivo */}
                <polygon points="18,4 26,0 26,-7 18,-3" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.6" />
              </g>

              {/* 2. MOBÍLIA DA RECEPÇÃO (Topo Central) */}
              <g transform="translate(465, 128)">
                <polygon points="0,8 30,23 22,29 -8,14" fill="#fde68a" stroke="#d97706" strokeWidth="0.8" />
                <polygon points="-8,14 22,29 22,37 -8,22" fill="#d97706" />
                <text x="5" y="25" fontSize="6" fill="#451a03" fontWeight="bold" textAnchor="middle">
                  RECEPÇÃO
                </text>
              </g>

              {/* 3. ÁREA DE DESCOMPRESSÃO: SINUCA, FLIPERAMA & CAFÉ (Esquerda/Inferior) */}
              {/* Fliperamas / Vending Machines */}
              <g transform="translate(190, 212)">
                <polygon points="0,0 14,-8 22,-4 8,4" fill="#1e1b4b" />
                <polygon points="0,0 8,4 8,24 0,20" fill="#312e81" />
                <polygon points="8,4 22,-4 22,16 8,24" fill="#0f172a" />
                <polygon points="10,6 19,1 19,9 10,14" fill="#22d3ee" />
              </g>
              <g transform="translate(212, 200)">
                <polygon points="0,0 14,-8 22,-4 8,4" fill="#1e1b4b" />
                <polygon points="0,0 8,4 8,24 0,20" fill="#3730a3" />
                <polygon points="8,4 22,-4 22,16 8,24" fill="#0f172a" />
                <polygon points="10,6 19,1 19,9 10,14" fill="#f472b6" />
              </g>

              {/* Mesa de Sinuca Azul (Pool Table do Vídeo) */}
              <g transform="translate(225, 305)">
                <polygon points="0,14 36,-6 62,7 26,27" fill="#0284c7" stroke="#92400e" strokeWidth="2.5" />
                <polygon points="0,14 26,27 26,34 0,21" fill="#78350f" />
                <polygon points="26,27 62,7 62,14 26,34" fill="#451a03" />
                <circle cx="30" cy="11" r="1.6" fill="#facc15" />
                <circle cx="35" cy="9" r="1.6" fill="#ef4444" />
                <circle cx="26" cy="14" r="1.6" fill="#ffffff" />
              </g>

              {/* Sofá Verde do Lounge */}
              <g transform="translate(295, 330)">
                <polygon points="0,10 26,-4 38,2 12,16" fill="#4ade80" stroke="#16a34a" strokeWidth="0.7" />
                <polygon points="12,16 38,2 38,8 12,22" fill="#15803d" />
              </g>

              {/* Balcão de Café (Esquerda) */}
              <g transform="translate(145, 265)">
                <polygon points="0,6 38,25 30,31 -8,12" fill="#334155" />
                <polygon points="-8,12 30,31 30,40 -8,21" fill="#1e293b" />
              </g>

              {/* 4. SALA DE REUNIÃO / COMITÊ DE RISCO (Inferior Central) */}
              <g transform="translate(380, 390)">
                {/* Grande Mesa de Conferência de Madeira */}
                <polygon points="0,12 42,-10 92,15 50,37" fill="#d99b52" stroke="#92400e" strokeWidth="1.2" />
                <polygon points="0,12 50,37 50,43 0,18" fill="#92400e" />
                <polygon points="50,37 92,15 92,21 50,43" fill="#78350f" />
                <text x="46" y="18" fontSize="6.5" fill="#451a03" fontWeight="bold" textAnchor="middle">
                  COMITÊ DE RISCO
                </text>
              </g>

              {/* 5. SALÃO DE OPERAÇÕES: 2 GRANDES BANCADAS DE TRADING (C01 a C08) */}
              {/* Bancada Superior (C01 a C04) */}
              <g transform="translate(505, 195)">
                <polygon points="0,14 34,-4 195,76 161,94" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="0,14 161,94 161,102 0,22" fill="#cbd5e1" />
                <polygon points="161,94 195,76 195,84 161,102" fill="#94a3b8" />
              </g>
              {/* Bancada Inferior (C05 a C08) */}
              <g transform="translate(445, 245)">
                <polygon points="0,14 34,-4 195,76 161,94" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="0,14 161,94 161,102 0,22" fill="#cbd5e1" />
                <polygon points="161,94 195,76 195,84 161,102" fill="#94a3b8" />
              </g>

              {/* Monitores nas 8 Estações (C01 a C08) */}
              {Object.entries(DESK_COORDS).map(([code, pos]) => (
                <g key={code} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Tela do Computador */}
                  <polygon points="-8,-12 4,-6 4,2 -8,-4" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
                  {/* Código da Estação no Piso */}
                  <text x="0" y="24" fontSize="6.5" fill="#64748b" fontWeight="bold" textAnchor="middle">
                    {code}
                  </text>
                </g>
              ))}

              {/* Plantas Decorativas nos Cantos */}
              {[
                { x: 425, y: 72 },
                { x: 605, y: 150 },
                { x: 345, y: 335 },
                { x: 755, y: 245 },
              ].map((p, idx) => (
                <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                  <rect x="-4" y="0" width="8" height="7" rx="1" fill="#b45309" />
                  <circle cx="0" cy="-4" r="6" fill="#16a34a" />
                  <circle cx="-3" cy="-2" r="4" fill="#22c55e" />
                </g>
              ))}
            </g>

            {/* AVATARES DOS AGENTES COM MOVIMENTAÇÃO E BALÕES INTERATIVOS */}
            {localAgents.map((ag, idx) => {
              const mode = ag.activity || "Atendendo";
              const stCode = ag.station || `C0${(idx % 8) + 1}`;
              const isSpawning = !!spawningIds[ag.id];

              // Se acabou de ser contratado, sai caminhando da Recepção (465, 155) até a Estação
              let target = DESK_COORDS[stCode] || DESK_COORDS.C01!;
              if (mode !== "Atendendo") {
                const spots = ACTIVITY_SPOTS[mode];
                target = spots[idx % spots.length] || target;
              }
              const x = isSpawning ? 465 : target.x;
              const y = isSpawning ? 155 : target.y;

              const stText = statusFor(ag, market);
              const isHovered = hoveredId === ag.id;
              const badgeColor =
                market?.signal === "COMPRA" && mode === "Atendendo"
                  ? "#16a34a"
                  : market?.signal === "VENDA" && mode === "Atendendo"
                  ? "#dc2626"
                  : mode === "Pausa"
                  ? "#f59e0b"
                  : mode === "Reunião"
                  ? "#8b5cf6"
                  : "#ea580c";

              return (
                <g
                  key={ag.id}
                  transform={`translate(${x}, ${y})`}
                  style={{ transition: "transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)", cursor: "pointer" }}
                  onClick={() => setConfigAgent(ag)}
                  onMouseEnter={() => setHoveredId(ag.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Sombra embaixo do personagem */}
                  <ellipse cx="0" cy="12" rx="9" ry="4.5" fill="#0f172a" fillOpacity="0.35" />

                  {/* Cadeira Giratória quando está na estação */}
                  {mode === "Atendendo" && !isSpawning && (
                    <ellipse cx="0" cy="7" rx="7" ry="4" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                  )}

                  {/* Pernas */}
                  <rect x="-4" y="3" width="3.2" height="7" rx="1" fill="#1e293b" />
                  <rect x="0.8" y="3" width="3.2" height="7" rx="1" fill="#1e293b" />

                  {/* Corpo / Traje */}
                  <rect x="-6" y="-8" width="12" height="12" rx="3" fill={ag.color} stroke="#ffffff" strokeWidth="0.6" />

                  {/* Cabeça */}
                  <circle cx="0" cy="-14" r="5.5" fill="#fde68a" />
                  {/* Cabelo */}
                  <path d="M -5.5 -15 Q 0 -22 5.5 -15 Z" fill={ag.hair || "#111827"} />
                  {/* Olhos */}
                  <circle cx="-2" cy="-14" r="0.8" fill="#0f172a" />
                  <circle cx="2" cy="-14" r="0.8" fill="#0f172a" />

                  {/* Pílula Laranja/Colorida em cima da cabeça (Estilo do Vídeo) */}
                  <g transform="translate(0, -28)">
                    <rect x="-34" y="-9" width="68" height="13" rx="6.5" fill={badgeColor} stroke="#ffffff" strokeWidth="0.8" />
                    <text x="0" y="-0.5" fontSize="6.5" fill="#ffffff" fontWeight="bold" textAnchor="middle">
                      {isSpawning ? "Indo p/ Estação..." : `${ag.name.slice(0, 10)} • ${mode === "Atendendo" ? stCode : mode}`}
                    </text>
                  </g>

                  {/* Card Flutuante Branco quando selecionado/hover */}
                  {isHovered && (
                    <g transform="translate(14, -52)">
                      <rect
                        x="0"
                        y="0"
                        width="165"
                        height="44"
                        rx="6"
                        fill="#ffffff"
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      <text x="8" y="13" fontSize="8.5" fill="#0f172a" fontWeight="bold">
                        {ag.name}
                      </text>
                      <circle cx="8" cy="22" r="2.5" fill="#16a34a" />
                      <text x="14" y="24.5" fontSize="7" fill="#334155" fontWeight="bold">
                        {ag.role}
                      </text>
                      <text x="8" y="36" fontSize="6.5" fill="#64748b">
                        {isSpawning ? `Saindo pela recepção -> ${stCode}` : stText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* GAVETA LATERAL DIREITA (Quadro -> EQUIPE | CONTRATAR | ANDAR, Avisos, Relatório, Voz) */}
        {topTab && (
          <aside className="w-full lg:w-80 bg-[#f8f7f2] text-slate-900 border-t lg:border-t-0 lg:border-l border-slate-300 flex flex-col max-h-[460px]">
            {topTab === "Quadro" && (
              <>
                {/* Sub-abas: EQUIPE | CONTRATAR | ANDAR */}
                <div className="grid grid-cols-3 border-b border-slate-300 bg-[#efede6] text-[11px] font-extrabold tracking-wider">
                  {(["EQUIPE", "CONTRATAR", "ANDAR"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSubTab(st)}
                      className={`py-2.5 text-center transition border-b-2 ${
                        subTab === st
                          ? "border-slate-900 text-slate-950 bg-white"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Conteúdo da Sub-Aba */}
                <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                  {subTab === "EQUIPE" && (
                    <>
                      {localAgents.map((ag) => (
                        <div
                          key={ag.id}
                          className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-sm hover:border-slate-400 transition space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full inline-block border border-slate-900/20"
                                style={{ backgroundColor: ag.color }}
                              />
                              <div>
                                <div className="font-extrabold text-xs text-slate-900 leading-tight">{ag.name}</div>
                                <div className="text-[10px] text-emerald-700 font-semibold">
                                  ● {ag.role} • {ag.station || "C01"}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setConfigAgent(ag)}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 uppercase"
                            >
                              Configurar
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2">{statusFor(ag, market)}</p>

                          <div className="pt-1 flex items-center justify-between gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">
                              {ag.activity || "Atendendo"} • {ag.is247 ? "24/7" : `${ag.startTime}-${ag.endTime}`}
                            </span>
                            {onSelectAgent && (
                              <button
                                onClick={() => onSelectAgent(ag)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800"
                              >
                                💬 Chat IA
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {subTab === "CONTRATAR" && (
                    <>
                      <p className="text-[11px] text-slate-600 mb-1">
                        Contrate novos especialistas de IA. Eles entram pela recepção e assumem uma estação na bancada:
                      </p>
                      {HIRE_CATALOG.map((item, i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-extrabold text-xs text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-500">{item.role} • Estação sugerida {item.station}</div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              IA PRONTA
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                          <p className="text-[10px] text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-200/60">
                            <strong>Por que vale:</strong> {item.why}
                          </p>
                          <button
                            onClick={() => hireAgent(item)}
                            className="w-full py-1.5 rounded-lg bg-[#1e222d] hover:bg-slate-800 text-white font-bold text-xs transition"
                          >
                            + contratar
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {subTab === "ANDAR" && (
                    <div className="space-y-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <label className="block font-bold text-slate-700">Nome do Andar / Escritório</label>
                        <input
                          value={floorName}
                          onChange={(e) => setFloorName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-slate-50"
                        />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <label className="block font-bold text-slate-700">Iluminação do Cenário</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setDayMode(true)}
                            className={`py-1.5 rounded-lg font-bold border ${
                              dayMode ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            ☀️ Diurno (Vídeo)
                          </button>
                          <button
                            onClick={() => setDayMode(false)}
                            className={`py-1.5 rounded-lg font-bold border ${
                              !dayMode ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            🌙 Noturno Pro
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="font-bold text-slate-700">Distribuição Rápida da Equipe</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => updateAgents(localAgents.map((a) => ({ ...a, activity: "Atendendo" })))}
                            className="py-1.5 px-2 rounded bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Todos Operando
                          </button>
                          <button
                            onClick={() => updateAgents(localAgents.map((a) => ({ ...a, activity: "Reunião" })))}
                            className="py-1.5 px-2 rounded bg-purple-600 text-white font-bold text-[11px]"
                          >
                            Chamar Reunião
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {topTab === "Avisos" && (
              <div className="p-3 space-y-2 overflow-y-auto flex-1">
                <div className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-1.5">
                  🔔 Radar de Oportunidades & Alertas
                </div>
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Monitorando velas da Binance em segundo plano...</p>
                ) : (
                  alerts.map((al, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                            al.side === "COMPRA"
                              ? "bg-emerald-100 text-emerald-800"
                              : al.side === "VENDA"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {al.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{al.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{al.detail}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {topTab === "Relatório" && (
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1 text-xs">
                <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1.5">
                  📊 Relatório Técnico do Expediente
                </div>
                {market ? (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ativo / Preço:</span>
                      <span className="font-bold font-mono">{market.symbol} ${fmt(market.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sinal do Comitê:</span>
                      <span className="font-extrabold">{market.signal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alvo (TP) / Stop (SL):</span>
                      <span className="font-mono">${fmt(market.tp)} / ${fmt(market.sl)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Força Compradora:</span>
                      <span className="font-bold">{(market.buyRatio * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">{market.riskNote}</p>
                  </div>
                ) : (
                  <p className="text-slate-500">Carregando métricas da Binance...</p>
                )}
              </div>
            )}

            {topTab === "Voz" && (
              <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
                <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1.5">
                  🎙️ Narração por Voz dos Agentes
                </div>
                <p className="text-slate-600 text-[11px]">
                  Quando ativado, o Max Trader avisa em voz alta em português sempre que surgir uma oportunidade aprovada de COMPRA ou VENDA.
                </p>
                <button
                  onClick={() => setVoiceEnabled((v) => !v)}
                  className={`w-full py-2 rounded-xl font-bold transition ${
                    voiceEnabled ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"
                  }`}
                >
                  {voiceEnabled ? "🔊 Narração por Voz ATIVADA" : "🔇 Ativar Narração por Voz"}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* MODAL DE CONFIGURAÇÃO DO AGENTE (IDÊNTICO AO VÍDEO 00:11 - 00:15 + MELHORIAS DE TRADING) */}
      {configAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 overflow-y-auto"
          onClick={() => setConfigAgent(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#fbfaf6] text-slate-900 p-5 shadow-2xl border border-slate-300 space-y-3.5 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Agente */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow border border-black/10"
                  style={{ backgroundColor: configAgent.color }}
                >
                  {configAgent.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950 leading-tight">{configAgent.name}</h3>
                  <p className="text-xs font-semibold text-emerald-700">
                    ● {configAgent.role} • Estação {configAgent.station || "C01"}
                  </p>
                  <p className="text-[11px] text-slate-500">{statusFor(configAgent, market)}</p>
                </div>
              </div>
              <button
                onClick={() => setConfigAgent(null)}
                className="rounded-lg bg-slate-200 hover:bg-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* NOME VISÍVEL & FUNÇÃO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  NOME VISÍVEL
                </label>
                <input
                  value={configAgent.name}
                  onChange={(e) => setConfigAgent({ ...configAgent, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  FUNÇÃO
                </label>
                <select
                  value={configAgent.role}
                  onChange={(e) => setConfigAgent({ ...configAgent, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                >
                  <option>Analista de Notícias</option>
                  <option>Analista Gráfica</option>
                  <option>Diretora de Risco</option>
                  <option>Executor de Ordens</option>
                </select>
              </div>
            </div>

            {/* ATIVIDADE: Atendendo | Pausa | Reunião | Foco (Move o agente pelo escritório!) */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                ATIVIDADE (MOVE O AGENTE NO ESCRITÓRIO)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["Atendendo", "Pausa", "Reunião", "Foco"] as const).map((act) => {
                  const active = (configAgent.activity || "Atendendo") === act;
                  return (
                    <button
                      key={act}
                      onClick={() => setConfigAgent({ ...configAgent, activity: act })}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        active
                          ? "bg-[#1e222d] text-white border-[#1e222d] shadow"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Estação {configAgent.station || "C01"} é a mesa fixa de {configAgent.name} quando está atendendo/operando.
              </p>
            </div>

            {/* HORÁRIO DE TRABALHO: INÍCIO | FIM | 24/7 */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                HORÁRIO DE TRABALHO
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="block text-[9px] text-slate-400 uppercase">INÍCIO</span>
                  <input
                    type="time"
                    value={configAgent.startTime || "08:00"}
                    disabled={configAgent.is247}
                    onChange={(e) => setConfigAgent({ ...configAgent, startTime: e.target.value, is247: false })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono disabled:opacity-50"
                  />
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] text-slate-400 uppercase">FIM</span>
                  <input
                    type="time"
                    value={configAgent.endTime || "18:00"}
                    disabled={configAgent.is247}
                    onChange={(e) => setConfigAgent({ ...configAgent, endTime: e.target.value, is247: false })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono disabled:opacity-50"
                  />
                </div>
                <div className="pt-3.5">
                  <button
                    onClick={() => setConfigAgent({ ...configAgent, is247: !configAgent.is247 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition ${
                      configAgent.is247
                        ? "bg-[#1e222d] text-amber-300 border-[#1e222d]"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    24/7
                  </button>
                </div>
              </div>
            </div>

            {/* DIAS DA SEMANA: S T Q Q S S D */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                DIAS DE OPERAÇÃO
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((d, i) => {
                  const days = configAgent.days || [true, true, true, true, true, true, true];
                  const on = days[i] ?? true;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const next = [...days];
                        next[i] = !on;
                        setConfigAgent({ ...configAgent, days: next });
                      }}
                      className={`py-1.5 rounded-lg text-xs font-extrabold border transition ${
                        on
                          ? "bg-[#1e222d] text-white border-[#1e222d]"
                          : "bg-white text-slate-400 border-slate-300"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONFIGURAÇÕES EXTRAS DE TRADING (MELHORIA) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  PERFIL DE RISCO
                </label>
                <select
                  value={configAgent.riskProfile || "Moderado"}
                  onChange={(e) => setConfigAgent({ ...configAgent, riskProfile: e.target.value as RiskProfile })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="Conservador">Conservador</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Agressivo">Agressivo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  DIREÇÃO PERMITIDA
                </label>
                <select
                  value={configAgent.allowedSide || "AMBOS"}
                  onChange={(e) => setConfigAgent({ ...configAgent, allowedSide: e.target.value as AllowedSide })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="AMBOS">Compra & Venda (Long/Short)</option>
                  <option value="COMPRA">Apenas Compra (Long)</option>
                  <option value="VENDA">Apenas Venda (Short)</option>
                </select>
              </div>
            </div>

            {/* CUSTOMIZAR APARÊNCIA */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                CUSTOMIZAR APARÊNCIA (COR DO TRAJE & CABELO)
              </label>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {SUIT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfigAgent({ ...configAgent, color: c })}
                      className={`w-5 h-5 rounded-full border-2 ${
                        configAgent.color === c ? "border-slate-950 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  {HAIR_COLORS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setConfigAgent({ ...configAgent, hair: h })}
                      className={`w-4 h-4 rounded-full border ${
                        configAgent.hair === h ? "border-slate-950 scale-110" : "border-slate-300"
                      }`}
                      style={{ backgroundColor: h }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* BOTÃO "ABRIR O CÉREBRO DE [NOME]" (IDÊNTICO AO VÍDEO) */}
            {onSelectAgent && (
              <button
                onClick={() => {
                  const saved = configAgent;
                  updateAgents(localAgents.map((a) => (a.id === saved.id ? saved : a)));
                  setConfigAgent(null);
                  onSelectAgent(saved);
                }}
                className="w-full py-2.5 rounded-xl bg-[#1e222d] hover:bg-slate-800 text-white font-extrabold text-xs tracking-wide transition shadow flex items-center justify-center gap-2"
              >
                🧠 Abrir o cérebro de {configAgent.name} (Prompt & Chat IA)
              </button>
            )}

            {/* SALVAR & DEMITIR */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() => {
                  updateAgents(localAgents.map((a) => (a.id === configAgent.id ? configAgent : a)));
                  setConfigAgent(null);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow transition"
              >
                Salvar Alterações
              </button>
              {localAgents.length > 1 && (
                <button
                  onClick={() => {
                    updateAgents(localAgents.filter((a) => a.id !== configAgent.id));
                    setConfigAgent(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition"
                >
                  Demitir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
