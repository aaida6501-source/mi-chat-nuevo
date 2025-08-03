console.log('Cargando cliente.js');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAdUyhfVnofaTcxlERnuAWtO2yyiJQslNo",
  authDomain: "mi-chat-nuevo.firebaseapp.com",
  databaseURL: "https://mi-chat-nuevo-default-rtdb.firebaseio.com",
  projectId: "mi-chat-nuevo",
  storageBucket: "mi-chat-nuevo.firebasestorage.app",
  messagingSenderId: "515953371556",
  appId: "1:515953371556:web:42d679dc708bff411c3931"
};

// Inicializar Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase inicializado correctamente');
} catch (err) {
  console.error('Error al iniciar Firebase:', err);
  alert('Error al iniciar Firebase: ' + err.message);
}

// Inicializar Realtime Database
const db = firebase.database();
const messagesRef = db.ref('messages');
console.log('messagesRef inicializado');

// Enviar mensaje
document.getElementById('chat-form').addEventListener('submit', e => {
  e.preventDefault();
  console.log('Formulario enviado');
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) {
    console.log('Input vacío');
    alert('Escribe algo 😊');
    return;
  }
  console.log('Enviando mensaje:', text);
  messagesRef
    .push({ content: text, timestamp: Date.now() })
    .then(() => {
      console.log('Mensaje enviado a Firebase');
      input.value = '';
    })
    .catch(err => {
      console.error('Error al enviar:', err);
      alert('Error al enviar: ' + err.message);
    });
});

// Escuchar mensajes
messagesRef.limitToLast(50).on('value', snap => {
  console.log('Actualizando mensajes');
  const chat = document.getElementById('chat');
  if (!chat) {
    console.error('Elemento #chat no encontrado');
    alert('Error: No se encontró el contenedor del chat');
    return;
  }
  chat.innerHTML = '';
  snap.forEach(child => {
    const msg = child.val();
    const div = document.createElement('div');
    div.className = 'message';
    div.textContent = msg.content;
    chat.appendChild(div);
  });
  chat.scrollTop = chat.scrollHeight;
  console.log('Mensajes cargados');
}, err => {
  console.error('Error al cargar mensajes:', err);
  alert('Error al cargar mensajes: ' + err.message);
});
