// Fixtures compartilhados por todos os specs. Importe `test` e `expect` daqui, não do @playwright/test.
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import type { MensagemSocket } from '../../src/types/api.ts';
import { ApiMock } from './helpers/api-mock.ts';
import { API_TESTE } from './helpers/config.ts';

interface EventoRecebido {
  evento: string;
  userId: string;
  dados: any;
}

/** Controla o servidor de socket de teste (tests/e2e/mock-server/socket-server.ts). */
export class SocketControle {
  private readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async eventos(evento?: string): Promise<EventoRecebido[]> {
    const todos: EventoRecebido[] = await (await this.request.get(`${API_TESTE}/__test/eventos`)).json();
    return evento ? todos.filter(e => e.evento === evento) : todos;
  }

  async mensagens(): Promise<MensagemSocket[]> {
    return (await this.request.get(`${API_TESTE}/__test/mensagens`)).json();
  }

  async conectados(): Promise<string[]> {
    return (await this.request.get(`${API_TESTE}/__test/conectados`)).json();
  }

  /** Simula o servidor emitindo um evento para o usuário (ex.: mensagem chegando de outra pessoa). */
  async emitir(paraUserId: number, evento: string, dados: unknown): Promise<void> {
    await this.request.post(`${API_TESTE}/__test/emitir`, { data: { paraUserId, evento, dados } });
  }
}

export const test = base.extend<{ api: ApiMock; socketServer: SocketControle }>({
  socketServer: [
    async ({ request }, use) => {
      await request.post(`${API_TESTE}/__test/reset`);
      await use(new SocketControle(request));
    },
    { auto: true },
  ],
  api: [
    async ({ page }, use) => {
      const api = new ApiMock();
      await api.instalar(page);
      await use(api);
      expect(api.naoMapeadas, 'a página chamou rotas da API sem mock').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export function lerStorage(page: Page, chave: string): Promise<string | null> {
  return page.evaluate(k => localStorage.getItem(k), chave);
}

/** Espera o próximo alert/confirm, aceita e devolve a mensagem. Chame antes da ação que abre o alerta. */
export async function proximoAlerta(page: Page): Promise<string> {
  const dialogo = await page.waitForEvent('dialog');
  const mensagem = dialogo.message();
  await dialogo.accept();
  return mensagem;
}
