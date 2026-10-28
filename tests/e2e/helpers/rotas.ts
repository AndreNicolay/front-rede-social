// Caminhos das telas. Na migração para Vue Router, só este arquivo muda
// (ex.: login -> '/login', perfilDe(id) -> `/profile/${id}`).

export const rotas = {
  login: '/login/index.html',
  cadastro: '/register/index.html',
  redefinicao: (email?: string) =>
    email ? `/redefinicao/index.html?email=${encodeURIComponent(email)}` : '/redefinicao/index.html',
  feed: '/index.html',
  feedDestacando: (postId: number | string) => `/index.html?highlight=${postId}`,
  novoPost: '/new-post/index.html',
  perfil: '/profile/index.html',
  perfilDe: (id: number | string) => `/profile/index.html?id=${id}`,
  direct: '/direct/index.html',
  directCom: (id: number | string) => `/direct/index.html?user=${id}`,
};

/** Casa a URL inteira da página com o caminho (e a query) informados, para usar em `toHaveURL`. */
export function naRota(caminho: string): RegExp {
  const escapado = caminho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^https?://[^/]+${escapado}$`);
}
