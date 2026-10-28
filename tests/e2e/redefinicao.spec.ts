import { expect, lerStorage, test } from './fixtures.ts';
import { ana, usuarios } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

test.describe('Redefinição de senha', () => {
  test('preenche o e-mail vindo da URL', async ({ page }) => {
    await page.goto(rotas.redefinicao('ana@teste.com'));
    await expect(page.getByPlaceholder('E-mail')).toHaveValue('ana@teste.com');
    await expect(page.getByPlaceholder('E-mail')).toBeDisabled();
  });

  test('sem e-mail na URL usa o salvo pelo login', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('emailRedefinicao', 'bruno@teste.com'));
    await page.goto(rotas.redefinicao());
    await expect(page.getByPlaceholder('E-mail')).toHaveValue('bruno@teste.com');
  });

  test('senha só com espaços mostra erro sem chamar a API', async ({ page, api }) => {
    await page.goto(rotas.redefinicao('ana@teste.com'));
    await page.getByPlaceholder('Nova Senha').fill('   ');
    await page.getByRole('button', { name: 'Redefinir Senha' }).click();

    await expect(page.getByText('Preencha a nova senha.')).toBeVisible();
    expect(api.requisicoes).toEqual([]);
  });

  test('e-mail sem usuário cadastrado mostra erro', async ({ page, api }) => {
    api.colecao('users', usuarios());

    await page.goto(rotas.redefinicao('ninguem@teste.com'));
    await page.getByPlaceholder('Nova Senha').fill('nova123');
    await page.getByRole('button', { name: 'Redefinir Senha' }).click();

    await expect(page.getByText('Usuário não encontrado para este e-mail.')).toBeVisible();
    expect(api.chamadas('PATCH /users/:id')).toHaveLength(0);
  });

  test('troca a senha, limpa a sessão e volta para o login', async ({ page, api }) => {
    api.colecao('users', usuarios());
    await page.addInitScript(() => {
      if (sessionStorage.getItem('__ja_rodou')) return;
      sessionStorage.setItem('__ja_rodou', '1');
      localStorage.setItem('token', 'token-antigo');
      localStorage.setItem('user', '{}');
      localStorage.setItem('countErro', '3');
      localStorage.setItem('emailRedefinicao', 'ana@teste.com');
    });

    await page.goto(rotas.redefinicao('ana@teste.com'));
    await page.getByPlaceholder('Nova Senha').fill('  nova123  ');
    await page.getByRole('button', { name: 'Redefinir Senha' }).click();

    await expect(page.getByText('Senha alterada com sucesso! Redirecionando para o login...')).toBeVisible();
    expect(api.chamadas('GET /users')[0].query.get('email')).toBe('ana@teste.com');
    expect(api.chamadas(`PATCH /users/${ana.id}`)[0].corpo).toEqual({ id: ana.id, email: 'ana@teste.com', password: 'nova123' });
    expect(await lerStorage(page, 'token')).toBeNull();
    expect(await lerStorage(page, 'user')).toBeNull();
    expect(await lerStorage(page, 'emailRedefinicao')).toBeNull();
    expect(await lerStorage(page, 'countErro')).toBe('0');

    await expect(page).toHaveURL(naRota(rotas.login));
  });

  test('erro da API ao salvar mostra a mensagem', async ({ page, api }) => {
    api.colecao('users', usuarios());
    api.on('PATCH /users/:id', { status: 500, json: { message: 'Falha no servidor' } });

    await page.goto(rotas.redefinicao('ana@teste.com'));
    await page.getByPlaceholder('Nova Senha').fill('nova123');
    await page.getByRole('button', { name: 'Redefinir Senha' }).click();

    await expect(page.getByText('Falha no servidor')).toBeVisible();
    await expect(page).toHaveURL(naRota(rotas.redefinicao('ana@teste.com')));
  });
});
