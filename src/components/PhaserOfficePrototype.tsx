// @ts-nocheck -- experimental prototype; strict index checks not applied
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
              // Setores visuais discretos; somente a cor muda, sem colisao.
              const zone = col < 4 && row < 4 ? 0 : col >= 5 && row < 4 ? 1 : col < 4 && row >= 5 ? 2 : col >= 5 && row >= 5 ? 3 : 4;
              const floorColors = [
                [0xdbeafe, 0xbfdbfe], // Diretoria
                [0xd1fae5, 0xa7f3d0], // Trading
                [0xfef3c7, 0xfde68a], // Recepcao
                [0xf3e8ff, 0xe9d5ff], // Risco
                [0xe2e8f0, 0xcbd5e1], // Corredores e portas
              ];
              g.fillStyle(floorColors[zone][(col + row) % 2], 1);
              g.lineStyle(1, 0x94a3b8, 0.8);
              g.fillPoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
              g.strokePoints([{x,y:y-16},{x:x+32,y},{x,y:y+16},{x:x-32,y}], true);
            }
          }
          // Paredes externas traseiras em perspectiva isométrica.
          // Somente cenografia: não modifica blocked, portas nem navegação.
          // As duas faces dianteiras permanecem abertas para visualizar as salas.
          const exterior = this.add.graphics().setDepth(1);
          const exteriorHeight = 43;
          for (const side of [-1, 1]) {
            for (let i = 0; i < 9; i++) {
              const ax = 320 + side * i * 32;
              const ay = 39 + i * 16;
              const bx = ax + side * 32;
              const by = ay + 16;
              const topA = { x: ax, y: ay - exteriorHeight };
              const topB = { x: bx, y: by - exteriorHeight };
              const baseA = { x: ax, y: ay };
              const baseB = { x: bx, y: by };
              // Alvenaria clara com base mais escura e painéis de janela.
              exterior.fillStyle(side < 0 ? 0x94a3b8 : 0xb6c7d8, 1);
              exterior.fillPoints([baseA, baseB, topB, topA], true);
              exterior.lineStyle(5, 0x475569, 1);
              exterior.lineBetween(ax, ay - 2, bx, by - 2);
              exterior.fillStyle(0x60a5fa, 0.65);
              exterior.fillPoints([
                { x: ax + side * 5, y: ay - 34 },
                { x: bx - side * 5, y: by - 34 },
                { x: bx - side * 5, y: by - 13 },
                { x: ax + side * 5, y: ay - 13 },
              ], true);
              exterior.lineStyle(2, 0xe2e8f0, 1);
              exterior.lineBetween(ax, ay - exteriorHeight, bx, by - exteriorHeight);
              exterior.lineStyle(2, 0x334155, 0.9);
              exterior.lineBetween(ax, ay - 12, bx, by - 12);
              exterior.lineStyle(1, 0xffffff, 0.5);
              exterior.lineBetween(ax + side * 8, ay - 31, bx - side * 8, by - 31);
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
          // Mapa lógico independente dos gráficos: X = obstáculo, . = piso.
          // O corredor central permanece livre e permite contornar os móveis.
          const blocked = new Set([...partitions, "2,2", "3,2", "2,3", "6,5", "6,6", "5,6"]);
          const tile = (col: number, row: number) => ({ x: 320 + (col - row) * 32, y: 55 + (col + row) * 16 });
          // Painéis de vidro isométricos contínuos: preservam exatamente os
          // mesmos tiles bloqueados, aberturas e algoritmo de navegação.
          // Cada painel segue o eixo do piso, sem virar um cubo independente.
          for (const key of partitions) {
            const [col, row] = key.split(",").map(Number);
            const p = tile(col, row);
            const alongCol = row === 4;
            const dx = alongCol ? 32 : -32;
            const dy = 16;
            const halfX = dx / 2;
            const halfY = dy / 2;
            const wallHeight = 47;
            const wall = this.add.graphics().setDepth(p.y + 3);
            // Rodapé contínuo, perfil metálico e vidro translúcido.
            const bottomA = { x: p.x - halfX, y: p.y - halfY };
            const bottomB = { x: p.x + halfX, y: p.y + halfY };
            const topA = { x: bottomA.x, y: bottomA.y - wallHeight };
            const topB = { x: bottomB.x, y: bottomB.y - wallHeight };
            wall.fillStyle(0x7dd3fc, 0.20);
            wall.fillPoints([bottomA, bottomB, topB, topA], true);
            wall.lineStyle(4, 0x475569, 1);
            wall.lineBetween(bottomA.x, bottomA.y, bottomB.x, bottomB.y);
            wall.lineStyle(3, 0xcbd5e1, 1);
            wall.lineBetween(topA.x, topA.y, topB.x, topB.y);
            wall.lineStyle(1, 0x93c5fd, 0.65);
            wall.lineBetween(bottomA.x, bottomA.y - 9, bottomB.x, bottomB.y - 9);
            // Montantes apenas nas extremidades de cada sequência de painéis.
            const previous = alongCol ? `${col - 1},${row}` : `${col},${row - 1}`;
            const next = alongCol ? `${col + 1},${row}` : `${col},${row + 1}`;
            wall.lineStyle(3, 0x94a3b8, 1);
            if (!partitions.has(previous)) {
              wall.lineBetween(bottomA.x, bottomA.y, topA.x, topA.y);
            }
            if (!partitions.has(next)) {
              wall.lineBetween(bottomB.x, bottomB.y, topB.x, topB.y);
            }
            // Acabamento arquitetonico: travessa superior com espessura,
            // pequena sombra de base e parafusos apenas nas pontas expostas.
            // Sao detalhes visuais: nenhum tile ou colisao e alterado.
            wall.lineStyle(5, 0x1e293b, 0.55);
            wall.lineBetween(topA.x, topA.y - 2, topB.x, topB.y - 2);
            wall.lineStyle(2, 0xe2e8f0, 0.95);
            wall.lineBetween(topA.x, topA.y - 5, topB.x, topB.y - 5);
            wall.lineStyle(2, 0x0f172a, 0.35);
            wall.lineBetween(bottomA.x, bottomA.y + 3, bottomB.x, bottomB.y + 3);
            wall.fillStyle(0xf8fafc, 0.85);
            if (!partitions.has(previous)) {
              wall.fillCircle(topA.x, topA.y - 3, 2);
            }
            if (!partitions.has(next)) {
              wall.fillCircle(topB.x, topB.y - 3, 2);
            }
            // Reflexo diagonal discreto, sem ocultar os personagens.
            wall.lineStyle(2, 0xffffff, 0.22);
            wall.lineBetween(topA.x + 5, topA.y + 7, bottomB.x - 5, bottomB.y - 8);
          }
          // Portas automáticas demonstrativas: as quatro passagens continuam
          // livres no mapa lógico. O sensor controla apenas painéis visuais.
          const automaticDoors: Array<{ col: number; row: number; openness: number;
            graphics: Phaser.GameObjects.Graphics }> = [];
          for (const index of [1, 7]) {
            for (const [col, row] of [[index, 4], [4, index]]) {
              const p = tile(col, row);
              const graphics = this.add.graphics().setDepth(p.y + 8);
              automaticDoors.push({ col, row, openness: 0, graphics });
            }
          }
          const drawAutomaticDoor = (door: typeof automaticDoors[number]) => {
            const p = tile(door.col, door.row);
            const g = door.graphics;
            g.clear();
            // O vão segue exatamente o mesmo eixo isométrico dos painéis
            // adjacentes (inclinação 2:1), não a horizontal da tela.
            const alongCol = door.row === 4;
            const dx = alongCol ? 32 : -32;
            const dy = 16;
            const height = 47;
            const left = { x: p.x - dx / 2, y: p.y - dy / 2 };
            const right = { x: p.x + dx / 2, y: p.y + dy / 2 };
            const lerp = (t: number) => ({
              x: Phaser.Math.Linear(left.x, right.x, t),
              y: Phaser.Math.Linear(left.y, right.y, t),
            });
            // Soleira, trilho superior e batentes fixos.
            g.lineStyle(4, 0x475569, 1);
            g.lineBetween(left.x, left.y, right.x, right.y);
            g.lineStyle(3, 0xcbd5e1, 1);
            g.lineBetween(left.x, left.y - height, right.x, right.y - height);
            g.lineStyle(2, 0xe2e8f0, 0.95);
            for (const edge of [left, right]) {
              g.lineBetween(edge.x, edge.y, edge.x, edge.y - height);
            }
            // Duas folhas deslizam ao longo da parede isométrica.
            const remaining = (1 - door.openness) * 0.5;
            for (const [from, to] of [[0, remaining], [1 - remaining, 1]]) {
              if (to - from < 0.008) continue;
              const a = lerp(from), b = lerp(to);
              g.fillStyle(0x7dd3fc, 0.29);
              g.fillPoints([
                { x: a.x, y: a.y }, { x: b.x, y: b.y },
                { x: b.x, y: b.y - height }, { x: a.x, y: a.y - height },
              ], true);
              g.lineStyle(2, 0xbde9fb, 0.95);
              g.strokePoints([
                { x: a.x, y: a.y }, { x: b.x, y: b.y },
                { x: b.x, y: b.y - height }, { x: a.x, y: a.y - height },
              ], true);
              g.lineStyle(1, 0xffffff, 0.45);
              const mid = lerp((from + to) / 2);
              g.lineBetween(mid.x, mid.y - 8, mid.x, mid.y - height + 8);
            }
            const mid = lerp(0.5);
            g.fillStyle(door.openness > 0.1 ? 0x22c55e : 0xf59e0b, 1);
            g.fillCircle(mid.x, mid.y - height - 5, 2);
          };
          automaticDoors.forEach(drawAutomaticDoor);
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
            // Acabamento pixel-art das estacoes: gaveteiro, tampo em duas
            // tonalidades e reflexo do monitor. Apenas geometria visual.
            const detail = this.add.graphics().setDepth(p.y + 3);
            detail.fillStyle(0x6b442d);
            detail.fillPoints([
              { x: p.x - 21, y: p.y - 13 },
              { x: p.x - 13, y: p.y - 9 },
              { x: p.x - 13, y: p.y + 2 },
              { x: p.x - 21, y: p.y - 2 },
            ], true);
            detail.lineStyle(1, 0xe7b987);
            detail.lineBetween(p.x - 20, p.y - 9, p.x - 14, p.y - 6);
            detail.lineBetween(p.x - 20, p.y - 5, p.x - 14, p.y - 2);
            detail.fillStyle(0xfde68a);
            detail.fillRect(p.x - 18, p.y - 8, 2, 1);
            detail.fillRect(p.x - 18, p.y - 4, 2, 1);
            detail.lineStyle(2, 0xf8fafc, 0.65);
            detail.lineBetween(p.x - 7, p.y - 35, p.x + 3, p.y - 35);
            detail.lineStyle(1, 0x38bdf8, 0.8);
            detail.lineBetween(p.x - 7, p.y - 29, p.x + 6, p.y - 29);
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
          // Balcao de recepcao: sprite isometrico independente, sem acesso a servicos.
          // Posicionado em tile livre da recepcao; a mesma celula entra no mapa logico.
          const receptionDeskTile: [number, number] = [2, 7];
          const receptionDeskPosition = tile(...receptionDeskTile);
          blocked.add(receptionDeskTile.join(","));
          // Cadeira atrás do balcão; a recepcionista pode sentar.
          const receptionChair = this.add.container(
            receptionDeskPosition.x - 7, receptionDeskPosition.y - 16,
          ).setDepth(receptionDeskPosition.y - 9);
          receptionChair.add([
            this.add.ellipse(0, 8, 22, 7, 0x0f172a, 0.25),
            this.add.rectangle(0, -14, 20, 23, 0x334155).setStrokeStyle(2, 0x94a3b8),
            this.add.rectangle(0, -16, 14, 15, 0x2563eb),
            this.add.rectangle(0, 0, 23, 9, 0x475569),
            this.add.rectangle(0, 8, 3, 10, 0x64748b),
          ]);
          const rx = receptionDeskPosition.x, ry = receptionDeskPosition.y;
          // Corpo do balcão à frente da cadeira.
          const counter = this.add.graphics().setDepth(ry + 8);
          counter.fillStyle(0x334155);
          counter.fillPoints([
            {x:rx-31,y:ry-20},{x:rx,y:ry-5},{x:rx,y:ry+13},{x:rx-31,y:ry-2},
          ],true);
          counter.fillStyle(0x475569);
          counter.fillPoints([
            {x:rx,y:ry-5},{x:rx+31,y:ry-20},{x:rx+31,y:ry-2},{x:rx,y:ry+13},
          ],true);
          counter.lineStyle(2,0x38bdf8);
          counter.lineBetween(rx-30,ry-3,rx,ry+12);
          counter.lineBetween(rx,ry+12,rx+30,ry-3);
          counter.fillStyle(0xe8b77c);
          counter.fillPoints([
            {x:rx,y:ry-37},{x:rx+32,y:ry-21},
            {x:rx,y:ry-5},{x:rx-32,y:ry-21},
          ],true);
          counter.lineStyle(2,0xffe2ae);
          counter.strokePoints([
            {x:rx,y:ry-37},{x:rx+32,y:ry-21},
            {x:rx,y:ry-5},{x:rx-32,y:ry-21},
          ],true);
          // Monitor separado com pedestal sobre o tampo.
          const monitor = this.add.container(rx+3,ry-33).setDepth(ry+12);
          monitor.add([
            this.add.rectangle(0,2,3,9,0x64748b),
            this.add.rectangle(0,6,12,3,0x334155),
            this.add.rectangle(0,-10,23,17,0x0f172a).setStrokeStyle(2,0x64748b),
            this.add.rectangle(0,-10,17,11,0x075985),
            this.add.rectangle(-3,-12,7,2,0x38bdf8),
            this.add.rectangle(3,-8,8,2,0x7dd3fc),
          ]);
          this.add.text(rx,ry+3,"RECEPÇÃO",{
            fontFamily:"monospace",fontSize:"7px",color:"#e0f2fe",
            backgroundColor:"#17253d",
          }).setOrigin(0.5).setDepth(ry+13);
          // Decoracao visual isolada: nao altera tiles, colisao, rotas ou servicos.
          // Os detalhes ficam em areas livres e nao sao interativos.
          const decor = this.add.graphics().setDepth(70);
          const addPlant = (col: number, row: number) => {
            const p = tile(col, row);
            decor.fillStyle(0x92400e, 1);
            decor.fillRoundedRect(p.x - 7, p.y - 12, 14, 12, 3);
            decor.fillStyle(0x166534, 1);
            decor.fillCircle(p.x - 5, p.y - 17, 7);
            decor.fillCircle(p.x + 5, p.y - 19, 8);
            decor.fillStyle(0x22c55e, 1);
            decor.fillCircle(p.x, p.y - 24, 7);
          };
          // Pequenos vasos decorativos, sem bloquear as passagens.
          addPlant(0, 2);
          addPlant(8, 2);
          addPlant(0, 7);
          addPlant(8, 7);
          // Quadros de parede e letreiros de setor, apenas cenograficos.
          for (const [col, row, color] of [
            [1, 0, 0x1d4ed8], [7, 0, 0x059669],
            [0, 7, 0xd97706], [7, 8, 0x7c3aed],
          ] as const) {
            const p = tile(col, row);
            this.add.rectangle(p.x, p.y - 20, 23, 15, 0xf8fafc)
              .setStrokeStyle(2, 0x475569).setDepth(p.y - 1);
            this.add.rectangle(p.x, p.y - 20, 17, 9, color, 0.85)
              .setDepth(p.y);
          }
          // Acabamento cenografico: placas de setor e luzes discretas.
          // Elementos puramente graficos: sem alterar blocked, findPath ou eventos.
          // Uma unica placa por setor, posicionada na borda externa do mapa.
          const sectorDetails = [
            { col: 0, row: 1, color: 0x2563eb, label: "DIRETORIA" },
            { col: 7, row: 0, color: 0x059669, label: "TRADING" },
            { col: 1, row: 8, color: 0xd97706, label: "RECEPCAO" },
            { col: 8, row: 7, color: 0x7c3aed, label: "RISCO" },
          ] as const;
          for (const sector of sectorDetails) {
            const p = tile(sector.col, sector.row);
            const sign = this.add.container(p.x, p.y - 56).setDepth(900);
            sign.add([
              this.add.rectangle(0, 0, 66, 16, 0x0f172a, 0.96)
                .setStrokeStyle(1, sector.color),
              this.add.rectangle(-29, 0, 3, 10, sector.color),
              this.add.text(3, 0, sector.label, {
                fontFamily: "monospace", fontSize: "9px", color: "#f8fafc",
              }).setOrigin(0.5),
            ]);
          }
          // Iluminacao de piso suave nas entradas, sem criar obstaculos.
          for (const [col, row] of [[1, 4], [7, 4], [4, 1], [4, 7]] as const) {
            const p = tile(col, row);
            this.add.ellipse(p.x, p.y + 1, 26, 8, 0xfef3c7, 0.24)
              .setDepth(p.y - 5);
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
          // Detalhes visuais pixel-art da Cíntia; preserva o container,
          // as animações de caminhada e o mapa lógico de colisões.
          const collar = this.add.rectangle(0, -25, 8, 3, 0xe2e8f0);
          const belt = this.add.rectangle(0, -9, 15, 3, 0x1e40af);
          const badge = this.add.rectangle(5, -19, 4, 5, 0xf8fafc);
          // Rosto e cabelo em camadas pixel-art, sem mudar o hitbox ou o movimento.
          const eyes = [
            this.add.rectangle(-3, -34, 2, 2, 0x1e293b),
            this.add.rectangle(3, -34, 2, 2, 0x1e293b),
            this.add.rectangle(0, -30, 4, 1, 0x9a563e),
            this.add.rectangle(-8, -39, 4, 4, 0x422006),
            this.add.rectangle(8, -39, 4, 4, 0x422006),
            this.add.rectangle(-3, -42, 9, 2, 0x713f12),
            this.add.rectangle(-6, -18, 2, 7, 0x1d4ed8),
            this.add.rectangle(6, -18, 2, 7, 0x1d4ed8),
          ];
          const shoes = [
            this.add.rectangle(-4, 1, 7, 3, 0x0f172a),
            this.add.rectangle(4, 1, 7, 3, 0x0f172a),
          ];
          agent.add([shadow, leftLeg, rightLeg, ...shoes, body, belt,
            leftArm, rightArm, collar, badge, head, hair, ...eyes]);
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
            { name: "Max Trader", col: 8, row: 0, shirt: 0x0f766e },
            { name: "Ana News", col: 0, row: 8, shirt: 0x7c3aed },
            { name: "Rita Risk", col: 8, row: 8, shirt: 0xb45309 },
            { name: "Sofia Quant", col: 2, row: 0, shirt: 0xbe123c },
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
            if (member.name === "Max Trader") movingColleague = colleague;
            colleague.add([
              this.add.ellipse(0, 0, 18, 6, 0x0f172a, 0.3),
              this.add.rectangle(-4, -5, 5, 12, 0x1e293b),
              this.add.rectangle(4, -5, 5, 12, 0x1e293b),
              this.add.rectangle(0, -17, 15, 19, member.shirt),
              this.add.circle(0, -33, 8, 0xf5c99a),
              this.add.arc(0, -37, 8, 180, 360, false, 0x422006),
              // Acabamentos de uniforme e expressão, sem lógica operacional.
              this.add.rectangle(0, -25, 7, 3, 0xe2e8f0),
              this.add.rectangle(0, -9, 14, 3, 0x334155),
              this.add.rectangle(5, -18, 3, 4, 0xf8fafc),
              this.add.rectangle(-3, -33, 2, 2, 0x1e293b),
              this.add.rectangle(3, -33, 2, 2, 0x1e293b),
              // Expressão, cabelo em pixels e detalhes do uniforme.
              this.add.rectangle(0, -29, 4, 1, 0x9a563e),
              this.add.rectangle(-7, -38, 3, 4, 0x422006),
              this.add.rectangle(7, -38, 3, 4, 0x422006),
              this.add.rectangle(-3, -41, 8, 2, 0x713f12),
              this.add.rectangle(-5, -18, 2, 7, 0xffffff, 0.35),
              this.add.rectangle(5, -18, 2, 7, 0x0f172a, 0.25),
              this.add.rectangle(-4, 1, 7, 3, 0x0f172a),
              this.add.rectangle(4, 1, 7, 3, 0x0f172a),
              this.add.text(0, -52, member.name, { fontSize: "9px", color: "#ffffff", backgroundColor: "#0f172a", padding: { x: 2, y: 1 } }).setOrigin(0.5),
            ]);
          }
          const cintiaLabel = this.add.text(0, -53, "Cíntia", { fontSize: "10px", color: "#ffffff", backgroundColor: "#1e3a8a", padding: { x: 3, y: 1 } }).setOrigin(0.5);
          agent.add(cintiaLabel);
          // Afasta a etiqueta da Cíntia dos nomes dos colegas quando ela se aproxima.
          // Só muda a posição do texto: não interfere em movimento, portas ou colisões.
          const colleagueLabels = demoTeam.map((member) => ({
            x: tile(member.col, member.row).x,
            y: tile(member.col, member.row).y - 52,
            width: member.name.length * 6 + 8,
          }));
          this.events.on("update", () => {
            const labelY = agent.y - 53;
            const near = colleagueLabels.some((label) =>
              Math.abs(agent.x - label.x) < (label.width + 45) / 2 + 4 &&
              Math.abs(labelY - label.y) < 13);
            const targetX = near ? (agent.x < 320 ? -40 : 40) : 0;
            cintiaLabel.x = Phaser.Math.Linear(cintiaLabel.x, targetX, 0.22);
          });
          // Sensor de proximidade acompanha a posição real dos avatares.
          // A porta só fecha quando ninguém está próximo; sem alterar
          // autenticação, pathfinding, bloqueios ou lógica financeira.
          this.events.on("update", (_time: number, delta: number) => {
            const actors = [agent, ...(movingColleague ? [movingColleague] : [])];
            for (const door of automaticDoors) {
              const p = tile(door.col, door.row);
              const nearby = actors.some((actor) =>
                Phaser.Math.Distance.Between(actor.x, actor.y, p.x, p.y) < 69);
              const target = nearby ? 1 : 0;
              const step = Math.min(1, delta / 350);
              const next = Phaser.Math.Linear(door.openness, target, step);
              if (Math.abs(next - door.openness) > 0.001) {
                door.openness = next;
                drawAutomaticDoor(door);
              }
            }
          });
          let walking = false;
          let seated = false;
          let seating = false;
          const seatApproach: [number, number] = [2, 6];
          const seatPoint = {x: receptionDeskPosition.x-7, y: receptionDeskPosition.y-16};
          const sitDown = () => {
            if (seated || seating) return;
            seating = true;
            walkMotion.pause(); oppositeMotion.pause();
            this.tweens.add({
              targets: agent, x: seatPoint.x, y: seatPoint.y, duration: 330,
              onUpdate: () => agent.setDepth(receptionDeskPosition.y-7),
              onComplete: () => {
                seated = true; seating = false;
                leftLeg.setVisible(false); rightLeg.setVisible(false);
                agent.setDepth(receptionDeskPosition.y-7);
              },
            });
          };
          // Ciclo demonstrativo: deslocamento, monitoramento e pausa.
          // As duas casas ficam reservadas no mapa, sem acesso a trading real.
          if (movingColleague) {
            const colleague = movingColleague;
            const station = tile(7, 0);
            const rest = tile(8, 0);
            const setStatus = (message: string) => {
              if (statusRef.current) statusRef.current.textContent = message.replace("Agente 2: ", "");
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
            if (walking || seating) return;
            const wantsSeat = goal[0] === receptionDeskTile[0] && goal[1] === receptionDeskTile[1];
            if (!wantsSeat && blocked.has(goal.join(","))) return;
            const destination: [number, number] = wantsSeat ? seatApproach : goal;
            const beginWalk = () => {
            const path = findPath(location, destination).slice(1);
            if (!path.length) { if (wantsSeat) sitDown(); return; }
            walking = true;
            walkMotion.resume();
            oppositeMotion.resume();
            const advance = () => {
              const next = path.shift();
              if (!next) { walking = false; walkMotion.pause(); oppositeMotion.pause(); leftLeg.setAngle(0); rightLeg.setAngle(0); leftArm.setAngle(0); rightArm.setAngle(0); if (wantsSeat) sitDown(); return; }
              const p = tile(...next);
              this.tweens.add({
                targets: agent, x: p.x, y: p.y, duration: 230,
                onUpdate: () => agent.setDepth(agent.y + 10),
                onComplete: () => { location = next; advance(); },
              });
            };
            advance();
            };
            if (seated) {
              seated = false; seating = true;
              this.tweens.add({
                targets: agent, x: tile(...seatApproach).x, y: tile(...seatApproach).y,
                duration: 330,
                onComplete: () => {
                  location = [...seatApproach];
                  leftLeg.setVisible(true); rightLeg.setVisible(true);
                  seating = false; beginWalk();
                },
              });
            } else beginWalk();
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
      <section aria-label="Painel demonstrativo dos seis agentes" style={{ marginTop: 10, padding: 12, background: "#0f172a", color: "#e2e8f0", borderRadius: 8, fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Equipe virtual • demonstração</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 8 }}>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Cíntia</strong><div>Recepção</div><div style={{ color: "#93c5fd" }}>Controle por toque</div></div>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Max Trader</strong><div>Mesa de Execução • visual</div><div ref={statusRef} role="status" aria-live="polite" style={{ color: "#bae6fd" }}>Aguardando</div></div>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Ana News</strong><div>Pesquisa & Notícias • visual</div><div style={{ color: "#94a3b8" }}>Em posição • demo</div></div>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Rita Risk</strong><div>Gestão de Risco • visual</div><div style={{ color: "#94a3b8" }}>Em posição • demo</div></div>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Sofia Quant</strong><div>Análise Gráfica • visual</div><div style={{ color: "#94a3b8" }}>Em posição • demo</div></div>
          <div style={{ padding: 8, border: "1px solid #334155", borderRadius: 6 }}><strong>Agente 6</strong><div>Recepção</div><div style={{ color: "#94a3b8" }}>Em posição • demo</div></div>
        </div>
        <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 11 }}>Nomes e funções encontrados no código; vínculos dos avatares são ilustrativos. Nenhum estado ou operação financeira é consultado.</div>
      </section>
    </div>
  );
}
