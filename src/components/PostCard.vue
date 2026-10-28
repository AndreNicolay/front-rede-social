<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Post } from '@/types/api';

// usuarioId fica indefinido no instante entre o fim da sessão e a saída da tela
const props = defineProps<{ post: Post; usuarioId?: number; destacado?: boolean }>();
const emit = defineEmits<{
  curtir: [];
  comentar: [texto: string];
  verCurtidas: [];
  compartilhar: [];
}>();

const likes = computed(() => (Array.isArray(props.post.likes) ? props.post.likes : []));
const comentarios = computed(() => (Array.isArray(props.post.comments) ? props.post.comments : []));
const jaCurtiu = computed(() => likes.value.some(id => String(id) === String(props.usuarioId)));
const perfilDoAutor = computed(() => `/profile/${props.post.userId}`);

const novoComentario = ref('');
function enviarComentario() {
  const texto = novoComentario.value.trim();
  if (!texto) return;
  emit('comentar', texto);
  novoComentario.value = '';
}
</script>

<template>
  <article :id="`post-${post.id}`" class="post-card" :class="{ destacado }">
    <div class="post-header">
      <RouterLink :to="perfilDoAutor" tabindex="-1">
        <img :src="post.avatar" class="avatar" alt="">
      </RouterLink>
      <RouterLink :to="perfilDoAutor" class="username-link">{{ post.username }}</RouterLink>
    </div>

    <img :src="post.imageUrl" class="post-image" :alt="`post de ${post.username}`">

    <div class="post-actions">
      <button type="button" class="like-btn" :class="{ liked: jaCurtiu }" @click="emit('curtir')">
        {{ jaCurtiu ? '♥ Descurtir' : '♡ Curtir' }}
      </button>
      <button type="button" class="share-btn" @click="emit('compartilhar')">✈️ Enviar</button>
      <button type="button" class="like-count" @click="emit('verCurtidas')">{{ likes.length }} curtida(s)</button>
    </div>

    <p class="caption">
      <RouterLink :to="perfilDoAutor" class="username-link"><strong>{{ post.username }}</strong></RouterLink>
      {{ post.caption }}
    </p>

    <section class="comments" aria-label="Comentários">
      <div class="comment-list">
        <p v-for="(comentario, i) in comentarios" :key="i">
          <strong>{{ comentario.username }}</strong> {{ comentario.text }}
        </p>
      </div>
      <form class="comment-form" @submit.prevent="enviarComentario">
        <input v-model="novoComentario" name="comment" type="text" maxlength="280" placeholder="Adicione um comentário..." required>
        <button type="submit">Publicar</button>
      </form>
    </section>
  </article>
</template>

<style scoped>
.post-card {
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.post-card.destacado {
  box-shadow: 0 0 0 3px rgba(0, 149, 246, 0.45);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.avatar {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.username-link {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  text-decoration: none;
}

.username-link:hover { text-decoration: underline; }

.post-image {
  width: 100%;
  display: block;
  max-height: 470px;
  object-fit: cover;
}

.post-actions {
  padding: 10px 14px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-actions button {
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  padding: 0;
}

.like-btn.liked { color: #ed4956; font-weight: 600; }

.share-btn { color: #262626; font-weight: 500; }
.share-btn:hover { color: #0095f6; }

.post-actions .like-count {
  font-size: 13px;
  color: #737373;
}

.like-count:hover {
  text-decoration: underline;
  color: #262626;
}

.caption {
  padding: 8px 14px 4px;
  font-size: 14px;
}

.comments { padding: 0 14px 14px; }
.comment-list p { margin: 6px 0; font-size: 13px; }
.comment-form { display: flex; gap: 8px; margin-top: 10px; }

.comment-form input {
  min-width: 0;
  flex: 1;
  border: 0;
  border-top: 1px solid #eee;
  padding: 10px 0 2px;
  outline: none;
  font: inherit;
  font-size: 13px;
}

.comment-form button {
  border: 0;
  background: none;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
}
</style>
