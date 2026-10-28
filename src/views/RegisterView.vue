<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthCard from '@/components/AuthCard.vue';
import { useSessao } from '@/composables/useSessao';
import { mensagemDeErro } from '@/services/api';
import { cadastrar } from '@/services/recursos';

const router = useRouter();
const sessao = useSessao();

const form = reactive({ name: '', username: '', avatar: '', email: '', password: '' });
const erro = ref('');

async function enviar() {
  erro.value = '';
  // Sem foto, usa uma padrão
  const avatar = form.avatar || `https://i.pravatar.cc/150?u=${form.username}`;

  try {
    sessao.iniciar(await cadastrar({ ...form, avatar }));
    await router.push('/feed');
  } catch (falha) {
    erro.value = mensagemDeErro(falha, 'Não foi possível cadastrar. Tente outro e-mail.');
  }
}
</script>

<template>
  <AuthCard>
    <form @submit.prevent="enviar">
      <input v-model="form.name" type="text" placeholder="Nome completo" required>
      <input v-model="form.username" type="text" placeholder="Nome de usuário" required>
      <input v-model="form.avatar" type="url" placeholder="Link da foto de perfil (opcional)">
      <input v-model="form.email" type="email" placeholder="E-mail" required>
      <input v-model="form.password" type="password" placeholder="Senha" required minlength="5">
      <button type="submit" class="btn-primario">Cadastrar</button>
      <p class="erro">{{ erro }}</p>
    </form>

    <p class="troca">Já tem conta? <RouterLink to="/login">Entrar</RouterLink></p>
  </AuthCard>
</template>
