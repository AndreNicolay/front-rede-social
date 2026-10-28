<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthCard from '@/components/AuthCard.vue';
import { useSessao } from '@/composables/useSessao';
import { login } from '@/services/recursos';

const MAX_TENTATIVAS = 3;

const router = useRouter();
const sessao = useSessao();

const email = ref('');
const senha = ref('');
const erro = ref('');
const emailParaRedefinir = ref<string | null>(null);

async function entrar() {
  erro.value = '';
  emailParaRedefinir.value = null;

  try {
    sessao.iniciar(await login(email.value, senha.value));
    localStorage.setItem('countErro', '0');
    await router.push('/feed');
  } catch {
    const tentativas = Number(localStorage.getItem('countErro') || 0) + 1;
    localStorage.setItem('countErro', String(tentativas));

    if (tentativas >= MAX_TENTATIVAS) {
      erro.value = 'Muitas tentativas de login. esqueceu sua senha?';
      emailParaRedefinir.value = email.value;
      localStorage.setItem('emailRedefinicao', email.value);
    } else {
      erro.value = 'E-mail ou senha inválidos.';
    }
  }
}
</script>

<template>
  <AuthCard>
    <form @submit.prevent="entrar">
      <input v-model="email" type="email" placeholder="E-mail" required>
      <input v-model="senha" type="password" placeholder="Senha" required>
      <button type="submit" class="btn-primario">Entrar</button>
      <p class="erro">
        {{ erro }}
        <RouterLink v-if="emailParaRedefinir !== null" :to="{ path: '/redefinicao', query: { email: emailParaRedefinir } }">
          Clique aqui para redefinir sua senha.
        </RouterLink>
      </p>
    </form>

    <p class="troca">Não tem conta? <RouterLink to="/register">Cadastre-se</RouterLink></p>
  </AuthCard>
</template>
