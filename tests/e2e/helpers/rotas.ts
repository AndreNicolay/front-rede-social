// Caminhos das telas (Vue Router). Se as rotas mudarem, só este arquivo muda.

export const rotas = {
  login: '/login',
  cadastro: '/register',
  redefinicao: (email?: string) => (email ? `/redefinicao?email=${encodeURIComponent(email)}` : '/redefinicao'),
  feed: '/feed',
  feedDestacando: (postId: number | string) => `/feed?highlight=${postId}`,
  novoPost: '/posts/new',
  perfil: '/profile',
  perfilDe: (id: number | string) => `/profile/${id}`,
  direct: '/direct',
  directCom: (id: number | string) => `/direct?user=${id}`,
};

/**
 * Para `toHaveURL`: confere o caminho e os parâmetros da query (já decodificados),
 * sem depender de como cada roteador codifica a URL (ex.: `@` vs `%40`).
 */
export function naRota(caminho: string): (url: URL) => boolean {
  const esperado = new URL(caminho, 'http://localhost');
  const query = (url: URL) => JSON.stringify([...url.searchParams].sort());
  return url => url.pathname === esperado.pathname && query(url) === query(esperado);
}
