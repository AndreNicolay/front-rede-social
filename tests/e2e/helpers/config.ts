// Configuração compartilhada entre os testes e o servidor de socket de teste.
// Não importe nada do Playwright aqui: este arquivo também roda direto no Node.

export const PORTA_API = 3333;
export const API_TESTE = `http://localhost:${PORTA_API}`;
/** Porta diferente do `npm run dev` (5173) para os testes nunca usarem o servidor apontado para o Render. */
export const PORTA_FRONT = 5174;

/** Segredo só de teste; o servidor real usa o JWT_SECRET_KEY do json-server-auth. */
export const SEGREDO_JWT = 'segredo-apenas-para-testes';
