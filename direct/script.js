import { API_URL } from '../data.js';   

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
  window.location.replace('../login/index.html');
  throw new Error('Não autenticado');
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  socket.disconnect();
  window.location.href = '../login/index.html';
});

// ===== SOCKET.IO =====
const socket = io(API_URL, { auth: { token } });

socket.on('connect', () => {
  console.log('socket conectado', socket.id);
  if (selectedUser) carregarMensagens(); // 🆕 ao reconectar, busca as mensagens que chegaram enquanto estava offline
});
socket.on('disconnect', (motivo) => console.log('socket caiu:', motivo));
socket.on('connect_error', (erro) => console.error('erro de conexão:', erro.message));
socket.onAny((evento, ...args) => console.log('evento recebido:', evento, args));


const peopleList = document.getElementById('people-list');
const chatHeader = document.getElementById('chat-header');
const messagesElement = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
let selectedUser = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

// 🆕 Aceita os dois formatos de mensagem:
// antigo (senderId/receiverId/text/createdAt) e novo do socket (userId/paraId/texto/criadaEm)
function normalizarMensagem(m) {
  return {
    ...m,
    de: String(m.userId ?? m.senderId),
    para: String(m.paraId ?? m.receiverId),
    texto: m.texto ?? m.text ?? '',
    data: m.criadaEm ?? m.createdAt
  };
}

async function carregarUsuarios() {
  const resposta = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) {
    peopleList.innerHTML = '<p class="muted">Não foi possível carregar os utilizadores.</p>';
    return;
  }

  const usuarios = (await resposta.json()).filter(item => String(item.id) !== String(user.id));
  peopleList.innerHTML = '';
  if (usuarios.length === 0) {
    peopleList.innerHTML = '<p class="muted">Nenhum outro utilizador encontrado.</p>';
    return;
  }

  usuarios.forEach(usuario => {
    const button = document.createElement('button');
    button.className = 'person';
    button.dataset.id = usuario.id;
    button.innerHTML = `<img src="${escapeHtml(usuario.avatar)}" alt=""><span><strong>${escapeHtml(usuario.username)}</strong><small>${escapeHtml(usuario.name || '')}</small></span>`;
    button.addEventListener('click', () => selecionarUsuario(usuario));
    peopleList.appendChild(button);
  });
}

async function selecionarUsuario(usuario) {
  selectedUser = usuario;
  document.querySelectorAll('.person').forEach(item => item.classList.toggle('selected', item.dataset.id === String(usuario.id)));
  chatHeader.innerHTML = `<img src="${escapeHtml(usuario.avatar)}" alt=""><div><strong>${escapeHtml(usuario.username)}</strong><small>${escapeHtml(usuario.name || '')}</small></div>`;
  messageForm.hidden = false;
  await carregarMensagens();
  messageInput.focus();
}

// ✏️ Agora usa a rota /chat/:outroId do servidor (o GET /messages é bloqueado pela regra 400)
async function carregarMensagens() {
  if (!selectedUser) return;
  const alvo = selectedUser; // evita mostrar a conversa errada se o usuário trocar rápido de contato

  const resposta = await fetch(`${API_URL}/chat/${encodeURIComponent(alvo.id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resposta.ok || alvo !== selectedUser) return;

  const mensagens = (await resposta.json())
    .map(normalizarMensagem)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  messagesElement.innerHTML = mensagens.length ? mensagens.map(mensagem => {
    // Verifica se a mensagem é um post partilhado para não aplicar o escapeHtml e renderizar o card com imagem
    const isSharedPost = mensagem.texto.includes('shared-post-preview');
    const conteudo = isSharedPost ? mensagem.texto : escapeHtml(mensagem.texto);
    
    return `<div class="message ${mensagem.de === String(user.id) ? 'mine' : ''}">${conteudo}</div>`;
  }).join('') : '<p class="muted">Nenhuma mensagem ainda. Diga oi!</p>';
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

// ✏️ Envio pelo socket (o POST /messages é bloqueado pela regra 400)
messageForm.addEventListener('submit', async event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !selectedUser) return;

  try {
    // emitWithAck manda o callback que o servidor exige e espera a resposta
    const resposta = await socket.timeout(5000).emitWithAck('mensagem:enviar', {
      paraId: selectedUser.id,
      texto: text
    });

    if (resposta.ok) {
      messageInput.value = '';
      carregarMensagens();
    } else {
      console.error('erro ao enviar:', resposta.erro);
    }
  } catch {
    console.error('o servidor não respondeu ao envio');
  }
});

// 🆕 Recebe mensagens em tempo real
socket.on('mensagem:nova', (mensagem) => {
  if (!selectedUser) return;
  const outro = String(selectedUser.id);
  if (String(mensagem.userId) === outro || String(mensagem.paraId) === outro) {
    carregarMensagens();
  }
});

carregarUsuarios();

// Adiciona o redirecionamento ao clicar no mini card do post dentro do chat
messagesElement.addEventListener('click', (e) => {
  const sharedPostCard = e.target.closest('.shared-post-preview');
  if (!sharedPostCard) return;

  const postId = sharedPostCard.dataset.postId;
  if (postId) {
    // Redireciona para a página principal/feed (ajusta o caminho se o index.html estiver na raiz)
    window.location.href = `../index.html?highlight=${postId}`;
  }
});
