async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value;
  if (message) {
    await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text', content: message })
    });
    input.value = '';
    loadMessages();
  }
}

async function loadMessages() {
  const response = await fetch('/messages');
  const messages = await response.json();
  const chat = document.getElementById('chat');
  chat.innerHTML = messages.map(msg => `<div class="message">${msg.content}</div>`).join('');
}

document.getElementById('language').addEventListener('change', (e) => {
  const lang = e.target.value;
  document.getElementById('message-input').placeholder = lang === 'es' ? 'Escribe un mensaje' : 'Напишите сообщение';
});

setInterval(loadMessages, 1000); // Actualiza mensajes cada segundo
