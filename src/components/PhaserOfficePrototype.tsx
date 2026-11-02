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
          const tile = (col: number, row: number) => ({ x: 320 + (col - row) * 32, y: 55 + (col + row) * 16 });
          // Divisão visual por setores; colisões são definidas separadamente abaixo.
          const sectors = [
            { name: "DIRETORIA", col: 1, row: 1, color: 0xd6b48a },
            { name: "TRADING", col: 6, row: 1, color: 0x9bc7d8 },
            { name: "RECEPÇÃO", col: 1, row: 6, color: 0xb9d6bd },
            { name: "RISCO", col: 6, row: 6, color: 0xd6b5c9 },
          ];
          // Piso isométrico com losangos de 64x32 pixels.
          for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
              const x = 320 + (col - row) * 32;
              const y = 55 + (col + row) * 16;
              const zone = col < 4 && row < 4 ? 0xd6b48a : col >= 5 && row < 4 ? 0x9bc7d8 : col < 4 && row >= 5 ? 0xb9d6bd : col >= 5 && row >= 5 ? 0xd6b5c9 : ((col + row) % 2 ? 0xcbd5e1 : 0xe2e8f0);
              g.fillStyle(zone, 1);
              g.lineStyle(1, 0x94a3b8, 0.8);
              g.fillPoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
              g.strokePoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
            }
          }
          for (const sector of sectors) {
            const p = tile(sector.col, sector.row);
            this.add.text(p.x, p.y - 46, sector.name, { color: "#f8fafc", fontSize: "10px", backgroundColor: "#1e293b", padding: { x: 4, y: 3 } }).setOrigin(0.5).setDepth(1000);
          }
          this.add.text(14, 12, "PROTÓTIPO • MOTOR PHASER", { color: "#facc15", fontSize: "15px" });
          this.add.text(14, 35, "Cena de teste — não conectada ao trading", { color: "#ffffff", fontSize: "11px" });
          // Mapa lógico independente dos gráficos: X = obstáculo, . = piso.
          // O corredor central permanece livre e permite contornar os móveis.
          const blocked = new Set(["2,2", "3,2", "2,3", "6,5", "6,6", "5,6"]);
          for (const key of blocked) {
            const [col, row] = key.split(",").map(Number);
            const p = tile(col, row);
            this.add.rectangle(p.x, p.y - 9, 34, 17, 0x8b5e3c).setDepth(p.y);
            this.add.rectangle(p.x, p.y - 19, 30, 10, 0xb78b5c).setDepth(p.y + 1);
          }
          const findPath = (start: [number, number], goal: [number, number]) => {
            const queue: Array<[number, number]> = [start];
            const seen = new Set([start.join(",")]);
            const parents = new Map<string, string>();
            while (queue.length) {
              const [x, y] = queue.shift()!;
              const key = `${x},${y}`;
              if (x === goal[0] && y === goal[1]) {
                const path: Array<[number, number]> = [];
                let k: string | undefined = key;
                while (k) {
                  const [px, py] = k.split(",").map(Number);
                  path.unshift([px, py]);
                  k = parents.get(k);
                }
                return path;
              }
              for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = x + dx, ny = y + dy, nk = `${nx},${ny}`;
                if (nx < 0 || ny < 0 || nx >= 9 || ny >= 9 || blocked.has(nk) || seen.has(nk)) continue;
                seen.add(nk); parents.set(nk, key); queue.push([nx, ny]);
              }
            }
            return [] as Array<[number, number]>;
          };
          const agent = this.add.container(320, 190);
          const body = this.add.rectangle(0, -12, 14, 20, 0x2563eb);
          const head = this.add.circle(0, -29, 8, 0xf5c99a);
          agent.add([body, head]);
          let location: [number, number] = [0, 0];
          const origin = tile(...location);
          agent.setPosition(origin.x, origin.y);
          agent.setDepth(origin.y + 10);
          let walking = false;
          const walkTo = (goal: [number, number]) => {
            if (walking || blocked.has(goal.join(","))) return;
            const path = findPath(location, goal).slice(1);
            if (!path.length) return;
            walking = true;
            const advance = () => {
              const next = path.shift();
              if (!next) { walking = false; return; }
              const p = tile(...next);
              this.tweens.add({
                targets: agent, x: p.x, y: p.y, duration: 230,
                onUpdate: () => agent.setDepth(agent.y + 10),
                onComplete: () => { location = next; advance(); },
              });
            };
            advance();
          };
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const x = pointer.worldX - 320, y = pointer.worldY - 55;
            const col = Math.round((x / 32 + y / 16) / 2);
            const row = Math.round((y / 16 - x / 32) / 2);
            if (col >= 0 && col < 9 && row >= 0 && row < 9) walkTo([col, row]);
          });
          this.add.text(14, 365, "Toque no piso para caminhar • móveis bloqueiam o trajeto", { color: "#ffffff", fontSize: "12px" });
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
