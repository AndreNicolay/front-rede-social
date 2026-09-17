// Tela: Login

const API_URL = 'http://localhost:3000';

const form = document.getElementById('login-form');
const erro = document.getElementById('erro');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.textContent = '';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const resposta = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!resposta.ok) {
    erro.textContent = 'E-mail ou senha inválidos.';
    return;
  }

  const dados = await resposta.json();

  // json-server-auth devolve { accessToken, user }
  localStorage.setItem('token', dados.accessToken);
  localStorage.setItem('user', JSON.stringify(dados.user));

  window.location.href = '../index.html';
});
