export const API_URL = "https://json-server-auth-rede-social-xe91.onrender.com";

// chat.js - cliente de chat em tempo real (JS puro)
// Requer, no HTML, ANTES deste arquivo:
//   <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
// (a CDN expõe a função global io)


let socket = null
let conversaAtualId = null // id do usuário com quem está conversando

// Chame depois do login, passando o accessToken devolvido pelo json-server-auth
export function conectarChat(accessToken, meuId) {
  if (socket) socket.disconnect()

  socket = io(API_URL, { auth: { token: accessToken } })

  socket.on('connect', () => console.log('Chat conectado'))

  // Token inválido ou expirado (dura 1h por padrão)
  socket.on('connect_error', (err) => {
    if (err.message === 'não autorizado') {
      localStorage.clear()
      window.location.href = 'login.html' // ajuste para a sua página de login
    }
  })

  // Mensagem recebida (ou enviada por outra aba minha)
  socket.on('mensagem:nova', (msg) => {
    const outroId = msg.userId === meuId ? msg.paraId : msg.userId
    if (outroId === conversaAtualId) {
      adicionarMensagemNaTela(msg, meuId)
    } else {
      // Conversa não está aberta: aqui você pode mostrar um aviso/contador
      console.log('Nova mensagem de', msg.userId)
    }
  })

  socket.on('digitando', ({ deId }) => {
    if (Number(deId) === conversaAtualId) mostrarDigitando()
  })
}

// Abre uma conversa: carrega o histórico via REST
export async function abrirConversa(outroId, accessToken, meuId) {
  conversaAtualId = Number(outroId)
  const lista = document.getElementById('mensagens')
  lista.innerHTML = ''

  const resp = await fetch(`${API_URL}/chat/${outroId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!resp.ok) return console.log('Erro ao carregar histórico')

  const mensagens = await resp.json()
  mensagens.forEach((m) => adicionarMensagemNaTela(m, meuId))
}

// Envia uma mensagem para a conversa aberta
export function enviarMensagem(texto, meuId) {
  if (!texto.trim() || !conversaAtualId) return

  socket.timeout(5000).emit(
    'mensagem:enviar',
    { paraId: conversaAtualId, texto },
    (err, resp) => {
      if (err) return alert('Sem resposta do servidor')
      if (!resp.ok) return alert(resp.erro)
      adicionarMensagemNaTela(resp.mensagem, meuId)
    }
  )
}

// Avisa que está digitando (volatile: não vale reenviar se cair a conexão)
export function avisarDigitando() {
  if (socket && conversaAtualId) {
    socket.volatile.emit('digitando', { paraId: conversaAtualId })
  }
}

// --- Funções de tela ---

function adicionarMensagemNaTela(msg, meuId) {
  const lista = document.getElementById('mensagens')
  const div = document.createElement('div')
  div.className = msg.userId === meuId ? 'msg minha' : 'msg outra'
  div.textContent = msg.texto // textContent evita XSS (não use innerHTML)
  lista.appendChild(div)
  lista.scrollTop = lista.scrollHeight
}

let timerDigitando = null
function mostrarDigitando() {
  const el = document.getElementById('digitando')
  el.textContent = 'digitando...'
  clearTimeout(timerDigitando)
  timerDigitando = setTimeout(() => (el.textContent = ''), 2000)
}