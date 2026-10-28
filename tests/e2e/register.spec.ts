import type { Page } from '@playwright/test';
import { expect, lerStorage, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { posts } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

const novoUsuario = { id: 7, name: 'Diego Reis', username: 'diego', email: 'diego@teste.com', avatar: 'https://exemplo.com/diego.png' };

async function preencher(page: Page, { avatar = '' } = {}) {
  await page.getByPlaceholder('Nome completo').fill(novoUsuario.name);
  await page.getByPlaceholder('Nome de usuário').fill(novoUsuario.username);
  await page.getByPlaceholder('Link da foto de perfil (opcional)').fill(avatar);
  await page.getByPlaceholder('E-mail').fill(novoUsuario.email);
  await page.getByPlaceholder('Senha').fill('senha123');
  await page.getByRole('button', { name: 'Cadastrar' }).click();
}

test.describe('Cadastro', () => {
  test('cadastra, grava a sessão e vai para o feed', async ({ page, api }) => {
    api.on('POST /register', json({ accessToken: 'token-novo', user: novoUsuario }, 201));
    api.colecao('posts', posts());

    await page.goto(rotas.cadastro);
    await preencher(page, { avatar: novoUsuario.avatar });

    await expect(page).toHaveURL(naRota(rotas.feed));
    expect(api.chamadas('POST /register')[0].corpo).toEqual({
      name: 'Diego Reis',
      username: 'diego',
      avatar: 'https://exemplo.com/diego.png',
      email: 'diego@teste.com',
      password: 'senha123',
    });
    expect(await lerStorage(page, 'token')).toBe('token-novo');
    expect(JSON.parse((await lerStorage(page, 'user')) ?? 'null')).toEqual(novoUsuario);
  });

  test('sem foto usa o avatar padrão do pravatar', async ({ page, api }) => {
    api.on('POST /register', json({ accessToken: 'token-novo', user: novoUsuario }, 201));
    api.colecao('posts', posts());

    await page.goto(rotas.cadastro);
    await preencher(page);

    await expect(page).toHaveURL(naRota(rotas.feed));
    expect(api.chamadas('POST /register')[0].corpo.avatar).toBe('https://i.pravatar.cc/150?u=diego');
  });

  test('mostra a mensagem de erro do servidor', async ({ page, api }) => {
    api.on('POST /register', json({ message: 'Email already exists' }, 400));

    await page.goto(rotas.cadastro);
    await preencher(page);

    await expect(page.getByText('Email already exists')).toBeVisible();
    await expect(page).toHaveURL(naRota(rotas.cadastro));
    expect(await lerStorage(page, 'token')).toBeNull();
  });

  test('sem mensagem do servidor mostra o erro padrão', async ({ page, api }) => {
    api.on('POST /register', json('Email already exists', 400));

    await page.goto(rotas.cadastro);
    await preencher(page);

    await expect(page.getByText('Não foi possível cadastrar. Tente outro e-mail.')).toBeVisible();
  });

  test('tem link para o login', async ({ page }) => {
    await page.goto(rotas.cadastro);
    await page.getByRole('link', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(naRota(rotas.login));
  });
});
