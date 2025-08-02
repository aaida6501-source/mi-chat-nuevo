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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('messages');

async function sendMessage() {
  const input = document.getElementById('message-input');
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
    alert('Por favor, escribe un mensaje');
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
  }, (error) => {
    console.error('Error al cargar mensajes:', error);
    alert('Error al conectar con la base de datos: ' + error.message);
  });
}

console.log('Inicializando carga de mensajes');
loadMessages();
