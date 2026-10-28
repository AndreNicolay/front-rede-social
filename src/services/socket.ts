// Conexão Socket.IO única da aplicação (chat em tempo real).
import { io, type Socket } from 'socket.io-client';
import type { EventosCliente, EventosServidor } from '@/types/api';
import { useSessao } from '@/composables/useSessao';
import router from '@/router';
import { API_URL } from './api';

export type SocketApp = Socket<EventosServidor, EventosCliente>;

let socket: SocketApp | null = null;

/** Abre a conexão com o token da sessão (ou devolve a que já está aberta). */
export function conectarSocket(): SocketApp {
  if (socket) return socket;

  const { token } = useSessao();
  socket = io(API_URL, { auth: { token: token.value } });

  socket.on('connect', () => console.log('socket conectado', socket?.id));
  socket.on('disconnect', motivo => console.log('socket caiu:', motivo));
  socket.on('connect_error', async erro => {
    console.error('erro de conexão:', erro.message);
    // O servidor recusa token inválido ou expirado: a sessão acabou
    if (erro.message === 'não autorizado') {
      useSessao().encerrar();
      await router.push('/login');
    }
  });

  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}
