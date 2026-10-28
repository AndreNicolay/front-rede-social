<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Post, UsuarioLogado } from '@/types/api';
import BaseModal from '@/components/BaseModal.vue';
import NavBar from '@/components/NavBar.vue';
import { useSessao } from '@/composables/useSessao';
import {
  atualizarPost,
  atualizarUsuario,
  buscarUsuario,
  listarPostsDoUsuario,
} from '@/services/recursos';
import { lerComoDataUrl } from '@/utils/arquivo';

const route = useRoute();
const router = useRouter();
const sessao = useSessao();

const idDaRota = computed(() => (route.params.id ? String(route.params.id) : null));
const ehMeuPerfil = computed(() => !idDaRota.value || idDaRota.value === String(sessao.usuario.value?.id));

const perfil = ref<UsuarioLogado | null>(null);
const posts = ref<Post[] | null>(null);
const modalAberto = ref(false);

async function carregarPerfil() {
  perfil.value = null;
  posts.value = null;

  if (ehMeuPerfil.value) {
    perfil.value = sessao.usuario.value;
  } else {
    try {
      perfil.value = await buscarUsuario(idDaRota.value!);
    } catch (erro) {
      console.error('Erro ao carregar perfil do usuário:', erro);
      await router.replace('/feed');
      return;
    }
  }

  if (perfil.value) posts.value = await listarPostsDoUsuario(perfil.value.id);
}

// Recarrega ao navegar entre perfis sem sair da tela (ex.: /profile/2 -> /profile)
watch(idDaRota, carregarPerfil, { immediate: true });

function abrirModal() {
  if (ehMeuPerfil.value) modalAberto.value = true;
}

// Atualiza a foto no usuário e em todos os posts dele (o post guarda uma cópia do avatar)
async function trocarAvatar(novoAvatar: string) {
  const meuId = sessao.usuario.value!.id;
  try {
    const atualizado = await atualizarUsuario(meuId, { avatar: novoAvatar });
    sessao.atualizarUsuario({ avatar: atualizado?.avatar ?? novoAvatar });

    const meusPosts = await listarPostsDoUsuario(meuId, { ordenar: false });
    await Promise.all(meusPosts.map(post => atualizarPost(post.id, { avatar: novoAvatar })));

    perfil.value = sessao.usuario.value;
    modalAberto.value = false;
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível atualizar a foto de perfil.');
  }
}

async function escolherFoto(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const arquivo = input.files?.[0];
  input.value = '';
  if (!arquivo) return;

  if (!arquivo.type.startsWith('image/')) {
    alert('Selecione uma imagem válida.');
    return;
  }
  await trocarAvatar(await lerComoDataUrl(arquivo));
}
</script>

<template>
  <NavBar />

  <main class="profile-main page">
    <section class="profile-header">
      <button type="button" class="avatar-trigger" aria-label="Alterar foto de perfil" @click="abrirModal">
        <img id="avatar" class="avatar-grande" :src="perfil?.avatar || ''" alt="avatar">
      </button>

      <div v-if="perfil">
        <h2>@{{ perfil.username }}</h2>
        <p>{{ perfil.name }}</p>
        <p v-if="posts">{{ posts.length }} publicação(ões)</p>
        <button v-if="ehMeuPerfil" type="button">Seguir</button>
        <button v-else type="button" @click="router.push({ path: '/direct', query: { user: perfil.id } })">Mensagem</button>
      </div>
    </section>

    <div id="grid" class="posts-grid">
      <p v-if="!posts" class="loading">Carregando posts...</p>
      <p v-else-if="posts.length === 0" class="loading">Este usuário ainda não postou nada.</p>
      <img v-for="post in posts" v-else :key="post.id" :src="post.imageUrl" :alt="post.caption">
    </div>
  </main>

  <BaseModal v-if="modalAberto" titulo="Foto de perfil" @fechar="modalAberto = false">
    <div class="avatar-preview-wrap">
      <img class="avatar-preview" :src="sessao.usuario.value?.avatar || ''" alt="Pré-visualização da foto de perfil">
    </div>

    <label for="avatarInput" class="modal-btn upload-btn">Escolher imagem</label>
    <input id="avatarInput" type="file" accept="image/*" hidden @change="escolherFoto">

    <div class="modal-actions">
      <button type="button" class="modal-btn danger-btn" @click="trocarAvatar('')">Remover foto</button>
      <button type="button" class="modal-btn secondary-btn" @click="modalAberto = false">Cancelar</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.profile-main {
  max-width: 600px;
  margin: 24px auto;
  padding: 0 12px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-header button:not(.avatar-trigger) {
  background: none;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 6px 12px;
  margin-right: 8px;
  cursor: pointer;
}

.avatar-trigger {
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-trigger:hover {
  transform: scale(1.02);
  box-shadow: 0 0 0 3px rgba(0, 149, 246, 0.16);
}

.avatar-grande,
.avatar-preview {
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: linear-gradient(135deg, #dfe3eb, #f5f5f5);
}

.avatar-grande {
  width: 90px;
  height: 90px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.posts-grid img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.posts-grid .loading { grid-column: 1 / -1; }

.avatar-preview-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0 18px;
}

.avatar-preview {
  width: 140px;
  height: 140px;
  border: 2px solid #efefef;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.modal-btn {
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.modal-btn:hover { opacity: 0.9; }

.upload-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  background: #0095f6;
  border-color: #0095f6;
  color: #fff;
}

.secondary-btn {
  flex: 1;
  background: #fff;
  color: #262626;
}

.danger-btn {
  flex: 1;
  background: #fff;
  border-color: #ed4956;
  color: #ed4956;
}
</style>
