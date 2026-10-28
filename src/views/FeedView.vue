<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Post } from '@/types/api';
import ModalCompartilhar from '@/components/ModalCompartilhar.vue';
import ModalCurtidas from '@/components/ModalCurtidas.vue';
import NavBar from '@/components/NavBar.vue';
import PostCard from '@/components/PostCard.vue';
import { useSessao } from '@/composables/useSessao';
import { atualizarPost, buscarPost, listarPosts } from '@/services/recursos';

const route = useRoute();
const { usuario } = useSessao();

const posts = ref<Post[]>([]);
const estado = ref<'carregando' | 'erro' | 'pronto'>('carregando');
const postCurtidas = ref<number | null>(null);
const postCompartilhar = ref<number | null>(null);
// Post vindo de um card compartilhado no Direct (/feed?highlight=<id>)
const destacado = String(route.query.highlight ?? '');

async function carregarPosts() {
  try {
    posts.value = await listarPosts();
    estado.value = 'pronto';
  } catch {
    estado.value = 'erro';
  }
}

// Busca o post atualizado antes de alterar, para não apagar curtidas/comentários de outras pessoas
async function alternarCurtida(post: Post) {
  try {
    const atual = await buscarPost(post.id);
    const likes = Array.isArray(atual.likes) ? [...atual.likes] : [];
    const indice = likes.findIndex(id => String(id) === String(usuario.value?.id));
    if (indice !== -1) likes.splice(indice, 1);
    else likes.push(usuario.value!.id);

    await atualizarPost(post.id, { likes });
    await carregarPosts();
  } catch (erro) {
    console.error('Erro ao curtir:', erro);
  }
}

async function comentar(post: Post, texto: string) {
  try {
    const atual = await buscarPost(post.id);
    const comments = Array.isArray(atual.comments) ? [...atual.comments] : [];
    comments.push({ userId: usuario.value!.id, username: usuario.value!.username, text: texto, createdAt: new Date().toISOString() });

    await atualizarPost(post.id, { comments });
    await carregarPosts();
  } catch (erro) {
    console.error('Erro ao comentar:', erro);
  }
}

onMounted(async () => {
  await carregarPosts();
  if (destacado) {
    await nextTick();
    document.getElementById(`post-${destacado}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
</script>

<template>
  <NavBar />

  <main id="feed" class="feed page">
    <p v-if="estado === 'carregando'" class="loading">Carregando posts...</p>
    <p v-else-if="estado === 'erro'" class="loading">Não foi possível carregar os posts.</p>
    <p v-else-if="posts.length === 0" class="loading">Ainda não há posts. Seja o primeiro a publicar!</p>
    <PostCard
      v-for="post in posts"
      v-else
      :key="post.id"
      :post="post"
      :usuario-id="usuario?.id"
      :destacado="String(post.id) === destacado"
      @curtir="alternarCurtida(post)"
      @comentar="texto => comentar(post, texto)"
      @ver-curtidas="postCurtidas = post.id"
      @compartilhar="postCompartilhar = post.id"
    />
  </main>

  <ModalCurtidas v-if="postCurtidas !== null" :post-id="postCurtidas" @fechar="postCurtidas = null" />
  <ModalCompartilhar v-if="postCompartilhar !== null" :post-id="postCompartilhar" @fechar="postCompartilhar = null" />
</template>

<style scoped>
.feed {
  max-width: 470px;
  margin: 24px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 12px;
}
</style>
