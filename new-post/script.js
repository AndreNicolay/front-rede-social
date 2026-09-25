// Tela: Nova postagem
import { API_URL } from './data.js';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
  window.location.href = '../login/index.html';
}

const form = document.getElementById('post-form');
const inputImagem = document.getElementById('imagem');
const preview = document.getElementById('preview');
const erro = document.getElementById('erro');

let imagemBase64 = '';

// Mostra prévia da imagem escolhida e converte pra base64
inputImagem.addEventListener('change', () => {
  const arquivo = inputImagem.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = () => {
    imagemBase64 = leitor.result;
    preview.src = imagemBase64;
    preview.style.display = 'block';
  };
  leitor.readAsDataURL(arquivo);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.textContent = '';

  if (!imagemBase64) {
    erro.textContent = 'Escolha uma imagem para postar.';
    return;
  }

  const caption = document.getElementById('caption').value;

  const novoPost = {
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    imageUrl: imagemBase64,
    caption,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  const resposta = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(novoPost)
  });

  if (!resposta.ok) {
    erro.textContent = 'Não foi possível publicar. Tente novamente.';
    return;
  }

  window.location.href = '../index.html';
});
