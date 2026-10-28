import { expect, lerStorage, proximoAlerta, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { logarComo } from './helpers/auth.ts';
import { ana, bruno, carla, criarPost, posts, usuarios } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

const cardDoPost = (page: import('@playwright/test').Page, legenda: string) =>
  page.locator('.post-card', { hasText: legenda });

test.describe('Feed', () => {
  test('sem login redireciona para o login', async ({ page, api }) => {
    api.colecao('posts', posts());
    await page.goto(rotas.feed);
    await expect(page).toHaveURL(naRota(rotas.login));
  });

  test('lista os posts do mais novo para o mais antigo, com token', async ({ page, api }) => {
    const token = await logarComo(page, ana);
    api.colecao('posts', posts());

    await page.goto(rotas.feed);

    await expect(page.locator('.post-card')).toHaveCount(3);
    await expect(page.locator('.post-card .caption')).toContainText(['Trilha no domingo', 'Café da manhã', 'Pôr do sol na praia']);
    const [listagem] = api.chamadas('GET /posts');
    expect(listagem.headers.authorization).toBe(`Bearer ${token}`);
    expect(listagem.query.get('_sort')).toBe('createdAt');
    expect(listagem.query.get('_order')).toBe('desc');

    await expect(cardDoPost(page, 'Pôr do sol na praia').getByText('2 curtida(s)')).toBeVisible();
    await expect(cardDoPost(page, 'Café da manhã').locator('.comment-list')).toContainText('bruno' + 'Que delícia!');
  });

  test('sem posts mostra o convite para publicar', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', []);
    await page.goto(rotas.feed);
    await expect(page.getByText('Ainda não há posts. Seja o primeiro a publicar!')).toBeVisible();
  });

  test('erro da API mostra aviso', async ({ page, api }) => {
    await logarComo(page, ana);
    api.on('GET /posts', json({}, 500));
    await page.goto(rotas.feed);
    await expect(page.getByText('Não foi possível carregar os posts.')).toBeVisible();
  });

  test('curtir e descurtir atualizam os likes do post', async ({ page, api }) => {
    await logarComo(page, ana);
    const lista = api.colecao('posts', posts());
    await page.goto(rotas.feed);

    const card = cardDoPost(page, 'Café da manhã');
    await card.getByRole('button', { name: '♡ Curtir' }).click();
    await expect(card.getByRole('button', { name: '♥ Descurtir' })).toBeVisible();
    await expect(card.getByText('1 curtida(s)')).toBeVisible();
    expect(api.chamadas('PATCH /posts/11')[0].corpo).toEqual({ likes: [ana.id] });

    await card.getByRole('button', { name: '♥ Descurtir' }).click();
    await expect(card.getByRole('button', { name: '♡ Curtir' })).toBeVisible();
    await expect(card.getByText('0 curtida(s)')).toBeVisible();
    expect(api.chamadas('PATCH /posts/11')[1].corpo).toEqual({ likes: [] });
    expect(lista.find(p => p.id === 11)?.likes).toEqual([]);
  });

  test('comentar adiciona o comentário ao post', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    await page.goto(rotas.feed);

    const card = cardDoPost(page, 'Pôr do sol na praia');
    await card.getByPlaceholder('Adicione um comentário...').fill('Lindo demais');
    await card.getByRole('button', { name: 'Publicar' }).click();

    await expect(cardDoPost(page, 'Pôr do sol na praia').locator('.comment-list')).toContainText('anaLindo demais');
    const { comments } = api.chamadas('PATCH /posts/10')[0].corpo;
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({ userId: ana.id, username: 'ana', text: 'Lindo demais' });
  });

  test('o contador de curtidas abre a lista de quem curtiu', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    api.colecao('users', usuarios());
    await page.goto(rotas.feed);

    await cardDoPost(page, 'Pôr do sol na praia').getByText('2 curtida(s)').click();

    const modal = page.locator('#likesModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.like-user-item')).toHaveText(['bruno', 'carla']);
    await modal.getByRole('button', { name: '×' }).click();
    await expect(modal).toBeHidden();
  });

  test.describe('Compartilhar no Direct', () => {
    test('envia a referência do post pelo socket, sem POST /messages', async ({ page, api, socketServer }) => {
      await logarComo(page, ana);
      api.colecao('posts', posts());
      api.colecao('users', usuarios());
      await page.goto(rotas.feed);

      await cardDoPost(page, 'Pôr do sol na praia').getByRole('button', { name: '✈️ Enviar' }).click();
      const modal = page.locator('#shareModal');
      await expect(modal).toBeVisible();
      await expect(modal.locator('.share-user-item')).toHaveText([/bruno/, /carla/]);

      const alerta = proximoAlerta(page);
      await modal.locator('.share-user-item', { hasText: bruno.username }).getByRole('button', { name: 'Enviar' }).click();

      expect(await alerta).toBe('Post partilhado com sucesso no Direct!');
      await expect(modal).toBeHidden();
      expect(await socketServer.eventos('mensagem:enviar')).toEqual([
        { evento: 'mensagem:enviar', userId: String(ana.id), dados: { paraId: bruno.id, texto: '[post:10]' } },
      ]);
      expect(await socketServer.mensagens()).toMatchObject([{ userId: ana.id, paraId: bruno.id, texto: '[post:10]' }]);
      expect(api.chamadas('POST /messages')).toHaveLength(0);
    });

    test('mostra o erro devolvido pelo servidor', async ({ page, api }) => {
      await logarComo(page, ana);
      api.colecao('posts', posts());
      // id 99 não existe no servidor de socket -> ack { ok: false, erro: 'usuário não encontrado' }
      api.colecao('users', [...usuarios(), { id: 99, username: 'fantasma', email: 'f@teste.com' }]);
      await page.goto(rotas.feed);

      await cardDoPost(page, 'Café da manhã').getByRole('button', { name: '✈️ Enviar' }).click();
      const alerta = proximoAlerta(page);
      await page.locator('.share-user-item', { hasText: 'fantasma' }).getByRole('button', { name: 'Enviar' }).click();

      expect(await alerta).toBe('usuário não encontrado');
      await expect(page.locator('#shareModal')).toBeVisible();
    });
  });

  test('clicar no autor abre o perfil dele', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    api.colecao('users', usuarios());
    await page.goto(rotas.feed);

    await cardDoPost(page, 'Trilha no domingo').locator('.post-header').getByRole('link', { name: 'bruno' }).click();

    await expect(page).toHaveURL(naRota(rotas.perfilDe(bruno.id)));
    await expect(page.getByRole('heading', { name: '@bruno' })).toBeVisible();
  });

  test('sair limpa a sessão e volta para o login', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    await page.goto(rotas.feed);
    await expect(page.locator('.post-card')).toHaveCount(3);

    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(naRota(rotas.login));
    expect(await lerStorage(page, 'token')).toBeNull();
    expect(await lerStorage(page, 'user')).toBeNull();
  });

  test.describe('Problemas conhecidos (corrigir na migração para Vue)', () => {
    // test.fail: passa enquanto o problema existe; quando for corrigido, o Playwright avisa para tirar o fail

    test.fail('legenda e comentários não deveriam executar HTML (XSS)', async ({ page, api }) => {
      await logarComo(page, ana);
      api.colecao('posts', [
        criarPost({
          id: 30,
          userId: carla.id,
          username: carla.username,
          caption: '<img src="/nao-existe.png" onerror="window.__xss = true">',
        }),
      ]);
      await page.goto(rotas.feed);
      await expect(page.locator('.post-card')).toHaveCount(1);

      await expect.poll(() => page.evaluate(() => (window as any).__xss ?? false), { timeout: 2_000 }).toBe(false);
      await expect(page.locator('.caption')).toContainText('<img');
    });

    test.fail('sem login não deveria chamar a API', async ({ page, api }) => {
      api.colecao('posts', posts());
      await page.goto(rotas.feed);
      await expect(page).toHaveURL(naRota(rotas.login));
      expect(api.chamadas('GET /posts')).toHaveLength(0);
    });

    test.fail('token expirado (401) deveria mandar para o login', async ({ page, api }) => {
      await logarComo(page, ana);
      api.on('GET /posts', json('jwt expired', 401));
      await page.goto(rotas.feed);
      await expect(page).toHaveURL(naRota(rotas.login), { timeout: 2_000 });
    });
  });
});
