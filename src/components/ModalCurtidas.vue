<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { User } from '@/types/api';
import { buscarPost, listarUsuarios } from '@/services/recursos';
import BaseModal from './BaseModal.vue';

const props = defineProps<{ postId: number }>();
const emit = defineEmits<{ fechar: [] }>();

const estado = ref<'carregando' | 'erro' | 'pronto'>('carregando');
const quemCurtiu = ref<User[]>([]);

onMounted(async () => {
  try {
    const [post, usuarios] = await Promise.all([buscarPost(props.postId), listarUsuarios()]);
    const likes = Array.isArray(post.likes) ? post.likes : [];
    quemCurtiu.value = usuarios.filter(u => likes.some(id => String(id) === String(u.id)));
    estado.value = 'pronto';
  } catch (erro) {
    console.error('Erro ao carregar curtidas:', erro);
    estado.value = 'erro';
  }
});
</script>

<template>
  <BaseModal id="likesModal" titulo="Curtidas" @fechar="emit('fechar')">
    <p v-if="estado === 'carregando'" class="loading">A carregar...</p>
    <p v-else-if="estado === 'erro'" class="loading falha">Erro ao carregar perfis.</p>
    <p v-else-if="quemCurtiu.length === 0" class="loading">Ainda sem curtidas.</p>
    <div v-for="usuario in quemCurtiu" v-else :key="usuario.id" class="like-user-item">
      <img :src="usuario.avatar || 'https://via.placeholder.com/150'" alt="">
      <span>{{ usuario.username }}</span>
    </div>
  </BaseModal>
</template>

<style scoped>
.falha { color: #ed4956; }

.like-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #efefef;
}

.like-user-item img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.like-user-item span {
  font-size: 14px;
  font-weight: 500;
}
</style>
