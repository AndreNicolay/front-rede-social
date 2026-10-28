// Servidor Socket.IO de teste. Reproduz o contrato do servidor real
// (json-server-auth-rede-social/index.js): autenticação por JWT no handshake,
// `mensagem:enviar` com ack, `mensagem:nova` e `digitando` entregues por sala `user:<id>`.
//
// Rotas de controle usadas pelos testes (fixture `socketServer`):
//   GET  /__test/saude      -> servidor no ar
//   POST /__test/reset      -> limpa eventos e mensagens, derruba conexões
//   GET  /__test/eventos    -> o que os clientes emitiram
//   GET  /__test/mensagens  -> mensagens gravadas por `mensagem:enviar`
//   GET  /__test/conectados -> ids dos usuários com socket aberto
//   POST /__test/emitir     -> { paraUserId, evento, dados } emite para a sala do usuário
//
// Rode com: node tests/e2e/mock-server/socket-server.ts (Node 24 executa TypeScript direto)
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import type { EventosCliente, EventosServidor, MensagemSocket } from '../../../src/types/api.ts';
import { PORTA_API, SEGREDO_JWT } from '../helpers/config.ts';
import { usuarios } from '../helpers/dados.ts';

interface DadosSocket {
  userId: string;
}

interface EventoRecebido {
  evento: string;
  userId: string;
  dados: unknown;
}

let eventos: EventoRecebido[] = [];
let mensagens: MensagemSocket[] = [];
let proximoId = 1000;

function idDoToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, SEGREDO_JWT);
    return typeof payload === 'string' || !payload.sub ? null : String(payload.sub);
  } catch {
    return null;
  }
}

function lerCorpo(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', parte => (corpo += parte));
    req.on('end', () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch (erro) {
        reject(erro);
      }
    });
  });
}

function responder(res: http.ServerResponse, status: number, dados: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(dados));
}

const server = http.createServer(async (req, res) => {
  const caminho = new URL(req.url ?? '/', 'http://localhost').pathname;
  const rota = `${req.method} ${caminho}`;

  if (rota === 'GET /__test/saude') return responder(res, 200, { ok: true });
  if (rota === 'GET /__test/eventos') return responder(res, 200, eventos);
  if (rota === 'GET /__test/mensagens') return responder(res, 200, mensagens);
  if (rota === 'GET /__test/conectados') {
    const sockets = await io.fetchSockets();
    return responder(res, 200, sockets.map(s => s.data.userId));
  }
  if (rota === 'POST /__test/reset') {
    eventos = [];
    mensagens = [];
    io.disconnectSockets(true);
    return responder(res, 200, { ok: true });
  }
  if (rota === 'POST /__test/emitir') {
    const { paraUserId, evento, dados } = await lerCorpo(req);
    io.to(`user:${paraUserId}`).emit(evento, dados);
    return responder(res, 200, { ok: true });
  }
  responder(res, 404, { erro: 'rota inexistente no servidor de teste' });
});

const io = new Server<EventosCliente, EventosServidor, Record<string, never>, DadosSocket>(server, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  const id = idDoToken(socket.handshake.auth.token);
  if (!id) return next(new Error('não autorizado'));
  socket.data.userId = id;
  next();
});

io.on('connection', socket => {
  const meuId = socket.data.userId;
  socket.join(`user:${meuId}`);

  socket.on('mensagem:enviar', (dados, ack) => {
    eventos.push({ evento: 'mensagem:enviar', userId: meuId, dados });
    if (typeof ack !== 'function') return;

    const { paraId, texto } = dados ?? {};
    if (!paraId || typeof texto !== 'string' || !texto.trim() || texto.length > 2000) {
      return ack({ ok: false, erro: 'mensagem inválida' });
    }
    if (!usuarios().some(u => u.id === Number(paraId))) {
      return ack({ ok: false, erro: 'usuário não encontrado' });
    }
    if (String(paraId) === meuId) {
      return ack({ ok: false, erro: 'não é possível enviar para você mesmo' });
    }

    const mensagem: MensagemSocket = {
      id: proximoId++,
      userId: Number(meuId),
      paraId: Number(paraId),
      texto: texto.trim(),
      criadaEm: new Date().toISOString(),
    };
    mensagens.push(mensagem);

    io.to(`user:${paraId}`).emit('mensagem:nova', mensagem);
    socket.to(`user:${meuId}`).emit('mensagem:nova', mensagem);
    ack({ ok: true, mensagem });
  });

  socket.on('digitando', dados => {
    eventos.push({ evento: 'digitando', userId: meuId, dados });
    if (!dados?.paraId) return;
    io.to(`user:${dados.paraId}`).emit('digitando', { deId: meuId });
  });
});

server.listen(PORTA_API, () => {
  console.log(`Servidor de socket de teste em http://localhost:${PORTA_API}`);
});
