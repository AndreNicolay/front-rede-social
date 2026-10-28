// Dados fixos dos testes. Funções devolvem cópias novas para um teste não afetar o outro.
// Só importa tipos: este arquivo também é usado pelo servidor de socket (Node puro).
import type { MensagemAntiga, MensagemSocket, Post, User, UsuarioLogado } from '../../../src/types/api.ts';

/** PNG 1x1 transparente, usado como avatar e imagem de post. */
export const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const ana: UsuarioLogado = { id: 1, name: 'Ana Souza', username: 'ana', email: 'ana@teste.com', avatar: PNG_1PX };
export const bruno: UsuarioLogado = { id: 2, name: 'Bruno Lima', username: 'bruno', email: 'bruno@teste.com', avatar: PNG_1PX };
export const carla: UsuarioLogado = { id: 3, name: 'Carla Dias', username: 'carla', email: 'carla@teste.com', avatar: PNG_1PX };

export function usuarios(): User[] {
  return [ana, bruno, carla].map(u => ({ ...u, password: 'hash-qualquer' }));
}

export function criarPost(parcial: Partial<Post> & Pick<Post, 'id'>): Post {
  return {
    userId: ana.id,
    username: ana.username,
    avatar: ana.avatar,
    imageUrl: PNG_1PX,
    caption: `Legenda do post ${parcial.id}`,
    likes: [],
    comments: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    ...parcial,
  };
}

/** Dois posts da Ana e um do Bruno, o do Bruno é o mais recente. */
export function posts(): Post[] {
  return [
    criarPost({ id: 10, caption: 'Pôr do sol na praia', likes: [2, 3], createdAt: '2026-01-01T10:00:00.000Z' }),
    criarPost({
      id: 11,
      caption: 'Café da manhã',
      createdAt: '2026-01-02T10:00:00.000Z',
      comments: [{ userId: 2, username: 'bruno', text: 'Que delícia!', createdAt: '2026-01-02T11:00:00.000Z' }],
    }),
    criarPost({ id: 20, userId: bruno.id, username: bruno.username, caption: 'Trilha no domingo', createdAt: '2026-01-03T10:00:00.000Z' }),
  ];
}

export function mensagemAntiga(id: number, de: number, para: number, text: string, createdAt: string): MensagemAntiga {
  return { id, senderId: de, receiverId: para, text, createdAt };
}

export function mensagemSocket(id: number, de: number, para: number, texto: string, criadaEm: string): MensagemSocket {
  return { id, userId: de, paraId: para, texto, criadaEm };
}
