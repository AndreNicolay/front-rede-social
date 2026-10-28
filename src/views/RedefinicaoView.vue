<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthCard from '@/components/AuthCard.vue';
import { useSessao } from '@/composables/useSessao';
import { mensagemDeErro } from '@/services/api';
import { atualizarUsuario, buscarUsuarioPorEmail } from '@/services/recursos';

const route = useRoute();
const router = useRouter();
const sessao = useSessao();

// E-mail vem da tela de login (pela URL ou pelo localStorage)
const email = ref(String(route.query.email || localStorage.getItem('emailRedefinicao') || ''));
const novaSenha = ref('');
const mensagem = ref('');

async function redefinir() {
  mensagem.value = '';
  const senha = novaSenha.value.trim();
  if (!senha) {
    mensagem.value = 'Preencha a nova senha.';
    return;
  }

  let usuario;
  try {
    usuario = await buscarUsuarioPorEmail(email.value.trim());
  } catch {
    mensagem.value = 'Não foi possível localizar o usuário.';
    return;
  }
  if (!usuario) {
    mensagem.value = 'Usuário não encontrado para este e-mail.';
    return;
  }

  try {
    await atualizarUsuario(usuario.id, { id: usuario.id, email: email.value.trim(), password: senha });
  } catch (erro) {
    mensagem.value = mensagemDeErro(erro, 'Não foi possível atualizar a senha.');
    return;
  }

  // Força um novo login com a senha nova
  sessao.encerrar();
  localStorage.removeItem('emailRedefinicao');
  localStorage.setItem('countErro', '0');

  mensagem.value = 'Senha alterada com sucesso! Redirecionando para o login...';
  setTimeout(() => router.push('/login'), 1500);
}
</script>

<template>
  <AuthCard>
    <form @submit.prevent="redefinir">
      <input :value="email" type="email" placeholder="E-mail" required readonly disabled>
      <input v-model="novaSenha" type="password" placeholder="Nova Senha" required>
      <button type="submit" class="btn-primario">Redefinir Senha</button>
      <p class="erro">{{ mensagem }}</p>
    </form>

    <p class="troca"><RouterLink to="/login">Logar</RouterLink></p>
  </AuthCard>
</template>
