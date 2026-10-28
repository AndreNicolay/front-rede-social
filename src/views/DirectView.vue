<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Mensagem, MensagemSocket, Post, User } from '@/types/api';
import CardPostCompartilhado from '@/components/CardPostCompartilhado.vue';
import NavBar from '@/components/NavBar.vue';
import { useSessao } from '@/composables/useSessao';
import { buscarConversa, buscarPost, listarUsuarios } from '@/services/recursos';
import { conectarSocket } from '@/services/socket';
import { idDoPostCompartilhado } from '@/utils/postCompartilhado';

interface MensagemNaTela {
  id: number;
  minha: boolean;
  texto: string;
  data: string;
  postId: string | null;
}

const route = useRoute();
const { usuario } = useSessao();
const socket = conectarSocket();

const pessoas = ref<User[] | null>(null);
const erroPessoas = ref(false);
const selecionada = ref<User | null>(null);
const mensagens = ref<MensagemNaTela[] | null>(null);
const postsCompartilhados = ref(new Map<string, Post | null>());
const texto = ref('');
const listaMensagens = ref<HTMLElement | null>(null);
const campoMensagem = ref<HTMLInputElement | null>(null);

// Aceita os dois formatos: antigo (senderId/receiverId/text/createdAt) e do socket (userId/paraId/texto/criadaEm)
function normalizar(m: Mensagem): MensagemNaTela {
  const texto = 'texto' in m ? m.texto : m.text ?? '';
  const de = 'userId' in m ? m.userId : m.senderId;
  return {
    id: m.id,
    minha: String(de) === String(usuario.value?.id),
    texto,
    data: 'criadaEm' in m ? m.criadaEm : m.createdAt,
    postId: idDoPostCompartilhado(texto),
  };
}

// Cada post compartilhado é buscado uma vez só; post apagado vira null ("Publicação indisponível")
const buscasDePost = new Map<string, Promise<Post | null>>();
function carregarPostCompartilhado(postId: string) {
  if (!buscasDePost.has(postId)) {
    buscasDePost.set(postId, buscarPost(postId).catch(() => null));
  }
  return buscasDePost.get(postId)!;
}

async function carregarPessoas() {
  try {
    const todos = await listarUsuarios();
    pessoas.value = todos.filter(p => String(p.id) !== String(usuario.value?.id));
  } catch {
    erroPessoas.value = true;
  }
}

async function carregarMensagens() {
  const alvo = selecionada.value;
  if (!alvo) return;

  let historico: Mensagem[];
  try {
    historico = await buscarConversa(alvo.id);
  } catch {
    return;
  }
  // O usuário pode ter trocado de conversa enquanto carregava
  if (alvo !== selecionada.value) return;

  const lista = historico.map(normalizar).sort((a, b) => Date.parse(a.data) - Date.parse(b.data));
  const ids = [...new Set(lista.map(m => m.postId).filter((id): id is string => !!id))];
  const posts = await Promise.all(ids.map(carregarPostCompartilhado));
  ids.forEach((id, i) => postsCompartilhados.value.set(id, posts[i]));
  if (alvo !== selecionada.value) return;

  mensagens.value = lista;
  await nextTick();
  if (listaMensagens.value) listaMensagens.value.scrollTop = listaMensagens.value.scrollHeight;
}

async function selecionar(pessoa: User) {
  selecionada.value = pessoa;
  mensagens.value = null;
  await carregarMensagens();
  campoMensagem.value?.focus();
}

async function enviar() {
  const conteudo = texto.value.trim();
  if (!conteudo || !selecionada.value) return;

  try {
    const resposta = await socket.timeout(5000).emitWithAck('mensagem:enviar', {
      paraId: selecionada.value.id,
      texto: conteudo,
    });
    if (resposta.ok) {
      texto.value = '';
      await carregarMensagens();
    } else {
      console.error('erro ao enviar:', resposta.erro);
    }
  } catch {
    console.error('o servidor não respondeu ao envio');
  }
}

// Tempo real: recarrega a conversa aberta quando chega mensagem dela
function aoReceberMensagem(mensagem: MensagemSocket) {
  const outro = String(selecionada.value?.id);
  if (String(mensagem.userId) === outro || String(mensagem.paraId) === outro) carregarMensagens();
}
// Ao reconectar, busca o que chegou enquanto estava offline
function aoConectar() {
  carregarMensagens();
}

onMounted(async () => {
  socket.on('mensagem:nova', aoReceberMensagem);
  socket.on('connect', aoConectar);

  await carregarPessoas();
  // Vindo do perfil (/direct?user=<id>): já abre a conversa
  const pedida = pessoas.value?.find(p => String(p.id) === String(route.query.user));
  if (pedida) await selecionar(pedida);
});

