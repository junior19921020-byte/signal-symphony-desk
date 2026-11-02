import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoLoginGate } from "@/components/DemoLoginGate";
import { PhaserOfficePrototype } from "@/components/PhaserOfficePrototype";

export const Route = createFileRoute("/phaser-preview")({
  head: () => ({ meta: [{ title: "Teste Phaser | Signal Symphony Desk" }] }),
  component: () => (
    <DemoLoginGate>
      <main className="min-h-screen bg-slate-950 px-3 py-6 text-white">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link to="/" className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm">
            ← Voltar ao escritório atual
          </Link>
          <h1 className="text-2xl font-bold text-amber-400">Laboratório isométrico Phaser</h1>
          <p className="text-sm text-slate-300">
            Ambiente experimental isolado. Toque nos pisos livres para mover o personagem.
            Os blocos marrons são obstáculos. Não executa operações financeiras.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-2">
            <PhaserOfficePrototype />
          </div>
          <p className="text-xs text-slate-400">
            Este protótipo não substitui o escritório principal e ainda não representa os agentes reais.
          </p>
        </div>
      </main>
    </DemoLoginGate>
  ),
});
