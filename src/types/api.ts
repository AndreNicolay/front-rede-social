// Tipos da API (json-server + json-server-auth + Socket.IO).
// Espelham o db.json do projeto json-server-auth-rede-social e o contrato do socket em index.js.
// Usados hoje pelos testes e, na migração para Vue 3, pelos serviços axios e componentes.

export type Id = number | string;

export interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  avatar?: string;
  password?: string;
}

/** Usuário como fica salvo no localStorage após login/cadastro (sem senha). */
export type UsuarioLogado = Omit<User, 'password'>;

export interface Comentario {
  userId: Id;
  username: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: number;
  userId: Id;
  username: string;
  avatar?: string;
  imageUrl: string;
  caption: string;
  likes: Id[];
  comments: Comentario[];
  createdAt: string;
}

/** Formato antigo, de quando as mensagens eram gravadas por POST /messages. */
export interface MensagemAntiga {
  id: number;
  senderId: Id;
  receiverId: Id;
  text: string;
  createdAt: string;
}

/** Formato atual, gravado pelo servidor no evento `mensagem:enviar`. */
export interface MensagemSocket {
  id: number;
  userId: number;
  paraId: number;
  texto: string;
  criadaEm: string;
}

/** GET /chat/:outroId pode devolver os dois formatos misturados. */
export type Mensagem = MensagemAntiga | MensagemSocket;

/** Resposta de POST /login e POST /register. */
export interface RespostaAuth {
  accessToken: string;
  user: UsuarioLogado;
}

export type AckEnvio =
  | { ok: true; mensagem: MensagemSocket }
  | { ok: false; erro: string };

/** Eventos que o servidor emite para o cliente. */
export interface EventosServidor {
  'mensagem:nova': (mensagem: MensagemSocket) => void;
  digitando: (dados: { deId: string }) => void;
}

/** Eventos que o cliente emite para o servidor. */
export interface EventosCliente {
  'mensagem:enviar': (dados: { paraId: Id; texto: string }, ack: (resposta: AckEnvio) => void) => void;
  digitando: (dados: { paraId: Id }) => void;
}
