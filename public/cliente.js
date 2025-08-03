console.log('🚀 Iniciando Chat Ultra Épico...');

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

// Variables globales
let database;
let messagesRef;
let isConnected = false;

// Función para mostrar estado
function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    console.log(`📊 Estado: ${message}`);
  }
}

// Función para inicializar Firebase
function initializeFirebase() {
  try {
    console.log('🔥 Inicializando Firebase...');
    
    // Verificar si Firebase ya está inicializado
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado correctamente');
    } else {
      console.log('✅ Firebase ya estaba inicializado');
    }
    
    // Inicializar Database
    database = firebase.database();
    messagesRef = database.ref('messages');
    
    // Verificar conexión
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        console.log('🌐 Conectado a Firebase');
        isConnected = true;
        showStatus('Conectado y listo para chatear! 🎉', 'success');
      } else {
        console.log('❌ Desconectado de Firebase');
        isConnected = false;
        showStatus('Sin conexión - Reintentando...', 'error');
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    showStatus(`Error de conexión: ${error.message}`, 'error');
    return false;
  }
}

// Función para enviar mensaje
function sendMessage() {
  console.log('📤 Función sendMessage ejecutada');
  
  const input = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  if (!input) {
    console.error('❌ Input no encontrado');
    showStatus('Error: Campo de texto no encontrado', 'error');
    return;
  }
  
  const message = input.value.trim();
  if (!message) {
    console.log('⚠️ Mensaje vacío');
    showStatus('Por favor, escribe un mensaje', 'error');
    input.focus();
    return;
  }
  
  if (!isConnected || !messagesRef) {
    console.error('❌ No hay conexión a Firebase');
    showStatus('Sin conexión - Reintentando...', 'error');
    return;
  }
  
  // Deshabilitar botón temporalmente
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Enviando...';
  }
  
  console.log('📝 Enviando mensaje:', message);
  showStatus('Enviando mensaje...', 'info');
  
  const messageData = {
    type: 'text',
    content: message,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    id: Date.now() + Math.random().toString(36).substr(2, 9)
  };
  
  messagesRef.push(messageData)
    .then(() => {
      console.log('✅ Mensaje enviado correctamente');
      input.value = '';
      showStatus('Mensaje enviado! 🎉', 'success');
      
      // Limpiar estado después de 2 segundos
      setTimeout(() => {
        showStatus('Conectado y listo para chatear! 🎉', 'success');
      }, 2000);
    })
    .catch((error) => {
      console.error('❌ Error al enviar mensaje:', error);
      showStatus(`Error al enviar: ${error.message}`, 'error');
    })
    .finally(() => {
      // Reabilitar botón
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = 'Enviar 🚀';
      }
      input.focus();
    });
}

// Función para cargar mensajes
function loadMessages() {
  console.log('📥 Iniciando carga de mensajes...');
  
  const chat = document.getElementById('chat');
  if (!chat) {
    console.error('❌ Elemento #chat no encontrado');
    showStatus('Error: Contenedor del chat no encontrado', 'error');
    return;
  }
  
  if (!messagesRef) {
    console.error('❌ messagesRef no inicializado');
    showStatus('Error: Base de datos no inicializada', 'error');
    return;
  }
  
  // Escuchar mensajes en tiempo real
  messagesRef.limitToLast(50).on('value', (snapshot) => {
    try {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const messageData = childSnapshot.val();
        if (messageData && messageData.content) {
          messages.push(messageData);
        }
      });
      
      // Ordenar por timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      // Mostrar mensajes
      if (messages.length === 0) {
        chat.innerHTML = '<div class="message">¡Sé el primero en escribir un mensaje épico! 🚀</div>';
      } else {
        chat.innerHTML = messages.map(msg => {
          const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
          return `<div class="message">
            <strong>${timestamp}</strong><br>
            ${escapeHtml(msg.content)}
          </div>`;
        }).join('');
      }
      
      // Scroll al final
      chat.scrollTop = chat.scrollHeight;
      
      console.log(`📋 ${messages.length} mensajes cargados`);
    } catch (error) {
      console.error('❌ Error al procesar mensajes:', error);
      showStatus('Error al cargar mensajes', 'error');
    }
  }, (error) => {
    console.error('❌ Error al escuchar mensajes:', error);
    showStatus(`Error de conexión: ${error.message}`, 'error');
  });
}

// Función para escapar HTML (seguridad)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función para manejar el envío del formulario
function handleFormSubmit(event) {
  event.preventDefault();
  sendMessage();
  return false;
}

// Función para manejar tecla Enter
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM cargado, inicializando aplicación...');
  
  // Inicializar Firebase
  if (initializeFirebase()) {
    // Cargar mensajes
    loadMessages();
    
    // Configurar event listeners
    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');
    
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
      console.log('✅ Event listener del formulario configurado');
    }
    
    if (input) {
      input.addEventListener('keypress', handleKeyPress);
      input.focus();
      console.log('✅ Event listener del input configurado');
    }
    
    console.log('🎉 Aplicación inicializada correctamente');
  } else {
    showStatus('Error al inicializar la aplicación', 'error');
  }
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
  console.error('❌ Error global:', event.error);
  showStatus('Error inesperado - Recarga la página', 'error');
});

// Log final
console.log('📜 cliente.js cargado completamente');
