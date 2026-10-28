<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { User } from '@/types/api';
import { useSessao } from '@/composables/useSessao';
import { listarUsuarios } from '@/services/recursos';
import { conectarSocket } from '@/services/socket';
import { textoDePostCompartilhado } from '@/utils/postCompartilhado';
import BaseModal from './BaseModal.vue';

const props = defineProps<{ postId: number }>();
const emit = defineEmits<{ fechar: [] }>();

const { usuario } = useSessao();
const estado = ref<'carregando' | 'erro' | 'pronto'>('carregando');
const contatos = ref<User[]>([]);

onMounted(async () => {
  try {
    const usuarios = await listarUsuarios();
    contatos.value = usuarios.filter(u => String(u.id) !== String(usuario.value?.id));
    estado.value = 'pronto';
  } catch (erro) {
    console.error('Erro ao carregar contactos:', erro);
    estado.value = 'erro';
  }
});

// O servidor só grava mensagens pelo socket (POST /messages é bloqueado).
// Vai só a referência do post: o HTML do card com a imagem passaria do limite de 2000 caracteres.
async function enviarPara(destinatario: User) {
  try {
    const resposta = await conectarSocket()
      .timeout(5000)
      .emitWithAck('mensagem:enviar', { paraId: destinatario.id, texto: textoDePostCompartilhado(props.postId) });

    if (resposta.ok) {
      alert('Post partilhado com sucesso no Direct!');
      emit('fechar');
    } else {
      alert(resposta.erro || 'Erro ao enviar a mensagem.');
    }
  } catch (erro) {
    console.error('Erro ao enviar post:', erro);
    alert('Erro ao enviar a mensagem.');
  }
}
</script>

<template>
  <BaseModal id="shareModal" titulo="Compartilhar publicação" @fechar="emit('fechar')">
    <p v-if="estado === 'carregando'" class="loading">A carregar contactos...</p>
    <p v-else-if="estado === 'erro'" class="loading falha">Erro ao carregar contactos.</p>
    <p v-else-if="contatos.length === 0" class="loading">Nenhum outro utilizador encontrado.</p>
    <div v-for="contato in contatos" v-else :key="contato.id" class="share-user-item">
      <div class="share-user-info">
        <img :src="contato.avatar || 'https://via.placeholder.com/150'" alt="">
        <span>{{ contato.username }}</span>
      </div>
      <button type="button" class="send-share-btn" @click="enviarPara(contato)">Enviar</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.falha { color: #ed4956; }

.share-user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #efefef;
}

.share-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.share-user-info img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.share-user-info span {
  font-size: 14px;
  font-weight: 500;
}

.send-share-btn {
  background-color: #0095f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.send-share-btn:hover { background-color: #1877f2; }
</style>
