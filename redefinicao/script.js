// TELA REDEFINIÇÃO DE SENHA
import { API_URL } from '../data.js';

// Captura os elementos da tela de redefinição para manipular o formulário e mensagens.
const form = document.getElementById('redefinicao-form');
const erro = document.getElementById('erro');
const emailInput = document.getElementById('email');
const novaSenhaInput = document.getElementById('nova-senha');

// Lê o e-mail enviado pela tela de login por query string ou localStorage.
const params = new URLSearchParams(window.location.search);
const emailRecebido = params.get('email') || localStorage.getItem('emailRedefinicao');

// Preenche o campo de e-mail com o valor recebido para evitar que o usuário digite novamente.
if (emailRecebido) {
  emailInput.value = emailRecebido;
}

// Escuta o envio do formulário e executa a troca da senha.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.textContent = '';

  // Obtém os valores digitados e remove espaços extras.
  const email = emailInput.value.trim();
  const novaSenha = novaSenhaInput.value.trim();

  // Valida se os campos obrigatórios foram preenchidos.
  if (!novaSenha) {
    erro.textContent = 'Preencha a nova senha.';
    return;
  }

  try {
    // Busca o usuário pelo e-mail na API para identificar o registro correto.
    const buscaUsuario = await fetch(`${API_URL}/users?email=${email}`);

    // Confirma que a busca do usuário não falhou.
    if (!buscaUsuario.ok) {
      throw new Error('Não foi possível localizar o usuário.');
    }

    // Converte a resposta em JSON e pega o primeiro usuário encontrado.
    const usuarios = await buscaUsuario.json();
    const usuario = usuarios[0];

    // Se não existir usuário com esse e-mail, informa ao usuário.
    if (!usuario) {
      erro.textContent = 'Usuário não encontrado para este e-mail.';
      return;
    }

    // Atualiza o usuário encontrado com o novo e-mail e a nova senha.
    const resposta = await fetch(`${API_URL}/users/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: usuario.id,
        email,
        password: novaSenha
      })
    });

    // Verifica se a atualização foi aceita pela API.
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      throw new Error(dados.message || 'Não foi possível atualizar a senha.');
    }

    // Remove a sessão atual e zera o contador de erros para forçar novo login.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('emailRedefinicao');
    localStorage.setItem('countErro', 0);

    // Exibe sucesso e redireciona para a tela de login após um tempo curto.
    erro.textContent = 'Senha alterada com sucesso! Redirecionando para o login...';
    setTimeout(() => {
      window.location.href = '../login/index.html';
    }, 1500);
  } catch (error) {
    // Mostra a mensagem de erro caso qualquer etapa falhe.
    erro.textContent = error.message || 'Erro ao redefinir a senha.';
  }
});
