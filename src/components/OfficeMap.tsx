import React, { useEffect, useMemo, useRef, useState } from "react";
import { fmt, marketContext, parseIntent, type Market } from "@/lib/trading";
import { agentChat } from "@/lib/agent.functions";

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
  autonomous?: boolean;
}

export const ROOMS = [
  { id: 0, title: "Pesquisa & Notícias", code: "C01" },
  { id: 1, title: "Análise Gráfica", code: "C02" },
  { id: 2, title: "Gestão de Risco", code: "C03" },
  { id: 3, title: "Mesa de Execução", code: "C04" },
];

const HIRE_CATALOG = [
  {
    name: "Rafael",
    role: "Analista Gráfica",
    color: "#2563eb",
    hair: "#1e293b",
    station: "C05",
    desc: "Monitora rompimentos de suporte, resistência e explosões de volume em 5m e 15m.",
    why: "identifica movimentos fortes no início da tendência antes das médias.",
    prompt: "Você é Rafael, especialista em price action, rompimentos de suporte/resistência e volume explosivo.",
  },
  {
    name: "Caio",
    role: "Analista de Notícias",
    color: "#0891b2",
    hair: "#451a03",
    station: "C06",
    desc: "Rastreia agressão compradora/vendedora no livro de ofertas e fluxo institucional.",
    why: "filtra entradas falsas confirmando se as baleias estão comprando ou vendendo.",
    prompt: "Você é Caio, analista de fluxo de ordens (order flow), agressão de compra/venda e liquidez.",
  },
  {
    name: "Bia",
    role: "Analista Gráfica",
    color: "#db2777",
    hair: "#7c2d12",
    station: "C07",
    desc: "Opera exaustão de preço, divergências de RSI e retorno às médias em operações rápidas.",
    why: "aproveita reversões rápidas tanto na COMPRA (Long) quanto na VENDA (Short).",
    prompt: "Você é Bia, especialista em scalping quantitativo, divergências de RSI e retorno às médias móveis.",
  },
  {
    name: "Leo",
    role: "Diretora de Risco",
    color: "#dc2626",
    hair: "#facc15",
    station: "C08",
    desc: "Protege o patrimônio movendo o Stop Loss para o breakeven e travando lucros.",
    why: "impede que operações vencedoras voltem e fechem no prejuízo.",
    prompt: "Você é Leo, gestor de risco focado em proteção de drawdown, relação retorno/risco 2:1 e breakeven.",
  },
];

const SUIT_COLORS = ["#2563eb", "#9333ea", "#dc2626", "#16a34a", "#0891b2", "#ea580c", "#db2777", "#4f46e5"];
const DAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// Coordenadas isométricas precisas no SVG 920x540
const DESK_COORDS: Record<string, { x: number; y: number; label: string }> = {
  C01: { x: 540, y: 215, label: "Estação C01" },
  C02: { x: 590, y: 240, label: "Estação C02" },
  C03: { x: 640, y: 265, label: "Estação C03" },
  C04: { x: 690, y: 290, label: "Estação C04" },
  C05: { x: 470, y: 260, label: "Estação C05" },
  C06: { x: 520, y: 285, label: "Estação C06" },
  C07: { x: 570, y: 310, label: "Estação C07" },
  C08: { x: 620, y: 335, label: "Estação C08" },
};

const ACTIVITY_SPOTS: Record<ActivityMode, Array<{ x: number; y: number; label: string }>> = {
  Atendendo: Object.values(DESK_COORDS),
  Pausa: [
    { x: 245, y: 310, label: "Mesa de Sinuca" },
    { x: 185, y: 268, label: "Balcão de Café" },
    { x: 305, y: 340, label: "Sofá de Descanso" },
    { x: 225, y: 235, label: "Fliperama" },
  ],
  Reunião: [
    { x: 395, y: 385, label: "Comitê de Risco" },
    { x: 430, y: 403, label: "Comitê de Risco" },
    { x: 465, y: 420, label: "Comitê de Risco" },
    { x: 375, y: 410, label: "Comitê de Risco" },
  ],
  Foco: [
    { x: 355, y: 140, label: "Mesa da Diretoria" },
    { x: 310, y: 162, label: "Sofá Executivo" },
    { x: 400, y: 165, label: "Laboratório Quant" },
    { x: 275, y: 185, label: "Sala Estratégica" },
  ],
};

export function statusFor(agent: Agent, market: Market | null): string {
  const act = agent.activity || "Atendendo";
  const st = agent.station || `C0${(agent.room % 8) + 1}`;
  if (act === "Pausa") return `Em pausa • Descompressão`;
  if (act === "Reunião") return `Em reunião • Comitê de Risco`;
  if (act === "Foco") return `Em foco • Sala da Diretoria`;
  if (!market) return `Analisando na Estação ${st}`;
  const r = agent.role.toLowerCase();
  if (r.includes("notícia") || r.includes("noticia") || r.includes("pesquisa") || agent.room === 0) {
    return `Pesquisa ${market.research.trend} • Vol ${(market.buyRatio * 100).toFixed(0)}% (${st})`;
  }
  if (r.includes("gráfica") || r.includes("grafica") || r.includes("quant") || agent.room === 1) {
    return `Gráfico ${market.chart.trend} • RSI ${fmt(market.rsi, 0)} (${st})`;
  }
  if (r.includes("risco") || agent.room === 2) {
    return market.riskApproved ? `Risco ✓ Aprovado (${st})` : `Risco ✗ Vetado (${st})`;
  }
  return `Sinal: ${market.signal} (${st})`;
}

interface ChatMsg {
  from: "user" | "agent";
  text: string;
  time: string;
}

interface NoticeItem {
  id: string;
  time: string;
  agentName: string;
  agentColor: string;
  title: string;
  text: string;
  signal: "COMPRA" | "VENDA" | "AVISO";
}

