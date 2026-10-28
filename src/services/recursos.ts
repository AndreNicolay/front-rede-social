// Chamadas REST da API (json-server + json-server-auth), tipadas.
import type { Mensagem, Post, RespostaAuth, User, UsuarioLogado } from '@/types/api';
import { api } from './api';

// --- Autenticação ---

export async function login(email: string, password: string) {
  return (await api.post<RespostaAuth>('/login', { email, password })).data;
}

export async function cadastrar(dados: Pick<User, 'name' | 'username' | 'avatar' | 'email'> & { password: string }) {
  return (await api.post<RespostaAuth>('/register', dados)).data;
}

// --- Usuários ---

export async function listarUsuarios() {
  return (await api.get<User[]>('/users')).data;
}

export async function buscarUsuario(id: number | string) {
  return (await api.get<User>(`/users/${id}`)).data;
}

export async function buscarUsuarioPorEmail(email: string): Promise<User | undefined> {
  return (await api.get<User[]>('/users', { params: { email } })).data[0];
}

export async function atualizarUsuario(id: number | string, dados: Partial<User>) {
  return (await api.patch<UsuarioLogado>(`/users/${id}`, dados)).data;
}

// --- Posts ---

/** Feed: todos os posts, do mais novo para o mais antigo. */
export async function listarPosts() {
  return (await api.get<Post[]>('/posts', { params: { _sort: 'createdAt', _order: 'desc' } })).data;
}

export async function listarPostsDoUsuario(userId: number | string, { ordenar = true } = {}) {
  const params = ordenar ? { userId, _sort: 'createdAt', _order: 'desc' } : { userId };
  return (await api.get<Post[]>('/posts', { params })).data;
}

export async function buscarPost(id: number | string) {
  return (await api.get<Post>(`/posts/${encodeURIComponent(id)}`)).data;
}

export async function criarPost(post: Omit<Post, 'id'>) {
  return (await api.post<Post>('/posts', post)).data;
}

export async function atualizarPost(id: number | string, dados: Partial<Post>) {
  return (await api.patch<Post>(`/posts/${id}`, dados)).data;
}

// --- Chat ---

/** Histórico da conversa com outro usuário (o GET /messages é bloqueado no servidor). */
export async function buscarConversa(outroId: number | string) {
  return (await api.get<Mensagem[]>(`/chat/${encodeURIComponent(outroId)}`)).data;
}
