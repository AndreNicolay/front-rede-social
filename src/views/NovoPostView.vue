<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '@/components/NavBar.vue';
import { useSessao } from '@/composables/useSessao';
import { criarPost } from '@/services/recursos';
import { lerComoDataUrl } from '@/utils/arquivo';

const router = useRouter();
const { usuario } = useSessao();

const imagemBase64 = ref('');
const legenda = ref('');
const erro = ref('');

async function escolherImagem(evento: Event) {
  const arquivo = (evento.target as HTMLInputElement).files?.[0];
  if (arquivo) imagemBase64.value = await lerComoDataUrl(arquivo);
}

async function publicar() {
  erro.value = '';
  if (!imagemBase64.value) {
    erro.value = 'Escolha uma imagem para postar.';
    return;
  }

  try {
    await criarPost({
      userId: usuario.value!.id,
      username: usuario.value!.username,
      avatar: usuario.value!.avatar,
      imageUrl: imagemBase64.value,
      caption: legenda.value,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    });
    await router.push('/feed');
  } catch {
    erro.value = 'Não foi possível publicar. Tente novamente.';
  }
}
</script>

<template>
  <NavBar />

  <main class="form-main page">
    <h2>Nova postagem</h2>
    <form @submit.prevent="publicar">
      <input id="imagem" type="file" accept="image/*" required @change="escolherImagem">
      <img v-show="imagemBase64" id="preview" class="preview" :src="imagemBase64" alt="Prévia da imagem">
      <textarea v-model="legenda" placeholder="Escreva uma legenda..." rows="3" />
      <button type="submit" class="btn-primario">Publicar</button>
      <p class="erro">{{ erro }}</p>
    </form>
  </main>
</template>

<style scoped>
.form-main {
  max-width: 420px;
  margin: 32px auto;
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  padding: 24px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

textarea {
  padding: 10px;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  font-family: inherit;
  resize: vertical;
}

.preview {
  width: 100%;
  border-radius: 6px;
  max-height: 300px;
  object-fit: cover;
}
</style>
