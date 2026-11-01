// src/components/SecondBrainGraph.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MemoryEngine, BrainNode, NodeCategory } from '../lib/memoryEngine';

interface SimNode extends BrainNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  diretriz: '#a855f7',    // Roxo (Objetivos / Regras da Empresa)
  agente: '#3b82f6',      // Azul (Agentes de IA)
  ativo: '#f59e0b',       // Amarelo Ouro (Ativos da Binance)
  padrao_gain: '#10b981', // Verde Esmeralda (Padrões de Gain)
  alerta_loss: '#ef4444', // Vermelho (Erros / Armadilhas bloqueadas)
  noticia: '#06b6d4',     // Ciano (Eventos Macro / Notícias)
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  diretriz: 'Diretriz / Objetivo',
  agente: 'Agente IA',
  ativo: 'Ativo / Par',
  padrao_gain: 'Memória de Gain',
  alerta_loss: 'Trava / Loss Evitado',
  noticia: 'Notícia / Macro',
};

export const SecondBrainGraph: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodes, setNodes] = useState<BrainNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);
  const [search, setSearch] = useState('');

  // Estados do formulário de nova memória / edição
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<NodeCategory>('diretriz');
  const [editContent, setEditContent] = useState('');

  const simNodesRef = useRef<SimNode[]>([]);
  const draggedNodeRef = useRef<SimNode | null>(null);
  const hoveredNodeRef = useRef<SimNode | null>(null);

  const loadBrain = () => {
    const loadedNodes = MemoryEngine.getNodes();
    setNodes(loadedNodes);

    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;
    const links = MemoryEngine.getLinks(loadedNodes);

    simNodesRef.current = loadedNodes.map((n) => {
      const existing = simNodesRef.current.find((sn) => sn.id === n.id);
      const connectionCount = links.filter(l => l.source === n.id || l.target === n.id).length;
      return {
        ...n,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 280,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 280,
        vx: 0,
        vy: 0,
        radius: Math.min(18, Math.max(7, 6 + connectionCount * 1.8)),
      };
    });
  };

  useEffect(() => {
    loadBrain();
    window.addEventListener('ssd-brain-updated', loadBrain);
    return () => window.removeEventListener('ssd-brain-updated', loadBrain);
  }, []);

  // Motor de Física de Grafo (Idêntico ao Obsidian)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const simNodes = simNodesRef.current;
      const links = MemoryEngine.getLinks(simNodes);

      // 1. Física de repulsão entre todos os nós
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          const force = 1800 / distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (draggedNodeRef.current?.id !== a.id) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (draggedNodeRef.current?.id !== b.id) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // 2. Física de atração (Mola) para nós conectados via [[Links]]
      links.forEach((link) => {
        const source = simNodes.find((n) => n.id === link.source);
        const target = simNodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 135;
        const force = (dist - targetDist) * 0.015;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (draggedNodeRef.current?.id !== source.id) {
          source.vx += fx;
          source.vy += fy;
        }
        if (draggedNodeRef.current?.id !== target.id) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // 3. Gravidade central suave + Atualização de posição
      simNodes.forEach((n) => {
        if (draggedNodeRef.current?.id !== n.id) {
          n.vx += (width / 2 - n.x) * 0.0025;
          n.vy += (height / 2 - n.y) * 0.0025;
          n.vx *= 0.82; // Amortecimento
          n.vy *= 0.82;
          n.x += n.vx;
          n.y += n.vy;

          // Mantém dentro da tela
          n.x = Math.max(40, Math.min(width - 40, n.x));
          n.y = Math.max(40, Math.min(height - 40, n.y));
        }
      });

      // 4. Desenho do fundo e grade sutil
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const activeId = hoveredNodeRef.current?.id || selectedNode?.id;

      // 5. Desenha as conexões (Linhas)
      links.forEach((link) => {
        const source = simNodes.find((n) => n.id === link.source);
        const target = simNodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        const isHighlighted = activeId && (link.source === activeId || link.target === activeId);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isHighlighted ? '#a855f7' : 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = isHighlighted ? 2.2 : 1;
        ctx.stroke();
      });

      // 6. Desenha os Nós (Bolinhas e Textos)
      simNodes.forEach((n) => {
        const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
        const isHoveredOrSelected = n.id === activeId;

        ctx.globalAlpha = matchesSearch ? 1 : 0.2;

        // Brilho externo (Glow)
        if (isHoveredOrSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `${CATEGORY_COLORS[n.category]}44`;
          ctx.fill();
        }

        // Círculo principal
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = CATEGORY_COLORS[n.category];
        ctx.fill();
        ctx.strokeStyle = isHoveredOrSelected ? '#ffffff' : '#1e293b';
        ctx.lineWidth = isHoveredOrSelected ? 2 : 1;
        ctx.stroke();

        // Rótulo do Nó
        ctx.font = isHoveredOrSelected ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
        ctx.fillStyle = isHoveredOrSelected ? '#ffffff' : '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x, n.y + n.radius + 15);

        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedNode, search]);

  // Interações de Mouse (Arrastar e Clicar nos Nós)
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    const clicked = simNodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) <= n.radius + 6);
    if (clicked) {
      draggedNodeRef.current = clicked;
      setSelectedNode(clicked);
      setEditTitle(clicked.title);
      setEditCategory(clicked.category);
      setEditContent(clicked.content);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      return;
    }
    const hovered = simNodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) <= n.radius + 6) || null;
    hoveredNodeRef.current = hovered;
    e.currentTarget.style.cursor = hovered ? 'grab' : 'default';
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
  };

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    MemoryEngine.saveNode({
      id: selectedNode?.title.toLowerCase() === editTitle.toLowerCase() ? selectedNode.id : undefined,
      title: editTitle,
      category: editCategory,
      content: editContent,
    });
    loadBrain();
  };

  const handleNewBlankNode = () => {
    setSelectedNode(null);
    setEditTitle('');
    setEditCategory('diretriz');
    setEditContent('Conectado a [[Diretrizes da Mesa]] e [[BTCUSDT]]. ');
  };

  const handleExportObsidian = () => {
    const allNodes = MemoryEngine.getNodes();
    const combinedMarkdown = allNodes
      .map(n => `# ${n.title}\nCategoria: #${n.category}\nData: ${n.createdAt}\n\n${n.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([combinedMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SignalSymphony_ObsidianVault_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 shadow-2xl">
      {/* COLUNA ESQUERDA/CENTRAL: GRAFO INTERATIVO 2/3 */}
      <div className="lg:col-span-2 flex flex-col bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="font-bold text-sm tracking-wide uppercase text-slate-200">
              Segundo Cérebro Neural • Signal Symphony Desk
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filtrar nó ou ativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleExportObsidian}
              className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded border border-slate-700 transition"
              title="Exportar notas com [[wikilinks]] para o Obsidian"
            >
              Exportar .MD (Obsidian)
            </button>
          </div>
        </div>

        {/* CANVAS DO GRAFO */}
        <div className="relative flex-1 min-h-[460px]">
          <canvas
            ref={canvasRef}
            width={850}
            height={520}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full block"
          />

          {/* LEGENDA DE CORES */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 bg-slate-950/85 backdrop-blur px-3 py-2 rounded-lg border border-slate-800 text-[11px]">
            {(Object.keys(CATEGORY_COLORS) as NodeCategory[]).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="text-slate-300">{CATEGORY_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: EDITOR DE MEMÓRIA E CONEXÕES [[WIKILINKS]] */}
      <div className="flex flex-col justify-between bg-slate-900/80 p-4 rounded-lg border border-slate-800">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-semibold text-sm text-purple-400">
              {selectedNode ? `Editando: ${selectedNode.title}` : 'Nova Memória / Regra'}
            </h3>
            <button
              onClick={handleNewBlankNode}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded font-medium transition"
            >
              + Novo Nó
            </button>
          </div>

          <form onSubmit={handleSaveMemory} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Título do Nó (ex: BTCUSDT, Regra de Stop)</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Ex: Estratégia Rompimento 15m"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Categoria no Grafo</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as NodeCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                {(Object.keys(CATEGORY_LABELS) as NodeCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Conhecimento em Português (use <code className="text-purple-400">[[Nome]]</code> para ligar os pontos)
              </label>
              <textarea
                rows={6}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Ex: Sempre que o [[Agente de Notícias]] detectar juros altos, o [[Agente Gestor de Risco]] deve reduzir a mão em [[BTCUSDT]]."
                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:border-purple-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2 rounded transition"
              >
                Salvar e Conectar no Grafo
              </button>
              {selectedNode && (
                <button
                  type="button"
                  onClick={() => {
                    MemoryEngine.deleteNode(selectedNode.id);
                    handleNewBlankNode();
                  }}
                  className="bg-red-900/60 hover:bg-red-800 text-red-200 text-xs px-3 py-2 rounded border border-red-800 transition"
                >
                  Excluir
                </button>
              )}
            </div>
          </form>
        </div>

        {/* DICA RÁPIDA DE ATALHOS */}
        <div className="mt-6 bg-slate-950/90 p-3 rounded border border-slate-800/80 text-xs text-slate-400 space-y-1">
          <p className="text-slate-200 font-medium">💡 Como os agentes usam isso:</p>
          <p>
            Qualquer palavra que você colocar entre colchetes duplos como <span className="text-purple-400">[[BTCUSDT]]</span> ou <span className="text-purple-400">[[Agente Executor]]</span> vira automaticamente uma linha neural no grafo e entra no prompt de decisão da equipe.
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Total de memórias ativas: {nodes.length} nós
          </p>
        </div>
      </div>
    </div>
  );
};
