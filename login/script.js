// Tela: Login

const API_URL = 'https://json-server-auth-rede-social.onrender.com';

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
    let countErro = localStorage.getItem('countErro') || 0;
    countErro++;
    localStorage.setItem('countErro', countErro);
    if (countErro >= 3) {
      erro.textContent = 'Muitas tentativas de login. esqueceu sua senha?';
      const redefinicaoLink = document.createElement('a');
      const emailParaRedefinicao = encodeURIComponent(email);
      redefinicaoLink.href = `../redefinicao/index.html?email=${emailParaRedefinicao}`;
      localStorage.setItem('emailRedefinicao', email);
      redefinicaoLink.textContent = 'Clique aqui para redefinir sua senha.';
      erro.appendChild(redefinicaoLink);
      return;
    }
    return;
  }
   localStorage.setItem('countErro', 0);
  const dados = await resposta.json();

  // json-server-auth devolve { accessToken, user }
  localStorage.setItem('token', dados.accessToken);
  localStorage.setItem('user', JSON.stringify(dados.user));

  window.location.href = '../index.html';
});
