<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessao } from '@/composables/useSessao';

const route = useRoute();
const router = useRouter();
const sessao = useSessao();

const links = [
  { to: '/feed', texto: 'Início' },
  { to: '/posts/new', texto: 'Nova postagem' },
  { to: '/profile', texto: 'Perfil' },
  { to: '/direct', texto: 'Direct' },
];
// Não mostra o link da tela atual
const linksVisiveis = computed(() => links.filter(link => link.to !== route.path));

async function sair() {
  sessao.encerrar();
  await router.push('/login');
}
</script>

<template>
  <header class="navbar">
    <h1 class="logo">SnapShot</h1>
    <nav>
      <RouterLink v-for="link in linksVisiveis" :key="link.to" :to="link.to">{{ link.texto }}</RouterLink>
      <button type="button" @click="sair">Sair</button>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  background: #fff;
  border-bottom: 1px solid #dbdbdb;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.logo {
  font-size: 22px;
  margin: 0;
}

nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

a {
  text-decoration: none;
  color: #262626;
  font-weight: 500;
}

a:hover { color: #0095f6; }

button {
  background: none;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}

@media (max-width: 650px) {
  .navbar { padding: 12px; }
  nav { gap: 9px; font-size: 13px; }
}
</style>
