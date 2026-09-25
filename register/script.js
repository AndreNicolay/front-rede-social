// Tela: Cadastro
import { API_URL } from './data.js';

const form = document.getElementById('register-form');
const erro = document.getElementById('erro');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.textContent = '';

  const name = document.getElementById('name').value;
  const username = document.getElementById('username').value;
  let avatar = document.getElementById('avatar').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Se não colocar foto, usa uma padrão
  if (!avatar) {
    avatar = 'https://i.pravatar.cc/150?u=' + username;
  }

  const resposta = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, avatar, email, password })
  });

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => ({}));
    erro.textContent = dados.message || 'Não foi possível cadastrar. Tente outro e-mail.';
    return;
  }

  const dados = await resposta.json();

  // json-server-auth já retorna { accessToken, user } no /register também
  localStorage.setItem('token', dados.accessToken);
  localStorage.setItem('user', JSON.stringify(dados.user));

  window.location.href = '../index.html';
});
