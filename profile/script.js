// Tela: Perfil
import { API_URL } from '../data.js';

const token = localStorage.getItem('token');
const loggedUser = JSON.parse(localStorage.getItem('user') || 'null');
const urlParams = new URLSearchParams(window.location.search);
const profileUserId = urlParams.get('id');

let user = loggedUser;

if (profileUserId && String(profileUserId) !== String(loggedUser?.id)) {
  user = null;
}

const messageBtn = document.getElementById('message-btn');

if (messageBtn) {
  messageBtn.addEventListener('click', () => {
    if (!user || !user.id) return;
    window.location.href = `../direct/index.html?user=${user.id}`;
  });
}

if (!token || !loggedUser) {
  window.location.href = '../login/index.html';
}

async function carregarPerfil() {
  if (profileUserId && String(profileUserId) !== String(loggedUser?.id)) {
    try {
      const resposta = await fetch(`${API_URL}/users/${profileUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resposta.ok) {
        throw new Error('Usuário não encontrado');
      }

      user = await resposta.json();
      document.getElementById('follow-btn').style.display = 'none';
      document.getElementById('message-btn').textContent = 'Mensagem';
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      window.location.href = '../index.html';
      return;
    }
  }

  renderAvatar();
  document.getElementById('username').textContent = '@' + user.username;
  document.getElementById('name').textContent = user.name;

  const meusPostsUrl = `${API_URL}/posts?userId=${user.id}&_sort=createdAt&_order=desc`;
  const resposta = await fetch(meusPostsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const posts = await resposta.json();
  document.getElementById('post-count').textContent = `${posts.length} publicação(ões)`;

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  if (posts.length === 0) {
    grid.innerHTML = '<p class="loading">Este usuário ainda não postou nada.</p>';
    return;
  }

  posts.forEach(post => {
    const img = document.createElement('img');
    img.src = post.imageUrl;
    img.alt = post.caption;
    grid.appendChild(img);
  });
}

const avatar = document.getElementById('avatar');
const avatarTrigger = document.getElementById('avatarTrigger');
const avatarModal = document.getElementById('avatarModal');
const closeAvatarModalBtn = document.getElementById('closeAvatarModalBtn');
const cancelAvatarBtn = document.getElementById('cancelAvatarBtn');
const removeAvatarBtn = document.getElementById('removeAvatarBtn');
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');

function renderAvatar() {
  const imageSrc = user.avatar && user.avatar.trim() ? user.avatar : '';
  avatar.src = imageSrc;
  avatarPreview.src = imageSrc;
}

function openAvatarModal() {
  avatarPreview.src = user.avatar && user.avatar.trim() ? user.avatar : '';
  avatarModal.classList.remove('hidden');
  avatarModal.setAttribute('aria-hidden', 'false');
}

function closeAvatarModal() {
  avatarModal.classList.add('hidden');
  avatarModal.setAttribute('aria-hidden', 'true');
  avatarInput.value = '';
}

async function updateUserAvatar(newAvatar) {
  try {
    const resposta = await fetch(`${API_URL}/users/${loggedUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ avatar: newAvatar })
    });

    if (!resposta.ok) {
      throw new Error('Não foi possível atualizar a foto de perfil.');
    }

    const usuarioAtualizado = await resposta.json().catch(() => null);
    const novoUser = usuarioAtualizado || { ...loggedUser, avatar: newAvatar };

    loggedUser.avatar = novoUser.avatar ?? newAvatar;
    user = loggedUser;
    localStorage.setItem('user', JSON.stringify(loggedUser));

    const respostaPosts = await fetch(`${API_URL}/posts?userId=${loggedUser.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (respostaPosts.ok) {
      const postsUsuario = await respostaPosts.json();

      await Promise.all(postsUsuario.map(async (post) => {
        await fetch(`${API_URL}/posts/${post.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: newAvatar })
        });
      }));
    }

    renderAvatar();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Não foi possível atualizar a foto de perfil.');
  }
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../login/index.html';
});

avatarTrigger.addEventListener('click', openAvatarModal);
closeAvatarModalBtn.addEventListener('click', closeAvatarModal);
cancelAvatarBtn.addEventListener('click', closeAvatarModal);
avatarModal.addEventListener('click', (event) => {
  if (event.target === avatarModal) {
    closeAvatarModal();
  }
});

removeAvatarBtn.addEventListener('click', async () => {
  await updateUserAvatar('');
  closeAvatarModal();
});

avatarInput.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Selecione uma imagem válida.');
    return;
  }

  const reader = new FileReader();

  reader.onload = async () => {
    const imageBase64 = String(reader.result || '');
    await updateUserAvatar(imageBase64);
    closeAvatarModal();
  };

  reader.readAsDataURL(file);
});

carregarPerfil();
