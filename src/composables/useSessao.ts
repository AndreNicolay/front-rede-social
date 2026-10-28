// Sessão do usuário logado (token JWT + dados do usuário), persistida no localStorage.
// O estado fica fora da função para ser o mesmo em todos os componentes.
import { computed, ref } from 'vue';
import type { RespostaAuth, UsuarioLogado } from '@/types/api';
import { desconectarSocket } from '@/services/socket';

function lerUsuario(): UsuarioLogado | null {
  try {
    return JSON.parse(localStorage.getItem('user') ?? 'null');
  } catch {
    return null;
  }
}

const token = ref<string | null>(localStorage.getItem('token'));
const usuario = ref<UsuarioLogado | null>(lerUsuario());

export function useSessao() {
  const logado = computed(() => !!token.value && usuario.value?.id != null);

  function iniciar({ accessToken, user }: RespostaAuth) {
    token.value = accessToken;
    usuario.value = user;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
  }

  function atualizarUsuario(dados: Partial<UsuarioLogado>) {
    if (!usuario.value) return;
    usuario.value = { ...usuario.value, ...dados };
    localStorage.setItem('user', JSON.stringify(usuario.value));
  }

  function encerrar() {
    token.value = null;
    usuario.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    desconectarSocket();
  }

  return { token, usuario, logado, iniciar, atualizarUsuario, encerrar };
}
