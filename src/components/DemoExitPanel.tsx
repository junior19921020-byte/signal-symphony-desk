import { useState } from "react";
import { simulateDemoExits, type DemoExitScenario } from "@/lib/demoExitSimulator";

const names = { TAKE_PROFIT: "Take Profit", STOP_LOSS: "Stop Loss", PROFIT_TARGET: "Meta de lucro", PROTECT_PROFIT: "Proteção de lucro", AGENT: "Saída do agente" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parse = (s: string) => s.trim() === "" ? NaN : Number(s.trim().replace(",", "."));

export function DemoExitPanel() {
  const [side, setSide] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [entry, setEntry] = useState("");
  const [qty, setQty] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [target, setTarget] = useState("");
  const [arm, setArm] = useState("");
  const [floor, setFloor] = useState("");
  const [samples, setSamples] = useState("");
  const [agentIndex, setAgentIndex] = useState("");
  const [scenario, setScenario] = useState<DemoExitScenario | null>(null);
  const [error, setError] = useState("");
  const run = () => {
    setScenario(null);
    setError("");
    const prices = samples.split(/[\s;,]+/).filter(Boolean).map(parse);
    const next: DemoExitScenario = {
      side, entry: parse(entry), qty: parse(qty), stopLoss: parse(sl), takeProfit: parse(tp),
      observedPrices: prices,
      profitTargetUsdt: parse(target), protectAfterUsdt: parse(arm), protectFloorUsdt: parse(floor),
      agentExitIndex: agentIndex.trim() === "" ? undefined : Number(agentIndex) - 1,
    };
    if (prices.length > 500) { setError("Máximo de 500 amostras por simulação."); return; }
    if (!prices.length || ![next.entry, next.qty, next.stopLoss, next.takeProfit].every(v => Number.isFinite(v) && v > 0)
      || prices.some(v => !Number.isFinite(v) || v <= 0)
      || (side === "COMPRA" ? !(next.stopLoss < next.entry && next.takeProfit > next.entry) : !(next.stopLoss > next.entry && next.takeProfit < next.entry))) {
      setError("Informe entrada, lote, stop, take e preços observados válidos e coerentes com a direção.");
      return;
    }
    setScenario(next);
  };
  const field = (label: string, value: string, setter: (s: string) => void, hint?: string) => (
    <label className="block text-xs text-slate-200">{label}<input type="text" inputMode="decimal" value={value} onChange={e => setter(e.target.value)} placeholder={hint ?? "Ex.: 100.50"} className="mt-1 w-full min-h-10 rounded border border-slate-600 bg-slate-800 px-2 text-white" /></label>
  );
  return <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3" aria-label="Simulador de saídas demo">
    <h2 className="font-bold text-[#d4af37]">Simulador de Saídas (Demo)</h2>
    <p className="mt-1 text-xs text-slate-300">Somente leitura e cálculo hipotético. Insira preços realmente observados, na ordem temporal. Não abre ou fecha posições, não altera saldo, histórico ou limites da Rita Risk.</p>
    <p className="mt-2 text-xs text-amber-300">Não reconstrói os preços das operações antigas. Resultados representam apenas as amostras informadas; não garantem execução nesse preço, nem consideram taxas ou slippage.</p>
    <label className="mt-3 block text-xs">Direção<select value={side} onChange={e => { setSide(e.target.value as "COMPRA" | "VENDA"); setScenario(null); }} className="mt-1 w-full min-h-10 rounded border border-slate-600 bg-slate-800 p-2"><option value="COMPRA">COMPRA</option><option value="VENDA">VENDA</option></select></label>
    <div className="mt-2 grid grid-cols-2 gap-2">
      {field("Preço de entrada", entry, setEntry)}
      {field("Quantidade", qty, setQty)}
      {field("Stop Loss (preço)", sl, setSl)}
      {field("Take Profit (preço)", tp, setTp)}
      {field("Meta de lucro (USDT)", target, setTarget, "Opcional")}
      {field("Ativar proteção em (USDT)", arm, setArm, "Opcional")}
      {field("Piso de proteção (USDT)", floor, setFloor, "Opcional")}
      {field("Amostra da saída do agente (1, 2...)", agentIndex, setAgentIndex, "Opcional")}
    </div>
    <label className="mt-3 block text-xs">Preços observados em ordem temporal (separados por espaço, vírgula ou linha)
      <textarea value={samples} onChange={e => setSamples(e.target.value)} rows={3} placeholder="Ex.: 100 101 102 99" className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-white" />
    </label>
    <button type="button" onClick={run} className="mt-3 min-h-11 w-full rounded-lg bg-amber-400 p-2 font-bold text-slate-950">Comparar saídas hipotéticas</button>
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    {scenario && <div className="mt-3 space-y-2" role="status">
      <p className="text-xs text-slate-300">{scenario.observedPrices.length} amostras informadas • Sem execução de ordens</p>
      {simulateDemoExits(scenario).map(r => <div key={r.rule} className="rounded bg-slate-800 p-2 text-xs">
        <div className="flex justify-between gap-2"><b>{names[r.rule]}</b><b className={r.pnl === null ? "text-amber-300" : r.pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{r.pnl === null ? "Indisponível" : `${fmt(r.pnl)} USDT`}</b></div>
        <p className="mt-1 text-slate-300">{r.exitIndex === null ? r.reason : `Amostra ${r.exitIndex + 1} • Preço ${fmt(r.exitPrice!)} • ${r.reason}`}</p>
      </div>)}
    </div>}
  </section>;
}
