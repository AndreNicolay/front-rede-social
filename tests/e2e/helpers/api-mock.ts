// Simula a API REST interceptando a rede do navegador (page.route).
// Funciona igual para fetch e axios, então os testes sobrevivem à migração.
import type { Page, Route } from '@playwright/test';
import { API_TESTE } from './config.ts';

export interface Requisicao {
  metodo: string;
  caminho: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  corpo: any;
  params: Record<string, string>;
}

export interface Resposta {
  status?: number;
  json?: unknown;
}

export type Handler = (req: Requisicao) => Resposta | Promise<Resposta>;

export function json(dados: unknown, status = 200): Resposta {
  return { status, json: dados };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Rota {
  metodo: string;
  regex: RegExp;
  nomes: string[];
  handler: Handler;
}

/** 'GET /posts/:id' -> regex que casa com 'GET /posts/10' e captura id. */
function compilar(chave: string): Omit<Rota, 'handler'> {
  const [metodo, caminho] = chave.split(' ');
  const nomes: string[] = [];
  const padrao = caminho
    .split('/')
    .map(parte => {
      if (!parte.startsWith(':')) return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      nomes.push(parte.slice(1));
      return '([^/]+)';
    })
    .join('/');
  return { metodo, regex: new RegExp(`^${padrao}$`), nomes };
}

export class ApiMock {
  /** Toda requisição feita à API, na ordem. */
  readonly requisicoes: Requisicao[] = [];
  /** Requisições sem mock; o fixture falha o teste se sobrar alguma. */
  readonly naoMapeadas: string[] = [];
  private rotas: Rota[] = [];

  /** Registra uma resposta. A última registrada para a mesma rota vence. */
  on(chave: string, resposta: Handler | Resposta): this {
    const handler = typeof resposta === 'function' ? resposta : () => resposta;
    this.rotas.unshift({ ...compilar(chave), handler });
    return this;
  }

  /** Requisições que casam com a chave, ex.: chamadas('PATCH /posts/:id') ou chamadas('GET /chat/2'). */
  chamadas(chave: string): Requisicao[] {
    const { metodo, regex } = compilar(chave);
    return this.requisicoes.filter(r => r.metodo === metodo && regex.test(r.caminho));
  }

  /**
   * Mini json-server em memória para uma coleção: GET (lista com filtros e _sort/_order),
   * GET /:id, POST, PATCH, PUT e DELETE. Devolve o array vivo para o teste conferir o estado.
   */
  colecao<T extends { id: number | string }>(nome: string, itens: T[]): T[] {
    const acharIndice = (id: string) => itens.findIndex(item => String(item.id) === id);

    this.on(`GET /${nome}`, ({ query }) => {
      let lista = [...itens];
      for (const [campo, valor] of query) {
        if (!campo.startsWith('_')) lista = lista.filter(item => String((item as any)[campo]) === valor);
      }
      const ordenarPor = query.get('_sort');
      if (ordenarPor) {
        const sinal = query.get('_order') === 'desc' ? -1 : 1;
        lista.sort((a: any, b: any) => (a[ordenarPor] > b[ordenarPor] ? sinal : a[ordenarPor] < b[ordenarPor] ? -sinal : 0));
      }
      return json(lista);
    });
    this.on(`GET /${nome}/:id`, ({ params }) => {
      const i = acharIndice(params.id);
      return i === -1 ? json({}, 404) : json(itens[i]);
    });
    this.on(`POST /${nome}`, ({ corpo }) => {
      const id = Math.max(0, ...itens.map(item => Number(item.id) || 0)) + 1;
      const novo = { ...corpo, id } as T;
      itens.push(novo);
      return json(novo, 201);
    });
    const atualizar: Handler = ({ params, corpo, metodo }) => {
      const i = acharIndice(params.id);
      if (i === -1) return json({}, 404);
      itens[i] = metodo === 'PUT' ? ({ ...corpo, id: itens[i].id } as T) : { ...itens[i], ...corpo };
      return json(itens[i]);
    };
    this.on(`PATCH /${nome}/:id`, atualizar);
    this.on(`PUT /${nome}/:id`, atualizar);
    this.on(`DELETE /${nome}/:id`, ({ params }) => {
      const i = acharIndice(params.id);
      if (i === -1) return json({}, 404);
      itens.splice(i, 1);
      return json({});
    });
    return itens;
  }

  async instalar(page: Page): Promise<void> {
    // Nada sai do localhost (imagens externas, Render etc.)
    await page.route(url => url.hostname !== 'localhost', route => route.abort('blockedbyclient'));

    await page.route(url => url.origin === API_TESTE, route => this.atender(route));
  }

  private async atender(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());

    // O Socket.IO segue para o servidor de socket de teste (mesma origem da API)
    if (url.pathname.startsWith('/socket.io/')) return route.fallback();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    let corpo: unknown = null;
    try {
      corpo = request.postDataJSON();
    } catch {
      corpo = request.postData();
    }

    const requisicao: Requisicao = {
      metodo: request.method(),
      caminho: url.pathname,
      query: url.searchParams,
      headers: request.headers(),
      corpo,
      params: {},
    };
    this.requisicoes.push(requisicao);

    for (const rota of this.rotas) {
      const casou = rota.metodo === requisicao.metodo && requisicao.caminho.match(rota.regex);
      if (!casou) continue;
      rota.nomes.forEach((nome, i) => (requisicao.params[nome] = decodeURIComponent(casou[i + 1])));
      const { status = 200, json: dados } = await rota.handler(requisicao);
      return route.fulfill({ status, headers: CORS, json: dados ?? {} });
    }

    this.naoMapeadas.push(`${requisicao.metodo} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 501, headers: CORS, json: { erro: 'rota sem mock no teste' } });
  }
}