onUnmounted(() => {
  socket.off('mensagem:nova', aoReceberMensagem);
  socket.off('connect', aoConectar);
});
</script>

<template>
  <NavBar />

  <main class="direct-main page">
    <aside class="people-panel">
      <h2>Mensagens</h2>
      <div id="people-list" class="people-list">
        <p v-if="erroPessoas" class="muted">Não foi possível carregar os utilizadores.</p>
        <p v-else-if="!pessoas" class="muted">Carregando usuários...</p>
        <p v-else-if="pessoas.length === 0" class="muted">Nenhum outro utilizador encontrado.</p>
        <button
          v-for="pessoa in pessoas"
          v-else
          :key="pessoa.id"
          type="button"
          class="person"
          :class="{ selected: pessoa.id === selecionada?.id }"
          @click="selecionar(pessoa)"
        >
          <img :src="pessoa.avatar" alt="">
          <span><strong>{{ pessoa.username }}</strong><small>{{ pessoa.name }}</small></span>
        </button>
      </div>
    </aside>

    <section class="chat-panel">
      <div id="chat-header" class="chat-header">
        <template v-if="selecionada">
          <img :src="selecionada.avatar" alt="">
          <div><strong>{{ selecionada.username }}</strong><small>{{ selecionada.name }}</small></div>
        </template>
        <p v-else class="muted">Escolha uma conversa para começar</p>
      </div>

      <div id="messages" ref="listaMensagens" class="messages">
        <p v-if="!selecionada" class="muted">Suas conversas aparecerão aqui.</p>
        <template v-else-if="mensagens">
          <p v-if="mensagens.length === 0" class="muted">Nenhuma mensagem ainda. Diga oi!</p>
          <div v-for="mensagem in mensagens" :key="mensagem.id" class="message" :class="{ mine: mensagem.minha }">
            <CardPostCompartilhado
              v-if="mensagem.postId"
              :post-id="mensagem.postId"
              :post="postsCompartilhados.get(mensagem.postId) ?? null"
            />
            <template v-else>{{ mensagem.texto }}</template>
          </div>
        </template>
      </div>

      <form v-if="selecionada" class="message-form" @submit.prevent="enviar">
        <input
          ref="campoMensagem"
          v-model="texto"
          type="text"
          maxlength="500"
          placeholder="Escreva uma mensagem..."
          autocomplete="off"
          required
        >
        <button type="submit">Enviar</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.direct-main {
  width: min(900px, calc(100% - 24px));
  height: min(680px, calc(100vh - 112px));
  min-height: 480px;
  margin: 24px auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #fff;
  border: 1px solid #dfe4ea;
  border-radius: 10px;
  overflow: hidden;
}

.people-panel {
  border-right: 1px solid #e4e8ed;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.people-panel h2 {
  font-size: 20px;
  margin: 0;
  padding: 20px;
  border-bottom: 1px solid #e4e8ed;
  flex-shrink: 0;
}

.people-list {
  overflow-y: auto;
  flex: 1;
  padding: 8px;
}

.person {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 0;
  border-radius: 7px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.person:hover,
.person.selected {
  background: #eef6fc;
}

.person img,
.chat-header img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.person span,
.chat-header div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.person strong,
.chat-header strong {
  font-size: 14px;
}

.person small,
.chat-header small {
  color: #76808c;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 78px;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e8ed;
  flex-shrink: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  max-width: 72%;
  margin: 0;
  padding: 10px 13px;
  border-radius: 14px 14px 14px 3px;
  background: #eef1f4;
  align-self: flex-start;
  overflow-wrap: anywhere;
}

.message.mine {
  color: #fff;
  background: #1683d8;
  border-radius: 14px 14px 3px 14px;
  align-self: flex-end;
}

.message-form {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #e4e8ed;
  flex-shrink: 0;
}

.message-form input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d5dce3;
  border-radius: 20px;
  padding: 10px 14px;
  font: inherit;
  outline-color: #1683d8;
}

.message-form button {
  border: 0;
  border-radius: 6px;
  padding: 0 16px;
  color: #fff;
  background: #1683d8;
  font-weight: 600;
  cursor: pointer;
}

.muted {
  color: #76808c;
  font-size: 14px;
  padding: 0 12px;
}

@media (max-width: 650px) {
  .direct-main {
    height: calc(100vh - 92px);
    margin: 12px;
    width: calc(100% - 24px);
    grid-template-columns: 110px 1fr;
  }

  .people-panel h2 {
    padding: 16px 10px;
    font-size: 16px;
  }

  .person {
    justify-content: center;
    padding: 8px 2px;
  }

  .person span {
    display: none;
  }

  .people-list {
    padding: 6px;
  }
}
</style>
