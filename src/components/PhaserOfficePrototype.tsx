import { useEffect, useRef } from "react";

/**
 * Protótipo isolado do motor gráfico. Sem acesso a autenticação,
 * Supabase, credenciais ou funções de execução financeira.
 * Não substitui o OfficeMap enquanto não for validado.
 */
export function PhaserOfficePrototype() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    let game: import("phaser").Game | undefined;
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !host.current) return;
      class OfficeScene extends Phaser.Scene {
        constructor() { super("office-prototype"); }
        create() {
          const g = this.add.graphics();
          // Piso isométrico com losangos de 64x32 pixels.
          for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
              const x = 320 + (col - row) * 32;
              const y = 55 + (col + row) * 16;
              g.fillStyle((col + row) % 2 ? 0xcbd5e1 : 0xe2e8f0, 1);
              g.lineStyle(1, 0x94a3b8, 0.8);
              g.fillPoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
              g.strokePoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
            }
          }
          this.add.text(14, 12, "PROTÓTIPO • MOTOR PHASER", { color: "#facc15", fontSize: "15px" });
          this.add.text(14, 35, "Cena de teste — não conectada ao trading", { color: "#ffffff", fontSize: "11px" });
          const agent = this.add.container(320, 190);
          const body = this.add.rectangle(0, -12, 14, 20, 0x2563eb);
          const head = this.add.circle(0, -29, 8, 0xf5c99a);
          agent.add([body, head]);
          this.tweens.add({ targets: agent, x: 425, y: 245, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      }
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        width: 640,
        height: 400,
        backgroundColor: "#101827",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [OfficeScene],
        render: { pixelArt: true, antialias: false },
      });
    })().catch((error) => console.error("Falha ao iniciar protótipo Phaser", error));
    return () => { cancelled = true; game?.destroy(true); };
  }, []);
  return <div ref={host} role="img" aria-label="Protótipo isométrico Phaser, ainda em testes" style={{ width: "100%", minHeight: 240 }} />;
}
