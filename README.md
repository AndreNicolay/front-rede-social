# Rede Social - Front-End

Interface web desenvolvida para consumir a API de autenticação e posts da rede social, permitindo o fluxo completo de cadastro, login, listagem e criação de publicações.

## Como rodar

```bash
npm install
npm run dev

O projeto roda normalmente em http://localhost:5173

## Principais Telas

| Tela | Rota | O que faz |
| :--- | :--- | :--- |
| **Login** | `/login` | Tela de entrada onde o usuário insere credenciais para autenticação |
| **Cadastro** | `/register` | Permite registrar um novo usuário no sistema |
| **Feed** | `/feed` | Lista os posts da rede social (requer token de acesso ativo) |
| **Criar Post** | `/posts/new` | Formulário para o usuário logado publicar um novo conteúdo |
| **Perfil** | `/profile` | Exibe informações do usuário e os posts específicos publicados por ele |

Configuração de Conexão com a API
Certifique-se de que o servidor backend (json-server-auth-rede-social) está rodando na porta 3000. O front-end consome os endpoints apontando para:

http://localhost:3000

O token de autenticação (accessToken) retornado no login é armazenado e enviado automaticamente nos headers das requisições protegidas.