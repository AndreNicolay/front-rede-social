// Tela: Perfil

const API_URL = 'http://localhost:3000';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
  window.location.href = '../login/index.html';
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../login/index.html';
});

document.getElementById('avatar').src = user.avatar;
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
