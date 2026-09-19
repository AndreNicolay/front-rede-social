// TELA REDEFINIÇÃO DE SENHA

const API_URL = 'http://localhost:3000';

const form = document.getElementById('redefinicao-form');
const erro = document.getElementById('erro');
const emailInput = document.getElementById('email');
const novaSenhaInput = document.getElementById('nova-senha');

const params = new URLSearchParams(window.location.search);
const emailRecebido = params.get('email') || localStorage.getItem('emailRedefinicao');

if (emailRecebido) {
  emailInput.value = emailRecebido;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.textContent = '';

  const email = emailInput.value.trim();
  const novaSenha = novaSenhaInput.value.trim();

  if (!email || !novaSenha) {
    erro.textContent = 'Preencha o e-mail e a nova senha.';
    return;
  }

  try {
    const buscaUsuario = await fetch(`${API_URL}/users?email=${encodeURIComponent(email)}`);

    if (!buscaUsuario.ok) {
      throw new Error('Não foi possível localizar o usuário.');
    }

    const usuarios = await buscaUsuario.json();
    const usuario = usuarios[0];

    if (!usuario) {
      erro.textContent = 'Usuário não encontrado para este e-mail.';
      return;
    }

    const resposta = await fetch(`${API_URL}/users/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: usuario.id,
        email,
        password: novaSenha
      })
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      throw new Error(dados.message || 'Não foi possível atualizar a senha.');
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('emailRedefinicao');
    localStorage.setItem('countErro', 0);

    window.location.href = '../login/index.html';
  } catch (error) {
    erro.textContent = error.message || 'Erro ao redefinir a senha.';
  }
});
