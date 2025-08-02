// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAdUyhfVnofaTcxlERnuAWt02yyiJQslNo",
  authDomain: "mi-chat-nuevo.firebaseapp.com",
  databaseURL: "https://mi-chat-nuevo-default-rtdb.firebaseio.com",
  projectId: "mi-chat-nuevo",
  storageBucket: "mi-chat-nuevo.firebasestorage.app",
  messagingSenderId: "515953371556",
  appId: "1:515953371556:web:42d679dc708bff411c3931",
  measurementId: "G-KDPCH07QNB"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('messages');

async function sendMessage() {
  const input = document.getElementById('message-input');
  const fileInput = document.getElementById('file-input');

  // Enviar texto
  if (input.value) {
    await messagesRef.push({
      type: 'text',
      content: input.value,
      timestamp: Date.now()
    });
    input.value = '';
  }

  // Enviar archivo (guardado localmente)
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      let messages = JSON.parse(localStorage.getItem('messages') || '[]');
      messages.push({
        type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
        content: e.target.result,
        name: file.name
      });
      localStorage.setItem('messages', JSON.stringify(messages));
      loadLocalFiles();
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }
}

function loadMessages() {
  messagesRef.on('value', (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push(childSnapshot.val());
    });
    const chat = document.getElementById('chat');
    chat.innerHTML = messages.map(msg => {
      if (msg.type === 'text') {
        return `<div class="message">${msg.content}</div>`;
      }
    }).join('');

    // Cargar archivos locales
    loadLocalFiles();
    chat.scrollTop = chat.scrollHeight;
  });
}

function loadLocalFiles() {
  const localMessages = JSON.parse(localStorage.getItem('messages') || '[]');
  const chat = document.getElementById('chat');
  const textMessages = chat.innerHTML;
  chat.innerHTML = textMessages + localMessages.map(msg => {
    if (msg.type === 'image') {
      return `<div class="message"><img src="${msg.content}" alt="${msg.name}"></div>`;
    } else if (msg.type === 'video') {
      return `<div class="message"><video src="${msg.content}" controls></video></div>`;
    } else if (msg.type === 'file') {
      return `<div class="message"><a href="${msg.content}" download="${msg.name}">${msg.name}</a></div>`;
    }
  }).join('');
  chat.scrollTop = chat.scrollHeight;
}

function clearMessages() {
  messagesRef.remove();
  localStorage.removeItem('messages');
  loadMessages();
}

function toggleEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('language').addEventListener('change', (e) => {
  const lang = e.target.value;
  document.getElementById('message-input').placeholder = lang === 'es' ? 'Escribe un mensaje' : 'Напишите сообщение';
});

document.querySelector('emoji-picker').addEventListener('emoji-click', (e) => {
  const input = document.getElementById('message-input');
  input.value += e.detail.unicode;
  document.getElementById('emoji-picker').style.display = 'none';
});

// Cargar mensajes al iniciar
loadMessages();
