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

// Inserir o HTML do Modal dinamicamente na página
const modalHTML = `
<div id="likesModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Curtidas</h3>
            <button id="closeModalBtn" class="close-btn">&times;</button>
        </div>
        <div id="likesListContainer" class="modal-body">
            <p style="text-align: center; color: #737373;">Carregando...</p>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

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
      <span class="like-count" data-post-id="${post.id}">${likes.length} curtida(s)</span>
    </div>
    <p class="caption"><strong>${post.username}</strong> ${post.caption}</p>
    <section class="comments" aria-label="Comentários">
      <div class="comment-list">
        ${comments.map(comment => `<p><strong>${comment.username}</strong>${comment.text}</p>`).join('')}
      </div>
      <form class="comment-form" data-id="${post.id}">
        <input name="comment" type="text" maxlength="280" placeholder="Adicione um comentário..." required>
        <button type="submit">Publicar</button>
      </form>
    </section>
  `;
  feed.appendChild(card);
}

// Lógica do Modal de Curtidas
const likesModal = document.getElementById('likesModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const likesListContainer = document.getElementById('likesListContainer');

closeModalBtn.addEventListener('click', () => {
  likesModal.style.display = 'none';
});

likesModal.addEventListener('click', (e) => {
  if (e.target === likesModal) {
    likesModal.style.display = 'none';
  }
});

async function abrirModalCurtidas(postId) {
  likesModal.style.display = 'flex';
  likesListContainer.innerHTML = '<p style="text-align: center; color: #737373;">Carregando...</p>';

  try {
    const respostaPost = await fetch(`${API_URL}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const post = await respostaPost.json();

    const respostaUsers = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await respostaUsers.json();

    likesListContainer.innerHTML = '';

    const likes = Array.isArray(post.likes) ? post.likes : [];
    if (likes.length === 0) {
      likesListContainer.innerHTML = '<p style="text-align: center; color: #737373;">Nenhuma curtida ainda.</p>';
      return;
    }

    const quemCurtiu = users.filter(u => likes.some(likeId => String(likeId) === String(u.id)));

    quemCurtiu.forEach(u => {
      const userItem = document.createElement('div');
      userItem.classList.add('like-user-item');
      userItem.innerHTML = `
        <img src="${u.avatar || 'https://via.placeholder.com/150'}" alt="${u.username}">
        <span>${u.username}</span>
      `;
      likesListContainer.appendChild(userItem);
    });
  } catch (error) {
    console.error("Erro ao carregar curtidas:", error);
    likesListContainer.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar perfis.</p>';
  }
}

// Clique no feed (Curtir ou Clicar na contagem de likes)
feed.addEventListener('click', async (e) => {
  const likeCountSpan = e.target.closest('.like-count');
  if (likeCountSpan) {
    const postId = likeCountSpan.dataset.postId;
    abrirModalCurtidas(postId);
    return;
  }

  const likeButton = e.target.closest('.like-btn');
  if (!likeButton) return;

  const id = likeButton.dataset.id;
  const resposta = await fetch(`${API_URL}/posts/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
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

  const resposta = await fetch(`${API_URL}/posts/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
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