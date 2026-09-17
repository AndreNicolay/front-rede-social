const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) window.location.href = '../login/index.html';

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../login/index.html';
});

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

async function carregarUsuarios() {
  const resposta = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) {
    peopleList.innerHTML = '<p class="muted">Não foi possível carregar os usuários.</p>';
    return;
  }

  const usuarios = (await resposta.json()).filter(item => String(item.id) !== String(user.id));
  peopleList.innerHTML = '';
  if (usuarios.length === 0) {
    peopleList.innerHTML = '<p class="muted">Nenhum outro usuário encontrado.</p>';
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

async function carregarMensagens() {
  const resposta = await fetch(`${API_URL}/messages`, { headers: { Authorization: `Bearer ${token}` } });
  if (!resposta.ok) return;
  const mensagens = (await resposta.json()).filter(mensagem =>
    (String(mensagem.senderId) === String(user.id) && String(mensagem.receiverId) === String(selectedUser.id)) ||
    (String(mensagem.senderId) === String(selectedUser.id) && String(mensagem.receiverId) === String(user.id))
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  messagesElement.innerHTML = mensagens.length ? mensagens.map(mensagem => `
    <p class="message ${String(mensagem.senderId) === String(user.id) ? 'mine' : ''}">${escapeHtml(mensagem.text)}</p>
  `).join('') : '<p class="muted">Nenhuma mensagem ainda. Diga oi!</p>';
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

messageForm.addEventListener('submit', async event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !selectedUser) return;

  const resposta = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      senderId: user.id,
      receiverId: selectedUser.id,
      text,
      createdAt: new Date().toISOString()
    })
  });

  if (resposta.ok) {
    messageInput.value = '';
    carregarMensagens();
  }
});

carregarUsuarios();
