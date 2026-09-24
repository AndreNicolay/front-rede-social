// Tela: Perfil

const API_URL = 'http://localhost:3000';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');


const messageBtn = document.getElementById('message-btn');

if (messageBtn) {
  messageBtn.addEventListener('click', () => {
  
    window.location.href = `../direct/index.html?user=${user.id}`;
  });
}

if (!token || !user) {
  window.location.href = '../login/index.html';
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

function updateUserAvatar(newAvatar) {
  user.avatar = newAvatar;
  localStorage.setItem('user', JSON.stringify(user));
  renderAvatar();
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

removeAvatarBtn.addEventListener('click', () => {
  updateUserAvatar('');
  closeAvatarModal();
});

avatarInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Selecione uma imagem válida.');
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const imageBase64 = String(reader.result || '');
    updateUserAvatar(imageBase64);
    closeAvatarModal();
  };

  reader.readAsDataURL(file);
});

renderAvatar();
document.getElementById('username').textContent = '@' + user.username;
document.getElementById('name').textContent = user.name;

const grid = document.getElementById('grid');

async function carregarMeusPosts() {
  const resposta = await fetch(`${API_URL}/posts?userId=${user.id}&_sort=createdAt&_order=desc`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const posts = await resposta.json();

  document.getElementById('post-count').textContent = `${posts.length} publicação(ões)`;

  grid.innerHTML = '';

  if (posts.length === 0) {
    grid.innerHTML = '<p class="loading">Você ainda não postou nada.</p>';
    return;
  }

  posts.forEach(post => {
    const img = document.createElement('img');
    img.src = post.imageUrl;
    img.alt = post.caption;
    grid.appendChild(img);
  });
}

carregarMeusPosts();
