import type { Page } from '@playwright/test';
import jwt from 'jsonwebtoken';
import type { UsuarioLogado } from '../../../src/types/api.ts';
import { SEGREDO_JWT } from './config.ts';

/** Gera um JWT no mesmo formato do json-server-auth (`sub` = id do usuário). */
export function gerarToken(user: UsuarioLogado, { expirado = false } = {}): string {
  const agora = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { email: user.email, exp: expirado ? agora - 60 : agora + 3600 },
    SEGREDO_JWT,
    { subject: String(user.id) },
  );
}

/**
 * Grava a sessão no localStorage antes de qualquer script da página rodar.
 * Só grava na primeira página do teste, para o logout não ser desfeito na navegação seguinte.
 */
export async function logarComo(page: Page, user: UsuarioLogado, token = gerarToken(user)): Promise<string> {
  await page.addInitScript(
    ([t, u]) => {
      if (sessionStorage.getItem('__sessao_teste')) return;
      sessionStorage.setItem('__sessao_teste', '1');
      localStorage.setItem('token', t);
      localStorage.setItem('user', u);
    },
    [token, JSON.stringify(user)] as const,
  );
  return token;
}
