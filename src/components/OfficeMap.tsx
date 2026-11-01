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

              {/* Piso Principal
