# SnapShot - Front-End

Interface web da rede social SnapShot: cadastro, login, feed com curtidas e comentários, criação de posts, perfil e chat em tempo real (Direct).

Feito com **Vue 3 + TypeScript**, **Vue Router**, **axios** e **Socket.IO**. Consome a API json-server-auth hospedada no Render.

## Como rodar

```bash
npm install
npm run dev
```

O projeto roda em `http://localhost:5173`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run typecheck` | Checa os tipos (`vue-tsc`) |
| `npm test` | Testes E2E (Playwright) |

## Principais telas

| Tela | Rota | O que faz |
|---|---|---|
| Login | `/login` | Entrada com e-mail e senha; após 3 erros, oferece redefinir a senha |
| Cadastro | `/register` | Registra um novo usuário |
| Redefinição | `/redefinicao` | Troca a senha a partir do e-mail |
| Feed | `/feed` | Lista os posts; curtir, comentar e compartilhar no Direct (`?highlight=<id>` destaca um post) |
| Criar Post | `/posts/new` | Publica uma imagem com legenda |
| Perfil | `/profile` e `/profile/:id` | Seu perfil (com troca de foto) ou o de outra pessoa |
| Direct | `/direct` | Chat em tempo real (`?user=<id>` já abre a conversa) |

Sem login, só login, cadastro e redefinição abrem. As outras telas mandam para `/login`.

## Estrutura

```
src/
  types/api.ts           Tipos da API (User, Post, Mensagem, eventos do socket)
  services/api.ts        Instância do axios: baseURL, token JWT e tratamento de 401
  services/recursos.ts   Chamadas REST tipadas (login, posts, usuários, chat)
  services/socket.ts     Conexão Socket.IO única, autenticada com o token
  composables/useSessao  Sessão (token + usuário), salva no localStorage
  router/                Rotas e proteção das telas que exigem login
  components/            NavBar, BaseModal, PostCard, modais do feed, card de post compartilhado
  views/                 Uma tela por rota
```

- **Autenticação:** o axios coloca `Authorization: Bearer <token>` em toda requisição. Se a API responder **401** (token expirado), a sessão é encerrada e o usuário volta para o login. O socket faz o mesmo quando o servidor recusa o token.
- **Compartilhar post:** o Direct recebe só `[post:<id>]` pelo socket, e o card é montado buscando o post. O servidor bloqueia `POST /messages` e limita a mensagem a 2000 caracteres.

### URL da API

Por padrão, o app usa `https://json-server-auth-rede-social-xe91.onrender.com`. Para apontar para outro servidor (por exemplo, um json-server local), crie um `.env.local`:

```
VITE_API_URL=http://localhost:3000
```

### Publicação

O app usa rotas de verdade (`/feed`, `/profile/2`…). Por isso, o servidor de arquivos estáticos precisa devolver o `index.html` para qualquer caminho. Em um Static Site no Render, adicione a regra **Rewrite** `/*` → `/index.html`. Build command: `npm ci && npm run build`. Publish directory: `dist`.

## Testes

Testes E2E com [Playwright](https://playwright.dev/), escritos em TypeScript.

```bash
npx playwright install chromium   # só na primeira vez
npm test                          # roda todos os testes
npm run test:ui                   # modo visual, para depurar
```

- **A API é simulada:** nenhum teste chama o Render. As respostas REST são interceptadas no navegador (`tests/e2e/helpers/api-mock.ts`).
- **Socket.IO:** os testes sobem um servidor de socket local (`tests/e2e/mock-server/socket-server.ts`), que valida o JWT e segue o mesmo contrato do servidor real (`mensagem:enviar`, `mensagem:nova`, `digitando`).
- **Porta 5174:** os testes sobem o Vite nessa porta, com `VITE_API_URL` apontando para o servidor local, e nunca reaproveitam o seu `npm run dev`.
- **Rotas:** os caminhos das telas ficam em `tests/e2e/helpers/rotas.ts`.
- **Erros na página:** qualquer erro não tratado ou aviso do Vue durante um teste faz o teste falhar.
- **CI:** o GitHub Actions roda typecheck, build e testes a cada push e PR na `main` (`.github/workflows/tests.yml`).
