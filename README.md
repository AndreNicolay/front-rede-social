# Rede Social - Front-End

Interface web desenvolvida para consumir a API de autenticação e posts da rede social, permitindo o fluxo completo de cadastro, login, listagem e criação de publicações.

## Como rodar

```bash
npm install
npm run dev
```

O projeto roda normalmente em 'http://localhost:5173'

## Principais Telas

| Tela       | Rota       | O que faz                                                              |
|------------|------------|------------------------------------------------------------------------|
| Login      | /login     | Tela de entrada onde o usuário insere credenciais para autenticação     |
| Cadastro   | /register  | Permite registrar um novo usuário no sistema                          |
| Feed       | /feed      | Lista os posts da rede social (requer token de acesso ativo)          |
| Criar Post | /posts/new | Formulário para o usuário logado publicar um novo conteúdo            |
| Perfil     | /profile   | Exibe informações do usuário e os posts específicos publicados por ele |

Em toda requisição protegida, mandar o header:
Authorization: Bearer SEU_TOKEN_AQUI

## Testes

Testes E2E com [Playwright](https://playwright.dev/), escritos em TypeScript. Eles validam cada tela pelo navegador antes da migração para Vue 3 + axios.

```bash
npm install
npx playwright install chromium   # só na primeira vez
npm test                          # roda todos os testes
npm run test:ui                   # modo visual, para depurar
npm run typecheck                 # checa os tipos
```

- **A API é simulada:** nenhum teste chama o Render. As respostas REST são interceptadas no navegador (`tests/e2e/helpers/api-mock.ts`), então os testes valem tanto com `fetch` quanto com `axios`.
- **Socket.IO:** os testes sobem um servidor de socket local (`tests/e2e/mock-server/socket-server.ts`), que valida o JWT e segue o mesmo contrato do servidor real (`mensagem:enviar`, `mensagem:nova`, `digitando`).
- **`VITE_API_URL`:** troca a URL da API (ver `data.js`). Sem ela, o app usa o Render. Os testes sobem o Vite na porta 5174, apontando para o servidor local.
- **Tipos da API:** ficam em `src/types/api.ts` e serão reaproveitados pelo Vue.
- **Na migração para Vue Router:** só os caminhos em `tests/e2e/helpers/rotas.ts` precisam mudar.
- **Problemas conhecidos:** os testes marcados com `test.fail` registram problemas que ainda existem (XSS no feed, 401 sem tratamento etc.). Quando um deles for corrigido, o Playwright avisa para remover o `test.fail`.
- **CI:** os testes rodam no GitHub Actions a cada push e PR na `main` (`.github/workflows/tests.yml`).
