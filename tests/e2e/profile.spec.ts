import { expect, lerStorage, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { logarComo } from './helpers/auth.ts';
import { ana, bruno, PNG_1PX, posts, usuarios } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

test.describe('Perfil', () => {
  test('sem login redireciona para o login', async ({ page, api }) => {
    api.colecao('posts', posts());
    await page.goto(rotas.perfil);
    await expect(page).toHaveURL(naRota(rotas.login));
  });

  test('meu perfil mostra meus dados e posts', async ({ page, api }) => {
    const token = await logarComo(page, ana);
    api.colecao('posts', posts());
    await page.goto(rotas.perfil);

    await expect(page.getByRole('heading', { name: '@ana' })).toBeVisible();
    await expect(page.getByText('Ana Souza')).toBeVisible();
    await expect(page.getByText('2 publicação(ões)')).toBeVisible();
    await expect(page.locator('#grid img')).toHaveCount(2);
    await expect(page.locator('#grid img').first()).toHaveAttribute('alt', 'Café da manhã');

    const [busca] = api.chamadas('GET /posts');
    expect(busca.headers.authorization).toBe(`Bearer ${token}`);
    expect(Object.fromEntries(busca.query)).toEqual({ userId: '1', _sort: 'createdAt', _order: 'desc' });
  });

  test('sem posts mostra aviso', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', []);
    await page.goto(rotas.perfil);
    await expect(page.getByText('0 publicação(ões)')).toBeVisible();
    await expect(page.getByText('Este usuário ainda não postou nada.')).toBeVisible();
  });

  test('perfil de outra pessoa busca o usuário e esconde o "Seguir"', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    api.colecao('users', usuarios());
    await page.goto(rotas.perfilDe(bruno.id));

    await expect(page.getByRole('heading', { name: '@bruno' })).toBeVisible();
    await expect(page.getByText('1 publicação(ões)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Seguir' })).toBeHidden();
    expect(api.chamadas(`GET /users/${bruno.id}`)).toHaveLength(1);
  });

  test('perfil inexistente volta para o feed', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    api.colecao('users', usuarios());
    await page.goto(rotas.perfilDe(99));
    await expect(page).toHaveURL(naRota(rotas.feed));
  });

  test('o botão Mensagem abre o direct com a pessoa', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    api.colecao('users', usuarios());
    await page.goto(rotas.perfilDe(bruno.id));
    await expect(page.getByRole('heading', { name: '@bruno' })).toBeVisible();

    await page.getByRole('button', { name: 'Mensagem' }).click();
    await expect(page).toHaveURL(naRota(rotas.directCom(bruno.id)));
  });

  test.describe('Foto de perfil', () => {
    const modal = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Foto de perfil' });

    test('só abre o modal no meu próprio perfil', async ({ page, api }) => {
      await logarComo(page, ana);
      api.colecao('posts', posts());
      api.colecao('users', usuarios());

      await page.goto(rotas.perfilDe(bruno.id));
      await expect(page.getByRole('heading', { name: '@bruno' })).toBeVisible();
      await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
      await expect(modal(page)).toBeHidden();

      await page.goto(rotas.perfil);
      await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
      await expect(modal(page)).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(modal(page)).toBeHidden();
    });

    test('remover a foto atualiza o usuário, os posts dele e a sessão', async ({ page, api }) => {
      await logarComo(page, ana);
      const listaPosts = api.colecao('posts', posts());
      api.colecao('users', usuarios());
      await page.goto(rotas.perfil);
      await expect(page.getByText('2 publicação(ões)')).toBeVisible();

      await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
      await page.getByRole('button', { name: 'Remover foto' }).click();

      await expect(modal(page)).toBeHidden();
      expect(api.chamadas(`PATCH /users/${ana.id}`)[0].corpo).toEqual({ avatar: '' });
      expect(api.chamadas('PATCH /posts/:id').map(r => [r.caminho, r.corpo])).toEqual([
        ['/posts/10', { avatar: '' }],
        ['/posts/11', { avatar: '' }],
      ]);
      expect(listaPosts.filter(p => p.userId === ana.id).map(p => p.avatar)).toEqual(['', '']);
      expect(JSON.parse((await lerStorage(page, 'user')) ?? '{}').avatar).toBe('');
    });

    test('trocar a foto envia a imagem em base64', async ({ page, api }) => {
      await logarComo(page, { ...ana, avatar: '' });
      api.colecao('posts', posts());
      api.colecao('users', usuarios());
      await page.goto(rotas.perfil);
      await expect(page.getByText('2 publicação(ões)')).toBeVisible();

      await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
      await page.locator('#avatarInput').setInputFiles({
        name: 'eu.png',
        mimeType: 'image/png',
        buffer: Buffer.from(PNG_1PX.split(',')[1], 'base64'),
      });

      await expect(modal(page)).toBeHidden();
      expect(api.chamadas(`PATCH /users/${ana.id}`)[0].corpo.avatar).toMatch(/^data:image\/png;base64,/);
      await expect(page.locator('#avatar')).toHaveAttribute('src', /^data:image\/png;base64,/);
    });

    test('erro ao salvar a foto mostra alerta', async ({ page, api }) => {
      await logarComo(page, ana);
      api.colecao('posts', posts());
      api.on('PATCH /users/:id', json({}, 500));
      await page.goto(rotas.perfil);

      const alerta = page.waitForEvent('dialog');
      await page.getByRole('button', { name: 'Alterar foto de perfil' }).click();
      await page.getByRole('button', { name: 'Remover foto' }).click();

      const dialogo = await alerta;
      expect(dialogo.message()).toBe('Não foi possível atualizar a foto de perfil.');
      await dialogo.accept();
      expect(api.chamadas('PATCH /posts/:id')).toHaveLength(0);
    });
  });

  test('sair limpa a sessão e volta para o login', async ({ page, api }) => {
    await logarComo(page, ana);
    api.colecao('posts', posts());
    await page.goto(rotas.perfil);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(naRota(rotas.login));
    expect(await lerStorage(page, 'token')).toBeNull();
  });
});
