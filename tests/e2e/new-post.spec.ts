import { expect, test } from './fixtures.ts';
import { json } from './helpers/api-mock.ts';
import { logarComo } from './helpers/auth.ts';
import { ana, PNG_1PX, posts } from './helpers/dados.ts';
import { naRota, rotas } from './helpers/rotas.ts';

const arquivoPng = {
  name: 'foto.png',
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_1PX.split(',')[1], 'base64'),
};

test.describe('Nova postagem', () => {
  test('sem login redireciona para o login', async ({ page }) => {
    await page.goto(rotas.novoPost);
    await expect(page).toHaveURL(naRota(rotas.login));
  });

  test('não publica sem imagem', async ({ page, api }) => {
    await logarComo(page, ana);
    await page.goto(rotas.novoPost);
    await page.getByPlaceholder('Escreva uma legenda...').fill('Sem foto');
    await page.getByRole('button', { name: 'Publicar' }).click();

    // O campo de arquivo é obrigatório: o navegador barra o envio
    expect(await page.locator('#imagem').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    expect(api.chamadas('POST /posts')).toHaveLength(0);
  });

  test('mostra a prévia, publica em base64 e volta para o feed', async ({ page, api }) => {
    const token = await logarComo(page, ana);
    const lista = api.colecao('posts', posts());

    await page.goto(rotas.novoPost);
    await page.locator('#imagem').setInputFiles(arquivoPng);
    await expect(page.locator('#preview')).toBeVisible();
    await expect(page.locator('#preview')).toHaveAttribute('src', /^data:image\/png;base64,/);

    await page.getByPlaceholder('Escreva uma legenda...').fill('Meu novo post');
    await page.getByRole('button', { name: 'Publicar' }).click();

    await expect(page).toHaveURL(naRota(rotas.feed));
    const [envio] = api.chamadas('POST /posts');
    expect(envio.headers.authorization).toBe(`Bearer ${token}`);
    expect(envio.corpo).toMatchObject({
      userId: ana.id,
      username: ana.username,
      avatar: ana.avatar,
      imageUrl: expect.stringMatching(/^data:image\/png;base64,/),
      caption: 'Meu novo post',
      likes: [],
      comments: [],
    });
    expect(Date.parse(envio.corpo.createdAt)).not.toBeNaN();
    expect(lista).toHaveLength(4);
    await expect(page.getByText('Meu novo post')).toBeVisible();
  });

  test('erro da API mostra mensagem e continua na tela', async ({ page, api }) => {
    await logarComo(page, ana);
    api.on('POST /posts', json({}, 500));

    await page.goto(rotas.novoPost);
    await page.locator('#imagem').setInputFiles(arquivoPng);
    await expect(page.locator('#preview')).toBeVisible();
    await page.getByRole('button', { name: 'Publicar' }).click();

    await expect(page.getByText('Não foi possível publicar. Tente novamente.')).toBeVisible();
    await expect(page).toHaveURL(naRota(rotas.novoPost));
  });
});
