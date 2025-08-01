async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value;
  if (message) {
    let messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.push({ type: 'text', content: message });
    localStorage.setItem('messages', JSON.stringify(messages));
    input.value = '';
    loadMessages();
  }
}

async function loadMessages() {
  const messages = JSON.parse(localStorage.getItem('messages') || '[]');
  const chat = document.getElementById('chat');
  chat.innerHTML = messages.map(msg => `<div class="message">${msg.content}</div>`).join('');
}

document.getElementById('language').addEventListener('change', (e) => {
  const lang = e.target.value;
  document.getElementById('message-input').placeholder = lang === 'es' ? 'Escribe un mensaje' : 'Напишите сообщение';
});

setInterval(loadMessages, 1000);
