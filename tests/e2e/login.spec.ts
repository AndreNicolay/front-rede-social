import { expect, lerStorage, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { ana, posts } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

test.describe('Login', () => {
  async function entrar(page: import('@playwright/test').Page, email: string, senha: string) {
    await page.getByPlaceholder('E-mail').fill(email);
    await page.getByPlaceholder('Senha').fill(senha);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }

  test('com credenciais válidas grava a sessão e vai para o feed', async ({ page, api }) => {
    api.on('POST /login', json({ accessToken: 'token-da-api', user: ana }));
    api.colecao('posts', posts());

    await page.goto(rotas.login);
    await page.evaluate(() => localStorage.setItem('countErro', '2'));
    await entrar(page, 'ana@teste.com', 'senha123');

    await expect(page).toHaveURL(naRota(rotas.feed));
    expect(api.chamadas('POST /login')[0].corpo).toEqual({ email: 'ana@teste.com', password: 'senha123' });
    expect(await lerStorage(page, 'token')).toBe('token-da-api');
    expect(JSON.parse((await lerStorage(page, 'user')) ?? 'null')).toEqual(ana);
    expect(await lerStorage(page, 'countErro')).toBe('0');
  });

  test('com credenciais inválidas mostra erro e conta a tentativa', async ({ page, api }) => {
    api.on('POST /login', json('Incorrect password', 400));

    await page.goto(rotas.login);
    await entrar(page, 'ana@teste.com', 'errada');

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(naRota(rotas.login));
    expect(await lerStorage(page, 'countErro')).toBe('1');
    expect(await lerStorage(page, 'token')).toBeNull();
  });

  test('na 3ª falha oferece o link de redefinição de senha com o e-mail', async ({ page, api }) => {
    const email = 'ana+teste@teste.com';
    api.on('POST /login', json('Incorrect password', 400));

    await page.goto(rotas.login);
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      await entrar(page, email, 'errada');
      await expect.poll(() => lerStorage(page, 'countErro')).toBe(String(tentativa));
    }

    await expect(page.getByText('Muitas tentativas de login. esqueceu sua senha?')).toBeVisible();
    expect(await lerStorage(page, 'emailRedefinicao')).toBe(email);

    await page.getByRole('link', { name: 'Clique aqui para redefinir sua senha.' }).click();
    await expect(page).toHaveURL(naRota(rotas.redefinicao(email)));
  });

  test('tem link para o cadastro', async ({ page }) => {
    await page.goto(rotas.login);
    await page.getByRole('link', { name: 'Cadastre-se' }).click();
    await expect(page).toHaveURL(naRota(rotas.cadastro));
  });
});