export function OfficeMap(props: {
  agents: Agent[];
  market: Market | null;
  onSelectAgent?: (a: Agent) => void;
  onSelect?: (a: Agent) => void;
}) {
  const { agents: propAgents, market } = props;

  const [localAgents, setLocalAgents] = useState<Agent[]>(propAgents);
  const [topTab, setTopTab] = useState<"Quadro" | "Avisos" | "Relatório" | "Voz" | null>(null);
  const [subTab, setSubTab] = useState<"EQUIPE" | "CONTRATAR" | "ANDAR">("EQUIPE");
  const [activeModalAgent, setActiveModalAgent] = useState<Agent | null>(null);
  const [modalView, setModalView] = useState<"CHAT" | "CONFIG">("CHAT");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [spawningIds, setSpawningIds] = useState<Record<string, boolean>>({});
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [autonomyEnabled, setAutonomyEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [floorName, setFloorName] = useState("18º Andar • Mesa de Operações");
  const [clock, setClock] = useState("12:48");
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveToast, setLiveToast] = useState<NoticeItem | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSignalRef = useRef<string>("");

  // Inicializa agentes com estações C01..C08
  useEffect(() => {
    try {
      const saved = localStorage.getItem("td_agents_v3");
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
        autonomous: true,
      }))
    );
  }, [propAgents]);

  const saveAgentsList = (next: Agent[]) => {
    setLocalAgents(next);
    try {
      localStorage.setItem("td_agents_v3", JSON.stringify(next));
      localStorage.setItem("td_agents", JSON.stringify(next));
    } catch { /* */ }
  };

  // Relógio da barra de Expediente
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 5));
    tick();
    const i = setInterval(tick, 10000);
    return () => clearInterval(i);
  }, []);

  // Função para disparar Aviso Autônomo (Toast na tela + Sino + Som)
  const pushNotice = (item: Omit<NoticeItem, "id" | "time">) => {
    const now = new Date().toTimeString().slice(0, 5);
    const full: NoticeItem = { ...item, id: String(Date.now() + Math.random()), time: now };
    setNotices((prev) => [full, ...prev].slice(0, 20));
    setUnreadCount((c) => c + 1);
    setLiveToast(full);
    setTimeout(() => {
      setLiveToast((cur) => (cur?.id === full.id ? null : cur));
    }, 6500);
  };

  // AUTONOMIA DOS AGENTES NO ESCRITÓRIO: caminham sozinhos, fazem reuniões de comitê, tomam café e emitem avisos!
  useEffect(() => {
    if (!autonomyEnabled) return;
    const interval = setInterval(() => {
      setLocalAgents((prev) => {
        if (prev.length === 0) return prev;
        const idx = Math.floor(Math.random() * prev.length);
        const chosen = prev[idx];
        if (!chosen) return prev;

        const sig = market?.signal || "AGUARDAR";
        let nextAct: ActivityMode = "Atendendo";
        let thought = "";

        const roll = Math.random();
        if (sig === "AGUARDAR" && roll < 0.35) {
          nextAct = "Pausa";
          thought = "Mercado lateral... vou tomar um café ☕";
        } else if (roll < 0.55) {
          nextAct = "Reunião";
          thought = sig !== "AGUARDAR" ? `Validando ${sig} no Comitê!` : "Alinhando risco na mesa...";
        } else if (roll < 0.72) {
          nextAct = "Foco";
          thought = "Analisando liquidez na Diretoria 🎯";
        } else {
          nextAct = "Atendendo";
          thought = sig !== "AGUARDAR" ? `Sinal ${sig} ativo na ${chosen.station}!` : `Monitorando velas na ${chosen.station}`;
        }

        setBubbles((b) => ({ ...b, [chosen.id]: thought }));
        setTimeout(() => {
          setBubbles((b) => {
            const copy = { ...b };
            delete copy[chosen.id];
            return copy;
          });
        }, 7000);

        return prev.map((a, i) => (i === idx ? { ...a, activity: nextAct } : a));
      });
    }, 11000);

    return () => clearInterval(interval);
  }, [autonomyEnabled, market?.signal]);

  // Avisos automáticos sempre que o mercado atualiza ou muda de sinal
  useEffect(() => {
    if (!market) return;
    const sigKey = `${market.symbol}-${market.signal}-${Math.round(market.price / 25)}`;
    if (sigKey === lastSignalRef.current) return;
    lastSignalRef.current = sigKey;

    if (market.signal === "COMPRA" || market.signal === "VENDA") {
      const sofia = localAgents.find((a) => a.role.includes("Gráfica")) || localAgents[0];
      pushNotice({
        agentName: sofia?.name || "Sofia Quant",
        agentColor: sofia?.color || "#9333ea",
        title: `🚨 Oportunidade de ${market.signal} em ${market.symbol}`,
        text: `Entrada $${fmt(market.price)} • SL $${fmt(market.sl)} • TP $${fmt(market.tp)} (${market.chart.note})`,
        signal: market.signal,
      });

      if (voiceEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(
            `Aviso da mesa: oportunidade de ${market.signal} em ${market.symbol} a ${fmt(market.price, 0)} dólares.`
          );
          u.lang = "pt-BR";
          window.speechSynthesis.speak(u);
        } catch { /* */ }
      }
    } else {
      const rita = localAgents.find((a) => a.role.includes("Risco")) || localAgents[0];
      pushNotice({
        agentName: rita?.name || "Rita Risk",
        agentColor: rita?.color || "#dc2626",
        title: `🔍 Revisão de Mercado (${market.symbol})`,
        text: `Preço $${fmt(market.price)} • RSI ${fmt(market.rsi, 0)} • ${market.riskNote}`,
        signal: "AVISO",
      });
    }
  }, [market?.signal, market?.price]);

  const counts = useMemo(() => {
    const c = { Atendendo: 0, Pausa: 0, Reunião: 0, Foco: 0 };
    localAgents.forEach((a) => {
      const mode = a.activity || "Atendendo";
      c[mode] = (c[mode] || 0) + 1;
    });
    return c;
  }, [localAgents]);

  const openAgentModal = (ag: Agent, view: "CHAT" | "CONFIG" = "CHAT") => {
    setActiveModalAgent({ ...ag });
    setModalView(view);
    setChats((prev) => {
      if (prev[ag.id]?.length) return prev;
      const welcome = market
        ? `Olá! Aqui é ${ag.name} (${ag.role}) na Estação ${ag.station || "C01"}. Estou monitorando o ${market.symbol} a $${fmt(market.price)} (RSI ${fmt(market.rsi, 0)}, sinal atual: ${market.signal}). O que você gostaria de perguntar ou comandar?`
        : `Olá! Aqui é ${ag.name} (${ag.role}). Pode me perguntar sobre o gráfico, tendências, notícias ou comandar operações!`;
      return {
        ...prev,
        [ag.id]: [{ from: "agent", text: welcome, time: new Date().toTimeString().slice(0, 5) }],
      };
    });
  };

  const sendQuestionToAgent = async () => {
    if (!activeModalAgent) return;
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    const ag = activeModalAgent;
    const now = new Date().toTimeString().slice(0, 5);
    setChatInput("");
    setChats((prev) => ({
      ...prev,
      [ag.id]: [...(prev[ag.id] || []), { from: "user", text: q, time: now }],
    }));
    setChatBusy(true);

    const intent = parseIntent(q);
    let actionMsg = "";
    if (intent === "CLOSE") actionMsg = "Solicitação de encerramento de posições enviada à mesa.";
    else if (intent === "BUY") actionMsg = "Ordem de COMPRA enviada ao Max Trader.";
    else if (intent === "SELL") actionMsg = "Ordem de VENDA enviada ao Max Trader.";

    const ctx = market
      ? marketContext(market)
      : "Mercado em carregamento; responda com base na sua função na mesa de trading.";

    let replyText = "";
    try {
      const res = await agentChat({
        data: {
          system: ag.prompt,
          role: `${ag.name} (${ag.role})`,
          question: q,
          context: ctx,
          action: actionMsg,
        },
      });
      replyText = res.ok ? res.text : `⚠️ ${res.error}`;
    } catch {
      replyText = market
        ? `Aqui é ${ag.name}: analisando ${market.symbol} agora em $${fmt(market.price)} (RSI ${fmt(market.rsi, 0)}, EMA9 $${fmt(market.ema9)} vs EMA21 $${fmt(market.ema21)}). Pesquisa: ${market.research.trend} | Gráfico: ${market.chart.trend} | Sinal: ${market.signal} (SL $${fmt(market.sl)} / TP $${fmt(market.tp)}).`
        : `Aqui é ${ag.name}: estou acompanhando o fluxo das velas na Estação ${ag.station || "C01"}.`;
    }

    setChats((prev) => ({
      ...prev,
      [ag.id]: [...(prev[ag.id] || []), { from: "agent", text: replyText, time: new Date().toTimeString().slice(0, 5) }],
    }));
    setChatBusy(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const hireSpecialist = (tpl: (typeof HIRE_CATALOG)[number]) => {
    const id = `ag_${Date.now()}`;
    const used = new Set(localAgents.map((a) => a.station));
    const freeStation = Object.keys(DESK_COORDS).find((k) => !used.has(k)) || tpl.station;
    const newAg: Agent = {
      id,
      name: tpl.name,
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
      autonomous: true,
    };
    setSpawningIds((s) => ({ ...s, [id]: true }));
    saveAgentsList([...localAgents, newAg]);
    pushNotice({
      agentName: newAg.name,
      agentColor: newAg.color,
      title: `👋 Novo Agente Contratado!`,
      text: `${newAg.name} (${newAg.role}) entrou pela recepção e assumiu a ${freeStation}.`,
      signal: "AVISO",
    });
    setTimeout(() => {
      setSpawningIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }, 1500);
  };

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #334155",
        background: "#0f172a",
        boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* BARRA SUPERIOR DOURADA COMPACTA E RESPONSIVA (IDÊNTICA AO VÍDEO) */}
      <div
        style={{
          background: "linear-gradient(90deg, #f6d345 0%, #f4c63d 55%, #eab308 100%)",
          color: "#0f172a",
          padding: "8px 12px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderBottom: "1px solid rgba(15,23,42,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ paddingRight: 10, borderRight: "1px solid rgba(15,23,42,0.2)" }}>
            <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, fontFamily: "monospace" }}>{clock}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>EXPEDIENTE</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{counts.Atendendo}</div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>atendendo</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{counts.Pausa}</div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>em pausa</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{counts.Reunião}</div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>reunião</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{counts.Foco}</div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>foco</div>
            </div>
          </div>
        </div>

        {/* Botões Compactos: Quadro | Avisos | Relatório | Voz */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(["Quadro", "Avisos", "Relatório", "Voz"] as const).map((tab) => {
            const isAct = topTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setTopTab(isAct ? null : tab);
                  if (tab === "Avisos") setUnreadCount(0);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: isAct ? "1px solid #0f172a" : "1px solid rgba(15,23,42,0.2)",
                  background: isAct ? "#0f172a" : "rgba(255,255,255,0.45)",
                  color: isAct ? "#fde047" : "#0f172a",
                  position: "relative",
                }}
              >
                {tab === "Avisos" ? `🔔 Avisos${unreadCount > 0 ? ` (${unreadCount})` : ""}` : tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTAINER DO CENÁRIO DO VÍDEO (FUNDO TURQUESA SUAVE E PISO SÓLIDO CLARO) */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #6ab7b9 0%, #92c8c0 55%, #dcd8bc 100%)",
          minHeight: 370,
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Pílula compacta no canto superior esquerdo */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "rgba(255,255,255,0.92)",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            color: "#0f172a",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🏢 {floorName}</span>
          <span style={{ color: "#059669", fontWeight: 800 }}>• {localAgents.length} agentes</span>
        </div>

        {/* Botão Flutuante Direto: "💬 Perguntar aos Agentes" no canto superior direito */}
        <button
          onClick={() => openAgentModal(localAgents[0] || propAgents[0]!, "CHAT")}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            background: "#0f172a",
            color: "#fde047",
            padding: "5px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            border: "1px solid #fde047",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          💬 Perguntar aos Agentes
        </button>

        {/* TOAST DE AVISO AUTÔNOMO DOS AGENTES */}
        {liveToast && (
          <div
            onClick={() => {
              const ag = localAgents.find((a) => a.name === liveToast.agentName) || localAgents[0];
              if (ag) openAgentModal(ag, "CHAT");
              setLiveToast(null);
            }}
            style={{
              position: "absolute",
              bottom: 34,
              left: 12,
              right: 12,
              zIndex: 20,
              background: "rgba(15, 23, 42, 0.95)",
              color: "#f8fafc",
              padding: "9px 12px",
              borderRadius: 12,
              borderLeft: `4px solid ${
                liveToast.signal === "COMPRA" ? "#22c55e" : liveToast.signal === "VENDA" ? "#ef4444" : "#facc15"
              }`,
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 800, color: "#fde047" }}>
                {liveToast.title} • <span style={{ color: "#cbd5e1" }}>{liveToast.agentName}</span>
              </div>
              <div style={{ color: "#e2e8f0", marginTop: 2 }}>{liveToast.text}</div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "4px 8px",
                borderRadius: 6,
                background: "#fde047",
                color: "#0f172a",
                whiteSpace: "nowrap",
              }}
            >
              Responder 💬
            </span>
          </div>
        )}

        {/* Barra de Dica Inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 10,
            zIndex: 10,
            background: "rgba(15,23,42,0.78)",
            color: "#f1f5f9",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          👆 Toque em qualquer agente para fazer perguntas à IA ou configurar horário, função e atividade
        </div>

        {/* SVG ISOMÉTRICO CORRIGIDO (SEM XADREZ PRETO — PISO CREME CLARO SÓLIDO + PISO DE MADEIRA QUENTE) */}
        <svg viewBox="0 0 920 520" style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <filter id="floorDropShadow" x="-15%" y="-15%" width="130%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.32" />
            </filter>
            {/* Piso Claro Creme Sólido com rejunte sutil (Sem fundo transparente!) */}
            <pattern id="creamTileFloor" width="28" height="14" patternUnits="userSpaceOnUse">
              <rect width="28" height="14" fill="#f3f1e8" />
              <path d="M 14 0 L 28 7 L 14 14 L 0 7 Z" fill="#f7f5ee" stroke="#e4e0d3" strokeWidth="0.8" />
            </pattern>
            {/* Piso de Madeira Sólido Quente (Sem fundo transparente!) */}
            <pattern id="warmWoodFloor" width="24" height="12" patternUnits="userSpaceOnUse">
              <rect width="24" height="12" fill="#d4944e" />
              <path d="M 12 0 L 24 6 L 12 12 L 0 6 Z" fill="#de9f58" stroke="#be7f3a" strokeWidth="0.7" />
            </pattern>
          </defs>

          <g filter="url(#floorDropShadow)">
            {/* Base e bordas 3D da laje do prédio */}
            <polygon points="440,42 850,247 460,492 50,287" fill="#1e293b" />
            <polygon points="50,287 460,492 460,508 50,303" fill="#334155" />
            <polygon points="850,247 460,492 460,508 850,263" fill="#0f172a" />

            {/* PISO PRINCIPAL CLARO (Salão de Operações e Lounge) */}
            <polygon points="440,48 838,247 460,484 62,285" fill="url(#creamTileFloor)" />

            {/* PISO DE MADEIRA: DIRETORIA EXECUTIVA (Topo Esquerdo) */}
            <polygon points="340,98 475,165 360,232 225,165" fill="url(#warmWoodFloor)" stroke="#b0702c" strokeWidth="1.2" />

            {/* PISO DE MADEIRA: RECEPÇÃO (Topo Central/Direito) */}
            <polygon points="485,82 620,150 540,200 405,132" fill="url(#warmWoodFloor)" stroke="#b0702c" strokeWidth="1.2" />

            {/* PISO SALA DE REUNIÃO / COMITÊ DE RISCO (Inferior Central) */}
            <polygon points="355,342 530,430 455,478 280,390" fill="#eae6d9" stroke="#cbd5e1" strokeWidth="1.2" />

            {/* PAREDES TRASEIRAS ESCURAS COM ACABAMENTO SUPERIOR */}
            <polygon points="62,285 440,48 440,16 62,253" fill="#1e222d" stroke="#0f172a" strokeWidth="1" />
            <polygon points="440,48 838,247 838,215 440,16" fill="#252a37" stroke="#0f172a" strokeWidth="1" />

            {/* Quadro Branco com Gráfico na Diretoria */}
            <polygon points="365,80 420,46 420,28 365,62" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
            <polyline points="370,55 385,43 396,47 414,33" fill="none" stroke="#16a34a" strokeWidth="2.2" />

            {/* Painel Dourado na Recepção */}
            <polygon points="470,50 525,78 525,60 470,32" fill="#18181b" stroke="#f59e0b" strokeWidth="1.3" />
            <text x="497" y="57" fontSize="7" fill="#facc15" fontWeight="bold" textAnchor="middle">
              TRADING
            </text>

            {/* DIVISÓRIAS INTERNAS DE VIDRO TRANSLÚCIDO */}
            <polygon points="225,165 360,232 360,206 225,139" fill="#38bdf8" fillOpacity="0.22" stroke="#bae6fd" strokeWidth="1.2" />
            <polygon points="360,232 475,165 475,139 360,206" fill="#0ea5e9" fillOpacity="0.18" stroke="#bae6fd" strokeWidth="1.2" />
            <polygon points="405,132 465,162 465,138 405,108" fill="#38bdf8" fillOpacity="0.24" stroke="#e0f2fe" strokeWidth="1.2" />
            <polygon points="495,177 540,200 540,176 495,153" fill="#38bdf8" fillOpacity="0.24" stroke="#e0f2fe" strokeWidth="1.2" />
            <polygon points="355,342 530,430 530,404 355,316" fill="#38bdf8" fillOpacity="0.22" stroke="#bae6fd" strokeWidth="1.2" />
            <polygon points="280,390 355,342 355,316 280,364" fill="#0284c7" fillOpacity="0.24" stroke="#bae6fd" strokeWidth="1.2" />

            {/* 1. DIRETORIA EXECUTIVA (Sofá Caramelo + Mesa Diretor + Tapete) */}
            <polygon points="285,155 345,122 390,145 330,178" fill="#e7e2d3" opacity="0.7" />
            <g transform="translate(290, 140)">
              <polygon points="0,12 30,-4 44,3 14,19" fill="#c2591a" />
              <polygon points="0,12 0,3 30,-13 30,-4" fill="#9a3412" />
              <polygon points="14,19 44,3 44,10 14,26" fill="#7c2d12" />
            </g>
            <g transform="translate(362, 130)">
              <polygon points="0,10 28,-4 44,4 16,18" fill="#78350f" />
              <polygon points="16,18 44,4 44,11 16,25" fill="#451a03" />
              <polygon points="18,4 27,0 27,-7 18,-3" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.7" />
            </g>

            {/* 2. BALCÃO DA RECEPÇÃO */}
            <g transform="translate(472, 130)">
              <polygon points="0,8 32,24 24,30 -8,14" fill="#fde68a" stroke="#d97706" strokeWidth="0.9" />
              <polygon points="-8,14 24,30 24,38 -8,22" fill="#d97706" />
              <text x="6" y="25" fontSize="6" fill="#451a03" fontWeight="bold" textAnchor="middle">
                RECEPÇÃO
              </text>
            </g>

            {/* 3. LOUNGE DE DESCOMPRESSÃO: 2 FLIPERAMAS, MESA DE SINUCA AZUL, SOFÁ VERDE E CAFÉ */}
            <g transform="translate(188, 210)">
              <polygon points="0,0 14,-8 22,-4 8,4" fill="#1e1b4b" />
              <polygon points="0,0 8,4 8,24 0,20" fill="#312e81" />
              <polygon points="8,4 22,-4 22,16 8,24" fill="#0f172a" />
              <polygon points="10,6 19,1 19,9 10,14" fill="#22d3ee" />
            </g>
            <g transform="translate(212, 196)">
              <polygon points="0,0 14,-8 22,-4 8,4" fill="#1e1b4b" />
              <polygon points="0,0 8,4 8,24 0,20" fill="#3730a3" />
              <polygon points="8,4 22,-4 22,16 8,24" fill="#0f172a" />
              <polygon points="10,6 19,1 19,9 10,14" fill="#f472b6" />
            </g>
            <g transform="translate(142, 262)">
              <polygon points="0,6 38,25 30,31 -8,12" fill="#334155" />
              <polygon points="-8,12 30,31 30,40 -8,21" fill="#1e293b" />
            </g>
            {/* Mesa de Sinuca Azul */}
            <g transform="translate(220, 302)">
              <polygon points="0,14 38,-6 66,8 28,28" fill="#0284c7" stroke="#92400e" strokeWidth="2.8" />
              <polygon points="0,14 28,28 28,35 0,21" fill="#78350f" />
              <polygon points="28,28 66,8 66,15 28,35" fill="#451a03" />
              <circle cx="31" cy="11" r="1.7" fill="#facc15" />
              <circle cx="37" cy="9" r="1.7" fill="#ef4444" />
              <circle cx="27" cy="14" r="1.7" fill="#ffffff" />
            </g>
            {/* Sofá Verde */}
            <g transform="translate(295, 328)">
              <polygon points="0,10 26,-4 38,2 12,16" fill="#4ade80" stroke="#16a34a" strokeWidth="0.8" />
              <polygon points="12,16 38,2 38,8 12,22" fill="#15803d" />
            </g>

            {/* 4. SALA DE REUNIÃO / COMITÊ DE RISCO */}
            <g transform="translate(378, 386)">
              <polygon points="0,12 44,-10 96,16 52,38" fill="#d99b52" stroke="#92400e" strokeWidth="1.2" />
              <polygon points="0,12 52,38 52,44 0,18" fill="#92400e" />
              <polygon points="52,38 96,16 96,22 52,44" fill="#78350f" />
              <text x="48" y="18" fontSize="6.5" fill="#451a03" fontWeight="bold" textAnchor="middle">
                COMITÊ DE RISCO
              </text>
            </g>

            {/* 5. SALÃO PRINCIPAL: 2 ILHAS LONGAS DE COMPUTADORES (C01 a C08) */}
            <g transform="translate(515, 202)">
              <polygon points="0,14 34,-4 200,79 166,97" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
              <polygon points="0,14 166,97 166,105 0,22" fill="#cbd5e1" />
              <polygon points="166,97 200,79 200,87 166,105" fill="#94a3b8" />
            </g>
            <g transform="translate(445, 248)">
              <polygon points="0,14 34,-4 200,79 166,97" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
              <polygon points="0,14 166,97 166,105 0,22" fill="#cbd5e1" />
              <polygon points="166,97 200,79 200,87 166,105" fill="#94a3b8" />
            </g>

            {/* Monitores nas 8 Estações */}
            {Object.entries(DESK_COORDS).map(([code, pos]) => (
              <g key={code} transform={`translate(${pos.x}, ${pos.y})`}>
                <polygon points="-8,-12 4,-6 4,2 -8,-4" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.9" />
                <text x="0" y="24" fontSize="6.5" fill="#475569" fontWeight="bold" textAnchor="middle">
                  {code}
                </text>
              </g>
            ))}

            {/* Plantas Verdes */}
            {[
              { x: 432, y: 70 },
              { x: 615, y: 152 },
              { x: 345, y: 332 },
              { x: 775, y: 248 },
            ].map((p, idx) => (
              <g key={idx} transform={`translate(${p.x}, ${p.y})`}>
                <rect x="-4" y="0" width="8" height="7" rx="1" fill="#b45309" />
                <circle cx="0" cy="-4" r="6" fill="#16a34a" />
                <circle cx="-3" cy="-2" r="4" fill="#22c55e" />
              </g>
            ))}
          </g>

          {/* CAMADA DOS AGENTES COM MOVIMENTAÇÃO AUTÔNOMA E BALÕES */}
          {localAgents.map((ag, idx) => {
            const mode = ag.activity || "Atendendo";
            const stCode = ag.station || `C0${(idx % 8) + 1}`;
            const isSpawning = !!spawningIds[ag.id];

            let target = DESK_COORDS[stCode] || DESK_COORDS.C01!;
            if (mode !== "Atendendo") {
              const spots = ACTIVITY_SPOTS[mode];
              target = spots[idx % spots.length] || target;
            }
            const x = isSpawning ? 475 : target.x;
            const y = isSpawning ? 155 : target.y;

            const bubbleText = bubbles[ag.id];
            const isHovered = hoveredId === ag.id;
            const pillColor =
              mode === "Pausa"
                ? "#f59e0b"
                : mode === "Reunião"
                ? "#7c3aed"
                : market?.signal === "COMPRA"
                ? "#16a34a"
                : market?.signal === "VENDA"
                ? "#dc2626"
                : "#ea580c";

            return (
              <g
                key={ag.id}
                transform={`translate(${x}, ${y})`}
                style={{ transition: "transform 1.35s cubic-bezier(0.22, 1, 0.36, 1)", cursor: "pointer" }}
                onClick={() => openAgentModal(ag, "CHAT")}
                onMouseEnter={() => setHoveredId(ag.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <ellipse cx="0" cy="12" rx="9" ry="4.5" fill="#0f172a" fillOpacity="0.32" />
                {mode === "Atendendo" && !isSpawning && (
                  <ellipse cx="0" cy="7" rx="7" ry="4" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                )}
                <rect x="-4" y="3" width="3.2" height="7" rx="1" fill="#1e293b" />
                <rect x="0.8" y="3" width="3.2" height="7" rx="1" fill="#1e293b" />
                <rect x="-6" y="-8" width="12" height="12" rx="3" fill={ag.color} stroke="#ffffff" strokeWidth="0.8" />
                <circle cx="0" cy="-14" r="5.5" fill="#fde68a" />
                <path d="M -5.5 -15 Q 0 -22 5.5 -15 Z" fill={ag.hair || "#111827"} />
                <circle cx="-2" cy="-14" r="0.8" fill="#0f172a" />
                <circle cx="2" cy="-14" r="0.8" fill="#0f172a" />

                {/* Pílula do Nome + Estação (Estilo do Vídeo) */}
                <g transform="translate(0, -28)">
                  <rect x="-38" y="-9" width="76" height="13" rx="6.5" fill={pillColor} stroke="#ffffff" strokeWidth="0.8" />
                  <text x="0" y="-0.5" fontSize="6.3" fill="#ffffff" fontWeight="bold" textAnchor="middle">
                    {isSpawning ? "Recepção -> Mesa" : `${ag.name.slice(0, 10)} • ${mode === "Atendendo" ? stCode : mode}`}
                  </text>
                </g>

                {/* Balão de Fala Autônomo quando o agente toma uma decisão */}
                {bubbleText && !isHovered && (
                  <g transform="translate(0, -45)">
                    <rect x="-68" y="-12" width="136" height="15" rx="5" fill="#0f172a" stroke="#fde047" strokeWidth="0.8" />
                    <text x="0" y="-2" fontSize="6" fill="#fde047" fontWeight="bold" textAnchor="middle">
                      {bubbleText}
                    </text>
                  </g>
                )}

                {/* Card Branco Detalhado ao tocar/hover */}
                {isHovered && (
                  <g transform="translate(14, -54)">
                    <rect x="0" y="0" width="170" height="44" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="8" y="13" fontSize="8.5" fill="#0f172a" fontWeight="bold">
                      {ag.name}
                    </text>
                    <circle cx="8" cy="22" r="2.5" fill="#16a34a" />
                    <text x="14" y="24.5" fontSize="7" fill="#334155" fontWeight="bold">
                      {ag.role}
                    </text>
                    <text x="8" y="36" fontSize="6.3" fill="#64748b">
                      {statusFor(ag, market)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* PAINEL EXPANSÍVEL QUANDO CLICA EM QUADRO / AVISOS / RELATÓRIO / VOZ */}
      {topTab && (
        <div style={{ background: "#f8f7f2", color: "#0f172a", borderTop: "1px solid #cbd5e1", padding: 12 }}>
          {topTab === "Quadro" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 }}>
                {(["EQUIPE", "CONTRATAR", "ANDAR"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubTab(st)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      background: subTab === st ? "#0f172a" : "#e2e8f0",
                      color: subTab === st ? "#ffffff" : "#334155",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {subTab === "EQUIPE" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
                  {localAgents.map((ag) => (
                    <div
                      key={ag.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 99, background: ag.color, display: "inline-block" }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800 }}>{ag.name}</div>
                            <div style={{ fontSize: 10, color: "#047857", fontWeight: 700 }}>
                              ● {ag.role} • {ag.station || "C01"}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                          {ag.activity || "Atendendo"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{statusFor(ag, market)}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <button
                          onClick={() => openAgentModal(ag, "CHAT")}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: "#0f172a",
                            color: "#fde047",
                            fontSize: 11,
                            fontWeight: 800,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          💬 Fazer Pergunta
                        </button>
                        <button
                          onClick={() => openAgentModal(ag, "CONFIG")}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "#e2e8f0",
                            color: "#0f172a",
                            fontSize: 11,
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          ⚙️ Configurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {subTab === "CONTRATAR" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
                  {HIRE_CATALOG.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800 }}>
                        {item.name} — {item.role}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{item.desc}</div>
                      <div style={{ fontSize: 10, background: "#f1f5f9", padding: 6, borderRadius: 6 }}>
                        <strong>Por que vale:</strong> {item.why}
                      </div>
                      <button
                        onClick={() => hireSpecialist(item)}
                        style={{
                          padding: "7px",
                          borderRadius: 8,
                          background: "#0f172a",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        + contratar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {subTab === "ANDAR" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                  <div>
                    <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Nome do Andar:</label>
                    <input
                      value={floorName}
                      onChange={(e) => setFloorName(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>Autonomia dos Agentes no Escritório</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Agentes caminham entre mesas, reunião, diretoria e café sozinhos</div>
                    </div>
                    <button
                      onClick={() => setAutonomyEnabled((v) => !v)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 11,
                        border: "none",
                        background: autonomyEnabled ? "#16a34a" : "#64748b",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      {autonomyEnabled ? "Autonomia ATIVA" : "Pausada"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {topTab === "Avisos" && (
            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>🔔 Avisos e Oportunidades dos Agentes</div>
              {notices.length === 0 ? (
                <div style={{ fontSize: 11, color: "#64748b" }}>Monitorando oportunidades da Binance em segundo plano...</div>
              ) : (
                notices.map((n) => (
                  <div key={n.id} style={{ background: "#ffffff", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>
                        {n.title} ({n.agentName})
                      </span>
                      <span style={{ fontFamily: "monospace", color: "#64748b" }}>{n.time}</span>
                    </div>
                    <div style={{ color: "#334155", marginTop: 3 }}>{n.text}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {topTab === "Relatório" && (
            <div style={{ fontSize: 12, background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>📊 Resumo Consolidado da Mesa</div>
              {market ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                  <div>
                    <strong>Ativo:</strong> {market.symbol} (${fmt(market.price)})
                  </div>
                  <div>
                    <strong>Sinal:</strong> {market.signal}
                  </div>
                  <div>
                    <strong>Stop Loss:</strong> ${fmt(market.sl)}
                  </div>
                  <div>
                    <strong>Take Profit:</strong> ${fmt(market.tp)}
                  </div>
                  <div style={{ gridColumn: "1 / -1", color: "#475569" }}>{market.riskNote}</div>
                </div>
              ) : (
                <div>Lendo dados da Binance...</div>
              )}
            </div>
          )}

          {topTab === "Voz" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>🎙️ Avisos por Voz em Português</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Fala automaticamente quando uma oportunidade de COMPRA ou VENDA é aprovada</div>
              </div>
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 11,
                  border: "none",
                  background: voiceEnabled ? "#16a34a" : "#0f172a",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {voiceEnabled ? "🔊 Voz ATIVA" : "🔇 Ativar Voz"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL UNIFICADO DO AGENTE: ABA "💬 PERGUNTAR À IA" + ABA "⚙️ CONFIGURAR (ESTILO DO VÍDEO)" */}
      {activeModalAgent && (
        <div
          onClick={() => setActiveModalAgent(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fbfaf6",
              color: "#0f172a",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid #cbd5e1",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Cabeçalho do Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: activeModalAgent.color,
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeModalAgent.name.slice(0, 1)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{activeModalAgent.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#047857" }}>
                    ● {activeModalAgent.role} • Estação {activeModalAgent.station || "C01"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{statusFor(activeModalAgent, market)}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAgent(null)}
                style={{ background: "#e2e8f0", border: "none", borderRadius: 8, padding: "4px 10px", fontWeight: 800, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Seletor Rápido: Fazer Pergunta (Chat IA) vs Configurar Horário/Atividade */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#e2e8f0", padding: 4, borderRadius: 10 }}>
              <button
                onClick={() => setModalView("CHAT")}
                style={{
                  padding: "7px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: modalView === "CHAT" ? "#0f172a" : "transparent",
                  color: modalView === "CHAT" ? "#fde047" : "#334155",
                }}
              >
                💬 Perguntar ao Agente
              </button>
              <button
                onClick={() => setModalView("CONFIG")}
                style={{
                  padding: "7px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: modalView === "CONFIG" ? "#0f172a" : "transparent",
                  color: modalView === "CONFIG" ? "#ffffff" : "#334155",
                }}
              >
                ⚙️ Horário &amp; Atividade
              </button>
            </div>

            {modalView === "CHAT" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "#475569", display: "block", marginBottom: 3 }}>
                    INSTRUÇÃO DO AGENTE (SYSTEM PROMPT)
                  </label>
                  <textarea
                    rows={2}
                    value={activeModalAgent.prompt}
                    onChange={(e) => {
                      const updated = { ...activeModalAgent, prompt: e.target.value };
                      setActiveModalAgent(updated);
                      saveAgentsList(localAgents.map((a) => (a.id === updated.id ? updated : a)));
                    }}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: 8, fontSize: 11, background: "#ffffff" }}
                  />
                </div>

                {/* Caixa de Mensagens */}
                <div
                  style={{
                    height: 210,
                    overflowY: "auto",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {(chats[activeModalAgent.id] || []).map((m, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                        maxWidth: "86%",
                        background: m.from === "user" ? "#facc15" : "#1e293b",
                        color: m.from === "user" ? "#0f172a" : "#f8fafc",
                        padding: "8px 10px",
                        borderRadius: 10,
                        fontSize: 12,
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                  {chatBusy && <div style={{ fontSize: 11, color: "#94a3b8" }}>{activeModalAgent.name} está analisando...</div>}
                  <div ref={chatEndRef} />
                </div>

                {/* Botões de Pergunta Rápida */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["Como está o gráfico?", "Qual a tendência agora?", "Quais as novidades?", "Qual o Stop e Take Profit?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setChatInput(q)}
                      style={{
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: "#e2e8f0",
                        color: "#0f172a",
                        border: "none",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input de Pergunta */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void sendQuestionToAgent();
                    }}
                    placeholder={`Pergunte para ${activeModalAgent.name}...`}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid #94a3b8", fontSize: 12, background: "#ffffff" }}
                  />
                  <button
                    onClick={() => void sendQuestionToAgent()}
                    disabled={chatBusy}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 10,
                      background: "#16a34a",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: 12,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            ) : (
              /* ABA DE CONFIGURAÇÃO IDÊNTICA AO VÍDEO (00:11 - 00:15) */
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 3 }}>NOME VISÍVEL</label>
                    <input
                      value={activeModalAgent.name}
                      onChange={(e) => setActiveModalAgent({ ...activeModalAgent, name: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 3 }}>FUNÇÃO</label>
                    <select
                      value={activeModalAgent.role}
                      onChange={(e) => setActiveModalAgent({ ...activeModalAgent, role: e.target.value })}
                      style={{ width: "100%", padding: "7px 8px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700 }}
                    >
                      <option>Analista de Notícias</option>
                      <option>Analista Gráfica</option>
                      <option>Diretora de Risco</option>
                      <option>Executor de Ordens</option>
                    </select>
                  </div>
                </div>

                {/* ATIVIDADE: Atendendo | Pausa | Reunião | Foco */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 4 }}>
                    ATIVIDADE (MOVE O AGENTE NO ESCRITÓRIO)
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {(["Atendendo", "Pausa", "Reunião", "Foco"] as const).map((act) => {
                      const on = (activeModalAgent.activity || "Atendendo") === act;
                      return (
                        <button
                          key={act}
                          onClick={() => setActiveModalAgent({ ...activeModalAgent, activity: act })}
                          style={{
                            padding: "7px 4px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            border: "1px solid #cbd5e1",
                            background: on ? "#1e222d" : "#ffffff",
                            color: on ? "#ffffff" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          {act}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HORÁRIO DE TRABALHO */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 4 }}>HORÁRIO DE TRABALHO</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="time"
                      value={activeModalAgent.startTime || "08:00"}
                      onChange={(e) => setActiveModalAgent({ ...activeModalAgent, startTime: e.target.value, is247: false })}
                      style={{ flex: 1, padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff" }}
                    />
                    <span>até</span>
                    <input
                      type="time"
                      value={activeModalAgent.endTime || "18:00"}
                      onChange={(e) => setActiveModalAgent({ ...activeModalAgent, endTime: e.target.value, is247: false })}
                      style={{ flex: 1, padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff" }}
                    />
                    <button
                      onClick={() => setActiveModalAgent({ ...activeModalAgent, is247: !activeModalAgent.is247 })}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 8,
                        fontWeight: 800,
                        border: "1px solid #1e222d",
                        background: activeModalAgent.is247 ? "#1e222d" : "#ffffff",
                        color: activeModalAgent.is247 ? "#fde047" : "#1e222d",
                        cursor: "pointer",
                      }}
                    >
                      24/7
                    </button>
                  </div>
                </div>

                {/* DIAS DA SEMANA */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 4 }}>DIAS</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                    {DAY_LABELS.map((d, i) => {
                      const days = activeModalAgent.days || [true, true, true, true, true, true, true];
                      const on = days[i] ?? true;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            const next = [...days];
                            next[i] = !on;
                            setActiveModalAgent({ ...activeModalAgent, days: next });
                          }}
                          style={{
                            padding: "6px 0",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 11,
                            border: "1px solid #cbd5e1",
                            background: on ? "#1e222d" : "#ffffff",
                            color: on ? "#ffffff" : "#94a3b8",
                            cursor: "pointer",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* APARÊNCIA */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", display: "block", marginBottom: 4 }}>COR DO TRAJE</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {SUIT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setActiveModalAgent({ ...activeModalAgent, color: c })}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 99,
                          background: c,
                          border: activeModalAgent.color === c ? "3px solid #0f172a" : "1px solid #cbd5e1",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => {
                      saveAgentsList(localAgents.map((a) => (a.id === activeModalAgent.id ? activeModalAgent : a)));
                      setActiveModalAgent(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      background: "#facc15",
                      color: "#0f172a",
                      fontWeight: 900,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Salvar Configurações
                  </button>
                  {localAgents.length > 1 && (
                    <button
                      onClick={() => {
                        saveAgentsList(localAgents.filter((a) => a.id !== activeModalAgent.id));
                        setActiveModalAgent(null);
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 800,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Demitir
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
