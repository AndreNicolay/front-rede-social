// Post compartilhado no Direct: a mensagem traz só "[post:<id>]" e o card é montado buscando o post.
// Mensagens antigas guardavam o HTML do card inteiro; delas só aproveitamos o data-post-id.

export function textoDePostCompartilhado(postId: number | string): string {
  return `[post:${postId}]`;
}

export function idDoPostCompartilhado(texto: string): string | null {
  const atual = texto.trim().match(/^\[post:([\w-]+)\]$/);
  if (atual) return atual[1];
  const antigo = texto.includes('shared-post-preview') && texto.match(/data-post-id="([\w-]+)"/);
  return antigo ? antigo[1] : null;
}
