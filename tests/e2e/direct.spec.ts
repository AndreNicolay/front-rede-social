import type { Page } from '@playwright/test';
import type { Mensagem } from '../../src/types/api.ts';
import { expect, lerStorage, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { gerarToken, logarComo } from './helpers/auth.ts';
import { ana, bruno, carla, criarPost, mensagemAntiga, mensagemSocket, posts, usuarios } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

const conversa = (page: Page) => page.locator('#messages');

async function abrirConversaCom(page: Page, username: string) {
  await page.locator('#people-list').getByRole('button', { name: new RegExp(username) }).click();
  await expect(page.locator('#chat-header')).toContainText(username);
}

test.describe('Direct', () => {
  test('sem login redireciona para o login', async ({ page }) => {
    await page.goto(rotas.direct);
    await expect(page).toHaveURL(naRota(rotas.login));
  });

  test('lista as outras pessoas, sem o próprio usuário', async ({ page, api }) => {
    const token = await logarComo(page, ana);
    api.colecao('users', usuarios());
    await page.goto(rotas.direct);

    await expect(page.locator('#people-list .person')).toHaveCount(2);
    await expect(page.locator('#people-list')).toContainText('bruno');
    await expect(page.locator('#people-list')).toContainText('Carla Dias');
    await expect(page.locator('#people-list')).not.toContainText('Ana Souza');
    expect(api.chamadas('GET /users')[0].headers.authorization).toBe(`Bearer ${token}`);
  });

  test('sem outras pessoas mostra aviso', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('users', [usuarios()[0]]);
    await page.goto(rotas.direct);
    await expect(page.getByText('Nenhum outro utilizador encontrado.')).toBeVisible();
  });

  test('abre a conversa em ordem cronológica, aceitando os dois formatos de mensagem', async ({ page, api }) => {
    const token = await logarComo(page, ana);
    api.colecao('users', usuarios());
    api.on('GET /chat/:id', json([
      mensagemSocket(3, ana.id, bruno.id, 'Terceira (minha)', '2026-01-01T10:03:00.000Z'),
      mensagemAntiga(1, bruno.id, ana.id, 'Primeira (dele)', '2026-01-01T10:01:00.000Z'),
      mensagemAntiga(2, ana.id, bruno.id, 'Segunda (minha)', '2026-01-01T10:02:00.000Z'),
    ] satisfies Mensagem[]));
    await page.goto(rotas.direct);

    await abrirConversaCom(page, 'bruno');

    await expect(conversa(page).locator('.message')).toHaveText(['Primeira (dele)', 'Segunda (minha)', 'Terceira (minha)']);
    await expect(conversa(page).locator('.message.mine')).toHaveCount(2);
    await expect(page.locator('.person.selected')).toContainText('bruno');
    const [historico] = api.chamadas(`GET /chat/${bruno.id}`);
    expect(historico.headers.authorization).toBe(`Bearer ${token}`);
  });

  test('conversa vazia convida a dizer oi', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('users', usuarios());
    api.on('GET /chat/:id', json([]));
    await page.goto(rotas.direct);
    await abrirConversaCom(page, 'carla');
    await expect(page.getByText('Nenhuma mensagem ainda. Diga oi!')).toBeVisible();
  });

  test('mensagens com HTML aparecem como texto', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('users', usuarios());
    api.on('GET /chat/:id', json([
      mensagemSocket(1, bruno.id, ana.id, '<img src="/x.png" onerror="window.__xss = true"><b>oi</b>', '2026-01-01T10:00:00.000Z'),
    ]));
    await page.goto(rotas.direct);
    await abrirConversaCom(page, 'bruno');

    await expect(conversa(page).locator('.message')).toHaveText('<img src="/x.png" onerror="window.__xss = true"><b>oi</b>');
    expect(await page.evaluate(() => (window as any).__xss ?? false)).toBe(false);
  });

  test.describe('Post compartilhado', () => {
    test('a referência [post:id] vira um card com os dados do post', async ({ page, api }) => {
      const token = await logarComo(page, bruno);
      api.colecao('users', usuarios());
      api.colecao('posts', posts());
      api.on('GET /chat/:id', json([mensagemSocket(1, ana.id, bruno.id, '[post:10]', '2026-01-01T10:00:00.000Z')]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'ana');

      const card = conversa(page).locator('.shared-post-preview');
      await expect(card).toBeVisible();
      await expect(card).toContainText('@ana');
      await expect(card).toContainText('Pôr do sol na praia');
      await expect(card.getByRole('img', { name: 'Post compartilhado' })).toHaveAttribute('src', /^data:image\/png;base64,/);
      expect(api.chamadas('GET /posts/10')[0].headers.authorization).toBe(`Bearer ${token}`);

      // Clicar leva ao feed destacando o post
      await card.click();
      await expect(page).toHaveURL(naRota(rotas.feedDestacando(10)));
    });

    test('mensagem antiga com o HTML do card é remontada com segurança', async ({ page, api }) => {
      await logarComo(page, bruno);
      api.colecao('users', usuarios());
      api.colecao('posts', posts());
      const htmlAntigo =
        '<div class="shared-post-preview" data-post-id="11" style="border: 1px solid #dbdbdb">' +
        '<img src="/x.png" onerror="window.__xss = true"><span>@ana</span></div>';
      api.on('GET /chat/:id', json([mensagemAntiga(1, ana.id, bruno.id, htmlAntigo, '2026-01-01T10:00:00.000Z')]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'ana');

      await expect(conversa(page).locator('.shared-post-preview')).toContainText('Café da manhã');
      await expect(conversa(page).locator('.shared-post-preview')).toHaveAttribute('data-post-id', '11');
      expect(await page.evaluate(() => (window as any).__xss ?? false)).toBe(false);
    });

    test('legenda maliciosa no post não executa', async ({ page, api }) => {
      await logarComo(page, bruno);
      api.colecao('users', usuarios());
      api.colecao('posts', [criarPost({ id: 40, caption: '<img src="/x.png" onerror="window.__xss = true">' })]);
      api.on('GET /chat/:id', json([mensagemSocket(1, ana.id, bruno.id, '[post:40]', '2026-01-01T10:00:00.000Z')]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'ana');

      await expect(conversa(page).locator('.shared-post-preview')).toContainText('<img src="/x.png"');
      expect(await page.evaluate(() => (window as any).__xss ?? false)).toBe(false);
    });

    test('post apagado mostra "Publicação indisponível"', async ({ page, api }) => {
      await logarComo(page, bruno);
      api.colecao('users', usuarios());
      api.colecao('posts', []);
      api.on('GET /chat/:id', json([mensagemSocket(1, ana.id, bruno.id, '[post:77]', '2026-01-01T10:00:00.000Z')]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'ana');

      await expect(conversa(page).getByText('Publicação indisponível')).toBeVisible();
      await expect(conversa(page).locator('.shared-post-preview')).toHaveCount(0);
    });

    test('o mesmo post é buscado uma vez só', async ({ page, api }) => {
      await logarComo(page, bruno);
      api.colecao('users', usuarios());
      api.colecao('posts', posts());
      api.on('GET /chat/:id', json([
        mensagemSocket(1, ana.id, bruno.id, '[post:10]', '2026-01-01T10:00:00.000Z'),
        mensagemSocket(2, ana.id, bruno.id, '[post:10]', '2026-01-01T10:01:00.000Z'),
      ]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'ana');

      await expect(conversa(page).locator('.shared-post-preview')).toHaveCount(2);
      expect(api.chamadas('GET /posts/10')).toHaveLength(1);
    });
  });

  test.describe('Tempo real (Socket.IO)', () => {
    test('enviar emite mensagem:enviar, limpa o campo e recarrega a conversa', async ({ page, api, socketServer }) => {
      await logarComo(page, ana);
      api.colecao('users', usuarios());
      // O histórico devolve o que o servidor de socket gravou, como o servidor real
      api.on('GET /chat/:id', async () => json(await socketServer.mensagens()));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'bruno');

      const campo = page.getByPlaceholder('Escreva uma mensagem...');
      await campo.fill('  Olá, Bruno!  ');
      await campo.press('Enter');

      await expect(conversa(page).locator('.message.mine')).toHaveText('Olá, Bruno!');
      await expect(campo).toHaveValue('');
      expect(await socketServer.eventos('mensagem:enviar')).toEqual([
        { evento: 'mensagem:enviar', userId: String(ana.id), dados: { paraId: bruno.id, texto: 'Olá, Bruno!' } },
      ]);
    });

    test('mensagem nova da pessoa aberta recarrega a conversa', async ({ page, api, socketServer }) => {
      await logarComo(page, ana);
      api.colecao('users', usuarios());
      const historico: Mensagem[] = [];
      api.on('GET /chat/:id', () => json(historico));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'bruno');
      await expect.poll(() => socketServer.conectados()).toContain(String(ana.id));

      const nova = mensagemSocket(50, bruno.id, ana.id, 'Chegou agora', new Date().toISOString());
      historico.push(nova);
      await socketServer.emitir(ana.id, 'mensagem:nova', nova);

      await expect(conversa(page).locator('.message')).toHaveText(['Chegou agora']);
    });

    test('mensagem de outra pessoa não mexe na conversa aberta', async ({ page, api, socketServer }) => {
      await logarComo(page, ana);
      api.colecao('users', usuarios());
      api.on('GET /chat/:id', json([]));
      await page.goto(rotas.direct);
      await abrirConversaCom(page, 'bruno');
      await expect.poll(() => socketServer.conectados()).toContain(String(ana.id));
      const recargasAntes = api.chamadas('GET /chat/:id').length;

      await socketServer.emitir(ana.id, 'mensagem:nova', mensagemSocket(51, carla.id, ana.id, 'Oi Ana', new Date().toISOString()));
      // Confirma que o evento chegou mandando outro da pessoa aberta logo depois
      await socketServer.emitir(ana.id, 'mensagem:nova', mensagemSocket(52, bruno.id, ana.id, 'Oi', new Date().toISOString()));

      await expect.poll(() => api.chamadas('GET /chat/:id').length).toBe(recargasAntes + 1);
      expect(api.chamadas('GET /chat/:id').every(r => r.caminho === `/chat/${bruno.id}`)).toBe(true);
    });

    test('token inválido é recusado pelo socket', async ({ page, api, socketServer }) => {
      await logarComo(page, ana, gerarToken(ana, { expirado: true }));
      api.colecao('users', usuarios());
      const erroDeConexao = page.waitForEvent('console', m => m.type() === 'error' && m.text().includes('não autorizado'));
      await page.goto(rotas.direct);

      await erroDeConexao;
      expect(await socketServer.conectados()).toEqual([]);
    });
  });

  test('sair limpa a sessão e volta para o login', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('users', usuarios());
    await page.goto(rotas.direct);
    await expect(page.locator('#people-list .person')).toHaveCount(2);

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(naRota(rotas.login));
    expect(await lerStorage(page, 'token')).toBeNull();
  });

  test.describe('Problemas conhecidos (corrigir na migração para Vue)', () => {
    test.fail('direct?user=<id> (vindo do perfil) deveria abrir a conversa', async ({ page, api }) => {
      await logarComo(page, ana);
      api.colecao('users', usuarios());
      api.on('GET /chat/:id', json([]));
      await page.goto(rotas.directCom(bruno.id));
      await expect(page.locator('#chat-header')).toContainText('bruno', { timeout: 2_000 });
    });
  });
});
