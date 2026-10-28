// Instância única do axios. Toda chamada REST da aplicação passa por aqui.
import axios from 'axios';
import { useSessao } from '@/composables/useSessao';
import router from '@/router';

export const API_URL = import.meta.env.VITE_API_URL ?? 'https://json-server-auth-rede-social-xe91.onrender.com';

export const api = axios.create({ baseURL: API_URL });

// Rotas onde 401 significa "credencial errada", não "sessão expirou"
const ROTAS_DE_AUTH = ['/login', '/register'];

// Envia o token JWT em toda requisição
api.interceptors.request.use(config => {
  const { token } = useSessao();
  if (token.value) config.headers.Authorization = `Bearer ${token.value}`;
  return config;
});

// Token expirado ou inválido: encerra a sessão e volta para o login
api.interceptors.response.use(
  resposta => resposta,
  async erro => {
    const rotaDeAuth = ROTAS_DE_AUTH.includes(erro.config?.url ?? '');
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !rotaDeAuth) {
      useSessao().encerrar();
      await router.push('/login');
    }
    return Promise.reject(erro);
  },
);

/** Mensagem de erro devolvida pela API (`{ message }`), ou o texto padrão. */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (axios.isAxiosError(erro) && typeof erro.response?.data?.message === 'string') {
    return erro.response.data.message;
  }
  return padrao;
}
