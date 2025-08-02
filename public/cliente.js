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

try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  alert('Error al conectar con Firebase: ' + error.message);
}

const database = firebase.database();
const storage = firebase.storage();
const messagesRef = database.ref('messages');

async function sendMessage() {
  const input = document.getElementById('message-input');
  const fileInput = document.getElementById('file-input');
  console.log('sendMessage ejecutado. Input:', input ? input.value : 'Input no encontrado');

  if (input && input.value) {
    try {
      console.log('Enviando mensaje:', input.value);
      await messagesRef.push({
        type: 'text',
        content: input.value,
        timestamp: Date.now()
      });
      console.log('Mensaje enviado a Firebase');
      input.value = '';
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert('Error al enviar mensaje: ' + error.message);
    }
  } else {
    console.log('Input vacío o no encontrado');
  }

  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = storage.ref(`files/${fileName}`);
    try {
      console.log('Subiendo archivo:', file.name);
      await storageRef.put(file);
      const fileUrl = await storageRef.getDownloadURL();
      console.log('Archivo subido. URL:', fileUrl);
      await messagesRef.push({
        type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
        content: fileUrl,
        name: file.name,
        timestamp: Date.now()
      });
      fileInput.value = '';
    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert('Error al subir archivo: ' + error.message);
    }
  } else {
    console.log('No se seleccionó ningún archivo');
  }
}

function loadMessages() {
  console.log('loadMessages ejecutado');
  const chat = document.getElementById('chat');
  if (!chat) {
    console.error('Elemento #chat no encontrado');
    alert('Error: No se encontró el contenedor del chat');
    return;
  }
  messagesRef.limitToLast(50).on('value', (snapshot) => {
    console.log('Snapshot recibido:', snapshot.val());
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push(childSnapshot.val());
    });
    console.log('Mensajes procesados:', messages);
    chat.innerHTML = messages.map(msg => {
      if (msg.type === 'text') {
        return `<div class="message">${msg.content}</div>`;
      } else if (msg.type === 'image') {
        return `<div class="message"><img src="${msg.content}" alt="${msg.name}" style="max-width: 200px;"></div>`;
      } else if (msg.type === 'video') {
        return `<div class="message"><video src="${msg.content}" controls style="max-width: 200px;"></video></div>`;
      } else if (msg.type === 'file') {
        return `<div class="message"><a href="${msg.content}" download="${msg.name}">${msg.name}</a></div>`;
      }
    }).join('');
    chat.scrollTop = chat.scrollHeight;
  }, (error) => {
    console.error('Error al cargar mensajes:', error);
    alert('Error al conectar con la base de datos: ' + error.message);
  });
}

function clearMessages() {
  console.log('clearMessages ejecutado');
  messagesRef.remove().catch(error => {
    console.error('Error al limpiar mensajes:', error);
    alert('Error al limpiar mensajes: ' + error.message);
  });
}

function toggleEmojiPicker() {
  console.log('toggleEmojiPicker ejecutado');
  const picker = document.getElementById('emoji-picker');
  if (picker) {
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  } else {
    console.error('Emoji picker no encontrado');
    alert('Error: No se encontró el selector de emojis');
  }
}

document.getElementById('language').addEventListener('change', (e) => {
  console.log('Cambio de idioma:', e.target.value);
  const input = document.getElementById('message-input');
  if (input) {
    input.placeholder = e.target.value === 'es' ? 'Escribe un mensaje' : 'Напишите сообщение';
  } else {
    console.error('Input #message-input no encontrado');
  }
});

document.querySelector('emoji-picker').addEventListener('emoji-click', (e) => {
  console.log('Emoji seleccionado:', e.detail.unicode);
  const input = document.getElementById('message-input');
  if (input) {
    input.value += e.detail.unicode;
    document.getElementById('emoji-picker').style.display = 'none';
  } else {
    console.error('Input #message-input no encontrado');
  }
});

console.log('Inicializando carga de mensajes');
loadMessages();
