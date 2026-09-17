// Tela: Início (feed)

const API_URL = 'http://localhost:3000';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Se não tiver logado, manda pro login
if (!token || !user) {
  window.location.href = 'login/index.html';
}

const feed = document.getElementById('feed');
const logoutBtn = document.getElementById('logout-btn');

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login/index.html';
});

async function carregarPosts() {
  const resposta = await fetch(`${API_URL}/posts?_sort=createdAt&_order=desc`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!resposta.ok) {
    feed.innerHTML = '<p class="loading">Não foi possível carregar os posts.</p>';
    return;
  }

  const posts = await resposta.json();
  feed.innerHTML = '';

  if (posts.length === 0) {
    feed.innerHTML = '<p class="loading">Nenhum post ainda. Seja o primeiro a postar!</p>';
    return;
  }

  posts.forEach(renderPost);
}

function renderPost(post) {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const jaCurtiu = likes.some(id => String(id) === String(user.id));

  const card = document.createElement('article');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-header">
      <img src="${post.avatar}" class="avatar" alt="${post.username}">
      <span class="username">${post.username}</span>
    </div>
    <img src="${post.imageUrl}" class="post-image" alt="post de ${post.username}">
    <div class="post-actions">
      <button class="like-btn ${jaCurtiu ? 'liked' : ''}" data-id="${post.id}">${jaCurtiu ? '♥ Descurtir' : '♡ Curtir'}</button>
      <span class="like-count">${likes.length} curtida(s)</span>
    </div>
    <p class="caption"><strong>${post.username}</strong> ${post.caption}</p>
    <section class="comments" aria-label="Comentários">
      <div class="comment-list">
        ${comments.map(comment => `<p><strong>${comment.username}</strong> ${comment.text}</p>`).join('')}
      </div>
      <form class="comment-form" data-id="${post.id}">
        <input name="comment" type="text" maxlength="280" placeholder="Adicione um comentário..." required>
        <button type="submit">Publicar</button>
      </form>
    </section>
  `;
  feed.appendChild(card);
}

// Curtir / descurtir
feed.addEventListener('click', async (e) => {
  const likeButton = e.target.closest('.like-btn');
  if (!likeButton) return;

  const id = likeButton.dataset.id;
  const resposta = await fetch(`${API_URL}/posts/${id}`);
  const post = await resposta.json();

  let likes = Array.isArray(post.likes) ? post.likes : [];
  const userIndex = likes.findIndex(uid => String(uid) === String(user.id));
  if (userIndex !== -1) {
    likes.splice(userIndex, 1);
  } else {
    likes.push(user.id);
  }

  const atualizacao = await fetch(`${API_URL}/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ likes })
  });

  if (atualizacao.ok) carregarPosts();
});

feed.addEventListener('submit', async (e) => {
  if (!e.target.classList.contains('comment-form')) return;
  e.preventDefault();

  const form = e.target;
  const id = form.dataset.id;
  const input = form.elements.comment;
  const text = input.value.trim();
  if (!text) return;

  const resposta = await fetch(`${API_URL}/posts/${id}`);
  if (!resposta.ok) return;
  const post = await resposta.json();
  const comments = Array.isArray(post.comments) ? post.comments : [];
  comments.push({ userId: user.id, username: user.username, text, createdAt: new Date().toISOString() });

  const atualizacao = await fetch(`${API_URL}/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ comments })
  });

  if (atualizacao.ok) carregarPosts();
});

carregarPosts();
