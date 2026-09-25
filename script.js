const API_URL = 'http://localhost:3000';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Se não estiver logado, redireciona para o login
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

// Inserir os Modais dinamicamente na página (Curtidas e Compartilhamento)
const modalsHTML = `
<!-- Modal de Curtidas -->
<div id="likesModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Curtidas</h3>
            <button id="closeModalBtn" class="close-btn">&times;</button>
        </div>
        <div id="likesListContainer" class="modal-body">
            <p style="text-align: center; color: #737373;">A carregar...</p>
        </div>
    </div>
</div>

<!-- Modal de Compartilhamento -->
<div id="shareModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Compartilhar publicação</h3>
            <button id="closeShareModalBtn" class="close-btn">&times;</button>
        </div>
        <div id="shareListContainer" class="modal-body">
            <p style="text-align: center; color: #737373;">A carregar contactos...</p>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalsHTML);

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
    feed.innerHTML = '<p class="loading">Ainda não há posts. Seja o primeiro a publicar!</p>';
    return;
  }

  posts.forEach(renderPost);
}

function renderPost(post) {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const jaCurtiu = likes.some(id => String(id) === String(user.id));
  const authorId = post.userId || post.authorId;
  const profileLink = `profile/index.html?id=${authorId}`;

  const card = document.createElement('article');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-header" style="cursor: pointer;" data-user-id="${authorId}">
      <img src="${post.avatar}" class="avatar" alt="${post.username}">
      <a href="${profileLink}" class="username-link" data-user-id="${authorId}">${post.username}</a>
    </div>
    <img src="${post.imageUrl}" class="post-image" alt="post de ${post.username}">
    <div class="post-actions">
      <button class="like-btn ${jaCurtiu ? 'liked' : ''}" data-id="${post.id}">${jaCurtiu ? '♥ Descurtir' : '♡ Curtir'}</button>
      <button class="share-btn" data-post-id="${post.id}">✈️ Enviar</button>
      <span class="like-count" data-post-id="${post.id}">${likes.length} curtida(s)</span>
    </div>
    <p class="caption"><a href="${profileLink}" class="username-link caption-username" data-user-id="${authorId}"><strong>${post.username}</strong></a> ${post.caption}</p>
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

// --- Lógica do Modal de Curtidas ---
const likesModal = document.getElementById('likesModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const likesListContainer = document.getElementById('likesListContainer');

closeModalBtn.addEventListener('click', () => { likesModal.style.display = 'none'; });
likesModal.addEventListener('click', (e) => { if (e.target === likesModal) likesModal.style.display = 'none'; });

async function abrirModalCurtidas(postId) {
  likesModal.style.display = 'flex';
  likesListContainer.innerHTML = '<p style="text-align: center; color: #737373;">A carregar...</p>';

  try {
    const respostaPost = await fetch(`${API_URL}/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
    const post = await respostaPost.json();

    const respostaUsers = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
    const users = await respostaUsers.json();

    likesListContainer.innerHTML = '';
    const likes = Array.isArray(post.likes) ? post.likes : [];
    if (likes.length === 0) {
      likesListContainer.innerHTML = '<p style="text-align: center; color: #737373;">Ainda sem curtidas.</p>';
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

// --- Lógica do Modal de Compartilhamento ---
const shareModal = document.getElementById('shareModal');
const closeShareModalBtn = document.getElementById('closeShareModalBtn');
const shareListContainer = document.getElementById('shareListContainer');
let postIdParaCompartilhar = null;

closeShareModalBtn.addEventListener('click', () => { shareModal.style.display = 'none'; });
shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.style.display = 'none'; });

async function abrirModalCompartilhar(postId) {
  postIdParaCompartilhar = postId;
  shareModal.style.display = 'flex';
  shareListContainer.innerHTML = '<p style="text-align: center; color: #737373;">A carregar contactos...</p>';

  try {
    const respostaUsers = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
    const users = await respostaUsers.json();

    shareListContainer.innerHTML = '';
    const outrosUsuarios = users.filter(u => String(u.id) !== String(user.id));

    if (outrosUsuarios.length === 0) {
      shareListContainer.innerHTML = '<p style="text-align: center; color: #737373;">Nenhum outro utilizador encontrado.</p>';
      return;
    }

    outrosUsuarios.forEach(u => {
      const userItem = document.createElement('div');
      userItem.classList.add('share-user-item');
      userItem.innerHTML = `
        <div class="share-user-info">
          <img src="${u.avatar || 'https://via.placeholder.com/150'}" alt="${u.username}">
          <span>${u.username}</span>
        </div>
        <button class="send-share-btn" data-receiver-id="${u.id}">Enviar</button>
      `;
      shareListContainer.appendChild(userItem);
    });
  } catch (error) {
    console.error("Erro ao carregar contactos:", error);
    shareListContainer.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar contactos.</p>';
  }
}

// Ação de enviar o post estruturado como mini card para o Direct
shareListContainer.addEventListener('click', async (e) => {
  const sendBtn = e.target.closest('.send-share-btn');
  if (!sendBtn || !postIdParaCompartilhar) return;

  const receiverId = sendBtn.dataset.receiverId;

  try {
    const respPost = await fetch(`${API_URL}/posts/${postIdParaCompartilhar}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const postObj = await respPost.json();

    // Mini card com tamanho compacto e imagem tratada (object-fit)
    const mensagemHTML = `
      <div class="shared-post-preview" data-post-id="${postIdParaCompartilhar}" style="border: 1px solid #dbdbdb; border-radius: 8px; overflow: hidden; max-width: 180px; background: #fff; margin: 2px 0; cursor: pointer;" title="Ver publicação">
        <div style="display: flex; align-items: center; padding: 6px 8px; gap: 6px; font-size: 12px; font-weight: 600; color: #262626; border-bottom: 1px solid #efefef;">
          <span>@${postObj.username}</span>
        </div>
        <img src="${postObj.imageUrl}" style="width: 100%; height: 120px; object-fit: cover; display: block;" alt="Post compartilhado">
        <div style="padding: 6px 8px; font-size: 11px; color: #737373; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${postObj.caption || 'Publicação'}
        </div>
      </div>
    `;

    const resposta = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        senderId: user.id,
        receiverId: Number(receiverId),
        text: mensagemHTML,
        createdAt: new Date().toISOString()
      })
    });

    if (resposta.ok) {
      alert('Post partilhado com sucesso no Direct!');
      shareModal.style.display = 'none';
    } else {
      alert('Erro ao enviar a mensagem.');
    }
  } catch (error) {
    console.error("Erro ao enviar post:", error);
  }
});

// --- Eventos unificados no Feed ---
feed.addEventListener('click', async (e) => {
  const profileLink = e.target.closest('.username-link');
  if (profileLink) {
    const profileUserId = profileLink.dataset.userId;
    if (profileUserId) {
      window.location.href = `profile/index.html?id=${profileUserId}`;
      return;
    }
  }

  const postHeader = e.target.closest('.post-header');
  if (postHeader) {
    const profileUserId = postHeader.dataset.userId;
    window.location.href = `profile/index.html?id=${profileUserId}`;
    return;
  }

  const likeCountSpan = e.target.closest('.like-count');
  if (likeCountSpan) {
    const postId = likeCountSpan.dataset.postId;
    abrirModalCurtidas(postId);
    return;
  }

  const shareButton = e.target.closest('.share-btn');
  if (shareButton) {
    const postId = shareButton.dataset.postId;
    abrirModalCompartilhar(postId);
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

// Envio de comentários
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