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
          // Portas em cada extremidade das divisorias, e cruzamento central livre.
          const partitions = new Set<string>();
          for (let i = 0; i < 9; i++) {
            if (i !== 1 && i !== 4 && i !== 7) {
              partitions.add(`${i},4`);
              partitions.add(`4,${i}`);
            }
          }
          const roomLabels = [
            { text: "DIRETORIA", col: 1, row: 1 },
            { text: "TRADING", col: 7, row: 1 },
            { text: "RECEPCAO", col: 1, row: 7 },
            { text: "COMITE DE RISCO", col: 7, row: 7 },
          ];
          for (const room of roomLabels) {
            const p = { x: 320 + (room.col - room.row) * 32, y: 55 + (room.col + room.row) * 16 };
            this.add.text(p.x, p.y - 30, room.text, { fontSize: "10px", color: "#fef3c7", backgroundColor: "#1e293b", padding: { x: 3, y: 2 } }).setOrigin(0.5).setDepth(600);
          }
          // Mapa lógico independente dos gráficos: X = obstáculo, . = piso.
          // O corredor central permanece livre e permite contornar os móveis.
          const blocked = new Set([...partitions, "2,2", "3,2", "2,3", "6,5", "6,6", "5,6"]);
          const tile = (col: number, row: number) => ({ x: 320 + (col - row) * 32, y: 55 + (col + row) * 16 });
          for (const key of partitions) {
            const [col, row] = key.split(",").map(Number);
            const p = tile(col, row);
            // Parede com face, sombra e acabamento; a abertura permanece livre.
            this.add.rectangle(p.x + 2, p.y - 13, 39, 31, 0x0f172a).setDepth(p.y + 1);
            this.add.rectangle(p.x, p.y - 17, 35, 32, 0x64748b).setDepth(p.y + 2);
            this.add.rectangle(p.x, p.y - 34, 37, 5, 0xcbd5e1).setDepth(p.y + 3);
            this.add.rectangle(p.x - 10, p.y - 17, 3, 29, 0x94a3b8).setDepth(p.y + 4);
          }
          for (const key of blocked) {
            if (partitions.has(key)) continue;
            const [col, row] = key.split(",").map(Number);
            const p = tile(col, row);
            // Mesa isometrica com tampo losangular, suporte e monitor.
            const desk = this.add.graphics().setDepth(p.y + 1);
            desk.fillStyle(0x475569);
            desk.fillRect(p.x - 13, p.y - 17, 6, 17);
            desk.fillRect(p.x + 7, p.y - 17, 6, 17);
            desk.fillStyle(0x8b5e3c);
            desk.fillPoints([{ x: p.x, y: p.y - 27 }, { x: p.x + 25, y: p.y - 15 }, { x: p.x, y: p.y - 3 }, { x: p.x - 25, y: p.y - 15 }], true);
            desk.lineStyle(2, 0xd6a875);
            desk.strokePoints([{ x: p.x, y: p.y - 27 }, { x: p.x + 25, y: p.y - 15 }, { x: p.x, y: p.y - 3 }, { x: p.x - 25, y: p.y - 15 }], true);
            this.add.rectangle(p.x, p.y - 31, 20, 15, 0x0f172a).setStrokeStyle(2, 0x38bdf8).setDepth(p.y + 2);
            this.add.rectangle(p.x, p.y - 22, 3, 5, 0x94a3b8).setDepth(p.y + 3);
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
          // Zoom mobile com controles de toque grandes, fora do piso navegavel.
          const camera = this.cameras.main;
          const zoomButton = (x: number, symbol: string, change: number) => {
            const button = this.add.text(x, 335, symbol, {
              fontSize: "24px", color: "#ffffff", backgroundColor: "#334155",
              padding: { x: 12, y: 5 },
            }).setScrollFactor(0).setDepth(1000).setInteractive({ useHandCursor: true });
            button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
              event.stopPropagation();
              camera.setZoom(Phaser.Math.Clamp(camera.zoom + change, 1, 1.6));
            });
          };
          zoomButton(530, "+", 0.2);
          zoomButton(580, "−", -0.2);
          this.input.addPointer(1);
          let lastPinchDistance = 0;
          this.input.on("pointermove", () => {
            const [a, b] = this.input.manager.pointers;
            if (!a?.isDown || !b?.isDown) { lastPinchDistance = 0; return; }
            const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
            if (lastPinchDistance > 0) camera.setZoom(Phaser.Math.Clamp(camera.zoom * distance / lastPinchDistance, 1, 1.6));
            lastPinchDistance = distance;
          });
          this.input.on("pointerup", () => { lastPinchDistance = 0; });
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.input.manager.pointers.filter((p) => p.isDown).length > 1) return;
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
