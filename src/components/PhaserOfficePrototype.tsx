import { useEffect, useRef } from "react";

/**
 * Protótipo isolado do motor gráfico. Sem acesso a autenticação,
 * Supabase, credenciais ou funções de execução financeira.
 * Não substitui o OfficeMap enquanto não for validado.
 */
export function PhaserOfficePrototype() {
  const host = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
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
            // Cadeira ao lado da mesa, dentro do mesmo tile bloqueado.
            const chair = this.add.graphics().setDepth(p.y + 4);
            chair.fillStyle(0x1e293b);
            chair.fillRoundedRect(p.x + 12, p.y - 18, 13, 18, 3);
            chair.fillStyle(0x475569);
            chair.fillRoundedRect(p.x + 9, p.y - 7, 16, 7, 2);
            chair.lineStyle(2, 0x94a3b8);
            chair.lineBetween(p.x + 17, p.y, p.x + 17, p.y + 6);
            chair.lineBetween(p.x + 12, p.y + 6, p.x + 22, p.y + 6);
            // Pequeno teclado e indicador de tela para dar vida a estacao.
            this.add.rectangle(p.x - 5, p.y - 13, 12, 3, 0xcbd5e1).setDepth(p.y + 5);
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
          // Personagem demonstrativo: visual e animacao sem vinculo com agentes reais.
          const shadow = this.add.ellipse(0, 0, 20, 7, 0x0f172a, 0.35);
          const leftLeg = this.add.rectangle(-4, -5, 5, 12, 0x1e3a8a);
          const rightLeg = this.add.rectangle(4, -5, 5, 12, 0x1e3a8a);
          const body = this.add.rectangle(0, -17, 16, 19, 0x2563eb);
          const leftArm = this.add.rectangle(-11, -17, 5, 15, 0xf5c99a);
          const rightArm = this.add.rectangle(11, -17, 5, 15, 0xf5c99a);
          const head = this.add.circle(0, -34, 9, 0xf5c99a);
          const hair = this.add.arc(0, -38, 9, 180, 360, false, 0x422006);
          agent.add([shadow, leftLeg, rightLeg, body, leftArm, rightArm, head, hair]);
          const walkMotion = this.tweens.add({
            targets: [leftLeg, rightArm], angle: { from: -15, to: 15 },
            duration: 180, yoyo: true, repeat: -1, paused: true,
          });
          const oppositeMotion = this.tweens.add({
            targets: [rightLeg, leftArm], angle: { from: 15, to: -15 },
            duration: 180, yoyo: true, repeat: -1, paused: true,
          });
          let location: [number, number] = [0, 0];
          const origin = tile(...location);
          agent.setPosition(origin.x, origin.y);
          agent.setDepth(origin.y + 10);
          // Equipe ilustrativa: cinco colegas visuais sem conexao com trading.
          const demoTeam = [
            { name: "Agente 2", col: 8, row: 0, shirt: 0x0f766e },
            { name: "Agente 3", col: 0, row: 8, shirt: 0x7c3aed },
            { name: "Agente 4", col: 8, row: 8, shirt: 0xb45309 },
            { name: "Agente 5", col: 2, row: 0, shirt: 0xbe123c },
            { name: "Agente 6", col: 0, row: 6, shirt: 0x0369a1 },
          ];
          // Colegas estaticos ocupam tiles: a rota nao pode atravessar avatares.
          // Mantem os corredores centrais e portas existentes desobstruidos.
          // Reserva duas casas para o primeiro colega mover sem cruzar a Cíntia.
          blocked.add("7,0");
          for (const member of demoTeam) {
            blocked.add(`${member.col},${member.row}`);
          }
          let movingColleague: Phaser.GameObjects.Container | undefined;
          for (const member of demoTeam) {
            const p = tile(member.col, member.row);
            const colleague = this.add.container(p.x, p.y).setDepth(p.y + 10);
            if (member.name === "Agente 2") movingColleague = colleague;
            colleague.add([
              this.add.ellipse(0, 0, 18, 6, 0x0f172a, 0.3),
              this.add.rectangle(-4, -5, 5, 12, 0x1e293b),
              this.add.rectangle(4, -5, 5, 12, 0x1e293b),
              this.add.rectangle(0, -17, 15, 19, member.shirt),
              this.add.circle(0, -33, 8, 0xf5c99a),
              this.add.arc(0, -37, 8, 180, 360, false, 0x422006),
              this.add.text(0, -52, member.name, { fontSize: "9px", color: "#ffffff", backgroundColor: "#0f172a", padding: { x: 2, y: 1 } }).setOrigin(0.5),
            ]);
          }
          agent.add(this.add.text(0, -53, "Cíntia", { fontSize: "10px", color: "#ffffff", backgroundColor: "#1e3a8a", padding: { x: 3, y: 1 } }).setOrigin(0.5));
          let walking = false;
          // Ciclo demonstrativo: deslocamento, monitoramento e pausa.
          // As duas casas ficam reservadas no mapa, sem acesso a trading real.
          if (movingColleague) {
            const colleague = movingColleague;
            const station = tile(7, 0);
            const rest = tile(8, 0);
            const setStatus = (message: string) => {
              if (statusRef.current) statusRef.current.textContent = message;
            };
            let phase = 0;
            const cycle = () => {
              if (walking) {
                this.time.delayedCall(1000, cycle);
                return;
              }
              if (phase === 0 || phase === 2) {
                const destination = phase === 0 ? station : rest;
                setStatus("Agente 2: deslocamento demonstrativo");
                this.tweens.add({
                  targets: colleague,
                  x: destination.x,
                  y: destination.y,
                  duration: 650,
                  onUpdate: () => colleague.setDepth(colleague.y + 10),
                  onComplete: () => {
                    phase = phase === 0 ? 1 : 3;
                    this.time.delayedCall(800, cycle);
                  },
                });
              } else {
                setStatus(phase === 1
                  ? "Agente 2: simulando monitoramento"
                  : "Agente 2: pausa demonstrativa");
                phase = phase === 1 ? 2 : 0;
                this.time.delayedCall(phase === 2 ? 4500 : 2500, cycle);
              }
            };
            this.time.delayedCall(1200, cycle);
          }

          const walkTo = (goal: [number, number]) => {
            if (walking || blocked.has(goal.join(","))) return;
            const path = findPath(location, goal).slice(1);
            if (!path.length) return;
            walking = true;
            walkMotion.resume();
            oppositeMotion.resume();
            const advance = () => {
              const next = path.shift();
              if (!next) { walking = false; walkMotion.pause(); oppositeMotion.pause(); leftLeg.setAngle(0); rightLeg.setAngle(0); leftArm.setAngle(0); rightArm.setAngle(0); return; }
              const p = tile(...next);
              this.tweens.add({
                targets: agent, x: p.x, y: p.y, duration: 230,
                onUpdate: () => agent.setDepth(agent.y + 10),
                onComplete: () => { location = next; advance(); },
              });
            };
            advance();
          };
          // Zoom por pinca, sem controles sobrepostos ao escritorio.
          const camera = this.cameras.main;
          this.input.addPointer(1);
          let lastPinchDistance = 0;
          let suppressTap = false;
          let previousCenter: { x: number; y: number } | null = null;
          this.input.on("pointermove", () => {
            const active = this.input.manager.pointers.filter((p) => p.isDown);
            if (active.length < 2) { lastPinchDistance = 0; previousCenter = null; return; }
            suppressTap = true;
            const [a, b] = active;
            const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
            const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            if (previousCenter && camera.zoom > 1) {
              camera.scrollX -= (center.x - previousCenter.x) / camera.zoom;
              camera.scrollY -= (center.y - previousCenter.y) / camera.zoom;
            }
            previousCenter = center;
            if (lastPinchDistance > 0 && distance > 0) {
              camera.setZoom(Phaser.Math.Clamp(camera.zoom * distance / lastPinchDistance, 1, 1.8));
            }
            lastPinchDistance = distance;
          });
          this.input.on("pointerup", () => {
            lastPinchDistance = 0;
            previousCenter = null;
            if (this.input.manager.pointers.every((p) => !p.isDown)) suppressTap = false;
          });
          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (suppressTap || this.input.manager.pointers.filter((p) => p.isDown).length > 1) return;
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
  return (
    <div style={{ width: "100%" }}>
      <div ref={host} role="img" aria-label="Protótipo isométrico Phaser, ainda em testes" style={{ width: "100%", minHeight: 240, touchAction: "none" }} />
      <div ref={statusRef} role="status" aria-live="polite" style={{ marginTop: 8, padding: "10px 12px", background: "#0f172a", color: "#bae6fd", borderRadius: 8, fontSize: 14 }}>
        Agente 2: aguardando
      </div>
    </div>
  );
}
