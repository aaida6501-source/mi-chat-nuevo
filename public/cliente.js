// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAdUyhfVnofaTcxlERnuAWtO2yyiJQslNo",
  authDomain: "mi-chat-nuevo.firebaseapp.com",
  databaseURL: "https://mi-chat-nuevo-default-rtdb.firebaseio.com",
  projectId: "mi-chat-nuevo",
  storageBucket: "mi-chat-nuevo.firebasestorage.app",
  messagingSenderId: "515953371556",
  appId: "1:515953371556:web:42d679dc708bff411c3931",
  measurementId: "G-KDPCH07QNB"
};

// Inicializar Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  alert('Error al conectar con Firebase: ' + error.message);
  return;
}

// Inicializar Realtime Database
const database = firebase.database();
const messagesRef = database.ref('messages');

function sendMessage() {
  const input = document.getElementById('message-input');
  console.log('Botón Enviar clickeado');
  if (!input) {
    console.error('Input no encontrado');
    alert('Error: No se encontró el campo de texto');
    return;
  }
  if (!input.value.trim()) {
    console.log('Input vacío');
    alert('Por favor, escribe un mensaje');
    return;
  }
  try {
    console.log('Enviando mensaje:', input.value);
    messagesRef.push({
      type: 'text',
      content: input.value.trim(),
      timestamp: Date.now()
    }).then(() => {
      console.log('Mensaje enviado a Firebase');
      input.value = '';
    }).catch((error) => {
      console.error('Error al enviar mensaje:', error);
      alert('Error al enviar mensaje: ' + error.message);
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    alert('Error al enviar mensaje: ' + error.message);
  }
}

function loadMessages() {
  const chat = document.getElementById('chat');
  if (!chat) {
    console.error('Elemento #chat no encontrado');
    alert('Error: No se encontró el contenedor del chat');
    return;
  }
  messagesRef.limitToLast(50).on('value', (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push(childSnapshot.val());
    });
    chat.innerHTML = messages.map(msg => `<div class="message">${msg.content}</div>`).join('');
    chat.scrollTop = chat.scrollHeight;
    console.log('Mensajes cargados:', messages);
  }, (error) => {
    console.error('Error al cargar mensajes:', error);
    alert('Error al conectar con la base de datos: ' + error.message);
  });
}

// Inicializar carga de mensajes cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando carga de mensajes');
  loadMessages();
});
