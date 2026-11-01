// src/lib/memoryEngine.ts

export type NodeCategory = 'diretriz' | 'agente' | 'ativo' | 'padrao_gain' | 'alerta_loss' | 'noticia';

export interface BrainNode {
  id: string;
  title: string;
  category: NodeCategory;
  content: string; // Texto em Markdown com suporte a [[Links]]
  createdAt: string;
  metrics?: {
    winRateImpact?: number;
    pnl?: number;
  };
}

export interface BrainLink {
  source: string; // ID do nó de origem
  target: string; // ID do nó de destino
}

const STORAGE_KEY = 'ssd_second_brain_v1';

// Memória inicial de fábrica da Signal Symphony Desk
const INITIAL_NODES: BrainNode[] = [
  {
    id: 'core-mesa',
    title: 'Diretrizes da Mesa',
    category: 'diretriz',
    content: 'Objetivo central: Preservação de capital e consistência no Paper Trading. Risco máximo de 1.5% por operação supervisionado pelo [[Agente Gestor de Risco]]. Foco principal em [[BTCUSDT]] e [[ETHUSDT]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agente-tecnico',
    title: 'Agente Analista Técnico',
    category: 'agente',
    content: 'Monitora RSI, EMA 9/21 e MACD em tempo real. Reporta gatilhos para [[Diretrizes da Mesa]] e valida confluências em [[BTCUSDT]] e [[ETHUSDT]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agente-risco',
    title: 'Agente Gestor de Risco',
    category: 'agente',
    content: 'Trava matemática fixa em código. Bloqueia ordens do [[Agente Executor]] se o drawdown diário passar de 3% ou se houver [[Armadilha de Baixa Liquidez]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agente-noticias',
    title: 'Agente de Notícias',
    category: 'agente',
    content: 'Analisa sentimento macroeconômico e alimenta alertas para [[BTCUSDT]] antes de discursos do FED.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agente-executor',
    title: 'Agente Executor',
    category: 'agente',
    content: 'Executa ordens validadas pelo [[Agente Analista Técnico]] e liberadas pelo [[Agente Gestor de Risco]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ativo-btc',
    title: 'BTCUSDT',
    category: 'ativo',
    content: 'Ativo principal da mesa. Alta eficiência no padrão [[Confluência RSI Sobrevendido + EMA]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ativo-eth',
    title: 'ETHUSDT',
    category: 'ativo',
    content: 'Ativo secundário correlacionado ao [[BTCUSDT]]. Monitorado pelo [[Agente Analista Técnico]].',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'padrao-1',
    title: 'Confluência RSI Sobrevendido + EMA',
    category: 'padrao_gain',
    content: 'Quando o RSI (14) cai abaixo de 30 e ocorre cruzamento de alta na EMA 9/21 em [[BTCUSDT]], a taxa de acerto histórica do [[Agente Analista Técnico]] sobe drasticamente.',
    createdAt: new Date().toISOString(),
    metrics: { winRateImpact: 78, pnl: 145.50 }
  },
  {
    id: 'alerta-1',
    title: 'Armadilha de Baixa Liquidez',
    category: 'alerta_loss',
    content: 'Evitar entradas de rompimento em [[BTCUSDT]] e [[ETHUSDT]] quando o volume estiver 40% abaixo da média móvel. Regra cravada pelo [[Agente Gestor de Risco]].',
    createdAt: new Date().toISOString(),
    metrics: { pnl: -42.00 }
  }
];

export const MemoryEngine = {
  getNodes(): BrainNode[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NODES));
      return INITIAL_NODES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_NODES;
    }
  },

  saveNode(node: Omit<BrainNode, 'id' | 'createdAt'> & { id?: string }): BrainNode[] {
    const nodes = this.getNodes();
    const id = node.id || node.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingIndex = nodes.findIndex(n => n.id === id || n.title.toLowerCase() === node.title.toLowerCase());

    const newNode: BrainNode = {
      id,
      title: node.title,
      category: node.category,
      content: node.content,
      createdAt: new Date().toISOString(),
      metrics: node.metrics
    };

    if (existingIndex >= 0) {
      nodes[existingIndex] = { ...nodes[existingIndex], ...newNode };
    } else {
      nodes.push(newNode);
    }

    // Cria automaticamente nós "fantasmas" se você citar [[Algo Novo]] no texto!
    const wikiMatches = [...node.content.matchAll(/\[\[(.*?)\]\]/g)].map(m => m[1].trim());
    wikiMatches.forEach(linkedTitle => {
      const exists = nodes.some(n => n.title.toLowerCase() === linkedTitle.toLowerCase());
      if (!exists && linkedTitle) {
        nodes.push({
          id: linkedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: linkedTitle,
          category: 'diretriz',
          content: `Nó criado automaticamente por conexão a partir de [[${node.title}]].`,
          createdAt: new Date().toISOString()
        });
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    window.dispatchEvent(new CustomEvent('ssd-brain-updated'));
    return nodes;
  },

  deleteNode(id: string): BrainNode[] {
    const nodes = this.getNodes().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    window.dispatchEvent(new CustomEvent('ssd-brain-updated'));
    return nodes;
  },

  // Extrai todas as linhas que ligam os pontos a partir das tags [[Nome]]
  getLinks(nodes: BrainNode[]): BrainLink[] {
    const links: BrainLink[] = [];
    nodes.forEach(sourceNode => {
      const matches = [...sourceNode.content.matchAll(/\[\[(.*?)\]\]/g)].map(m => m[1].trim());
      matches.forEach(targetTitle => {
        const targetNode = nodes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
        if (targetNode && targetNode.id !== sourceNode.id) {
          links.push({ source: sourceNode.id, target: targetNode.id });
        }
      });
    });
    return links;
  },

  // FUNÇÃO PARA OS AGENTES E WEB WORKER:
  // Chame isso no seu prompt de IA para o agente "lembrar" tudo sobre o ativo ou regra!
  getContextForQuery(term: string): string {
    const nodes = this.getNodes();
    const relevant = nodes.filter(
      n => n.title.toLowerCase().includes(term.toLowerCase()) ||
           n.content.toLowerCase().includes(term.toLowerCase()) ||
           n.category === 'diretriz'
    );
    return relevant
      .map(n => `[Memória: ${n.title} (${n.category.toUpperCase()})]: ${n.content}`)
      .join('\n');
  },

  // Registra automaticamente um Trade finalizado no Segundo Cérebro
  recordTradeMemory(symbol: string, side: 'BUY' | 'SELL', pnl: number, reason: string) {
    const isWin = pnl >= 0;
    const title = `Trade ${side} ${symbol} (${isWin ? 'GAIN' : 'LOSS'} $${pnl.toFixed(2)})`;
    this.saveNode({
      title,
      category: isWin ? 'padrao_gain' : 'alerta_loss',
      content: `Operação de ${side} executada pelo [[Agente Executor]] no ativo [[${symbol}]] após análise do [[Agente Analista Técnico]]. Motivo técnico: ${reason}. Resultado validado pelo [[Agente Gestor de Risco]].`,
      metrics: { pnl }
    });
  }
};
