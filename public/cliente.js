console.log('🚀 Iniciando Chat Ultra Épico con Respuestas...');

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
let currentRoom = null;
let currentUser = null;
let messagesRef = null;
let participantsRef = null;
let isConnected = false;
let messageListener = null;
let participantsListener = null;

// Variables para el sistema de respuestas
let replyingTo = null;
let currentMessages = [];

// Estados de la aplicación
const AppState = {
  WELCOME: 'welcome',
  CHAT: 'chat'
};

let currentState = AppState.WELCOME;

// Función para mostrar estado
function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    console.log(`📊 Estado: ${message}`);
  }
}

// Función para generar ID único del usuario
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Función para cambiar estado de la aplicación
function changeState(newState) {
  currentState = newState;
  
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatScreen = document.getElementById('chat-screen');
  
  if (newState === AppState.WELCOME) {
    welcomeScreen.style.display = 'block';
    chatScreen.style.display = 'none';
  } else if (newState === AppState.CHAT) {
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
  }
}

// Función para inicializar Firebase
function initializeFirebase() {
  try {
    console.log('🔥 Inicializando Firebase...');
    
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado correctamente');
    } else {
      console.log('✅ Firebase ya estaba inicializado');
    }
    
    database = firebase.database();
    
    // Verificar conexión
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        console.log('🌐 Conectado a Firebase');
        isConnected = true;
        if (currentState === AppState.WELCOME) {
          showStatus('Listo para crear o unirse a una sala! 🎉', 'success');
        }
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

// Función para limpiar listeners anteriores
function cleanupListeners() {
  if (messageListener) {
    messageListener.off();
    messageListener = null;
  }
  if (participantsListener) {
    participantsListener.off();
    participantsListener = null;
  }
}

// Función para unirse a una sala
function joinRoom(roomName, username) {
  if (!isConnected || !database) {
    showStatus('Sin conexión a Firebase', 'error');
    return false;
  }

  console.log(`🏠 Uniéndose a la sala: ${roomName} como ${username}`);
  
  // Limpiar listeners anteriores
  cleanupListeners();
  
  // Configurar referencias
  currentRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
  currentUser = {
    id: generateUserId(),
    name: username,
    joinedAt: Date.now()
  };
  
  messagesRef = database.ref(`rooms/${currentRoom}/messages`);
  participantsRef = database.ref(`rooms/${currentRoom}/participants`);
  
  // Añadir usuario a participantes
  participantsRef.child(currentUser.id).set({
    name: currentUser.name,
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
    lastSeen: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Remover usuario al desconectarse
  participantsRef.child(currentUser.id).onDisconnect().remove();
  
  // Enviar mensaje de sistema
  messagesRef.push({
    type: 'system',
    content: `${currentUser.name} se unió al chat`,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Cambiar a pantalla de chat
  changeState(AppState.CHAT);
  document.getElementById('current-room').textContent = `Sala: ${roomName}`;
  
  // Configurar listeners
  setupMessageListener();
  setupParticipantsListener();
  
  // Actualizar last seen cada 30 segundos
  setInterval(() => {
    if (currentUser && participantsRef) {
      participantsRef.child(currentUser.id).update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }, 30000);
  
  showStatus('¡Conectado al chat! 🎉', 'success');
  
  // Focus al input de mensaje
  setTimeout(() => {
    document.getElementById('message-input').focus();
  }, 500);
  
  return true;
}

// Función para configurar listener de mensajes
function setupMessageListener() {
  if (!messagesRef) return;
  
  console.log('📥 Configurando listener de mensajes...');
  
  messageListener = messagesRef.limitToLast(50);
  messageListener.on('value', (snapshot) => {
    try {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const messageData = childSnapshot.val();
        if (messageData) {
          messages.push({
            ...messageData,
            id: childSnapshot.key
          });
        }
      });
      
      currentMessages = messages; // Guardar para el sistema de respuestas
      displayMessages(messages);
      console.log(`📋 ${messages.length} mensajes cargados`);
    } catch (error) {
      console.error('❌ Error al procesar mensajes:', error);
      showStatus('Error al cargar mensajes', 'error');
    }
  });
}

// Función para configurar listener de participantes
function setupParticipantsListener() {
  if (!participantsRef) return;
  
  console.log('👥 Configurando listener de participantes...');
  
  participantsListener = participantsRef;
  participantsListener.on('value', (snapshot) => {
    try {
      const participants = [];
      snapshot.forEach((childSnapshot) => {
        const participantData = childSnapshot.val();
        if (participantData) {
          participants.push({
            id: childSnapshot.key,
            ...participantData
          });
        }
      });
      
      displayParticipants(participants);
      console.log(`👥 ${participants.length} participantes activos`);
    } catch (error) {
      console.error('❌ Error al cargar participantes:', error);
    }
  });
}

// Función para mostrar mensajes
function displayMessages(messages) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;
  
  // Ordenar por timestamp
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  chatContainer.innerHTML = '';
  
  if (messages.length === 0) {
    chatContainer.innerHTML = '<div class="system-message">¡Sé el primero en escribir! 💬</div>';
    return;
  }
  
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    
    if (msg.type === 'system') {
      messageDiv.className = 'system-message';
      messageDiv.textContent = msg.content;
    } else {
      const isOwn = msg.userId === currentUser.id;
      messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
      messageDiv.setAttribute('data-message-id', msg.id);
      
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      
      let quotedHtml = '';
      if (msg.replyTo) {
        const quotedMessage = findMessageById(msg.replyTo.messageId);
        if (quotedMessage) {
          quotedHtml = `
            <div class="quoted-message">
              <div class="quoted-author">📝 ${msg.replyTo.userName}</div>
              <div class="quoted-content">${escapeHtml(msg.replyTo.content)}</div>
            </div>
          `;
        }
      }
      
      messageDiv.innerHTML = `
        <div class="message-header">
          <span>${isOwn ? 'Tú' : (msg.userName || 'Usuario')}</span>
          ${!isOwn ? `<button class="reply-btn" onclick="startReply('${msg.id}', '${escapeHtml(msg.userName)}', '${escapeHtml(msg.content)}')">↩️ Responder</button>` : ''}
        </div>
        ${quotedHtml}
        <div class="message-content">${escapeHtml(msg.content)}</div>
        <div class="message-time">${timestamp}</div>
      `;
      
      // Agregar evento de click para móviles (respuesta rápida)
      if (!isOwn) {
        messageDiv.addEventListener('dblclick', () => {
          startReply(msg.id, msg.userName, msg.content);
        });
      }
    }
    
    chatContainer.appendChild(messageDiv);
  });
  
  // Scroll al final
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Función para encontrar mensaje por ID
function findMessageById(messageId) {
  return currentMessages.find(msg => msg.id === messageId);
}

// Función para iniciar respuesta a un mensaje
function startReply(messageId, userName, content) {
  console.log(`💬 Iniciando respuesta a mensaje de ${userName}`);
  
  replyingTo = {
    messageId: messageId,
    userName: userName,
    content: content
  };
  
  // Mostrar preview de respuesta
  const replyPreview = document.getElementById('reply-preview');
  const replyToUser = document.getElementById('reply-to-user');
  const replyPreviewContent = document.getElementById('reply-preview-content');
  const messageInput = document.getElementById('message-input');
  const inputContainer = document.querySelector('.input-container');
  
  if (replyPreview && replyToUser && replyPreviewContent && messageInput) {
    replyToUser.textContent = userName;
    replyPreviewContent.textContent = content;
    replyPreview.classList.add('active');
    inputContainer.classList.add('replying');
    
    messageInput.placeholder = `Respondiendo a ${userName}...`;
    messageInput.focus();
    
    console.log('✅ Preview de respuesta activado');
  }
}

// Función para cancelar respuesta
function cancelReply() {
  console.log('❌ Cancelando respuesta');
  
  replyingTo = null;
  
  const replyPreview = document.getElementById('reply-preview');
  const messageInput = document.getElementById('message-input');
  const inputContainer = document.querySelector('.input-container');
  
  if (replyPreview && messageInput && inputContainer) {
    replyPreview.classList.remove('active');
    inputContainer.classList.remove('replying');
    messageInput.placeholder = 'Escribe tu mensaje...';
    messageInput.focus();
  }
}

// Función para mostrar participantes
function displayParticipants(participants) {
  const participantsList = document.getElementById('participants-list');
  const participantCount = document.getElementById('participant-count');
  
  if (!participantsList || !participantCount) return;
  
  participantCount.textContent = `Participantes: ${participants.length}`;
  
  participantsList.innerHTML = '';
  
  participants.forEach(participant => {
    const participantDiv = document.createElement('div');
    participantDiv.className = `participant ${participant.id === currentUser.id ? 'you' : ''}`;
    participantDiv.textContent = participant.id === currentUser.id ? `${participant.name} (tú)` : participant.name;
    participantsList.appendChild(participantDiv);
  });
}

// Función para enviar mensaje
function sendMessage() {
  console.log('📤 Enviando mensaje...');
  
  const input = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  if (!input || !currentUser || !messagesRef) {
    console.error('❌ Datos incompletos para enviar mensaje');
    return;
  }
  
  const message = input.value.trim();
  if (!message) {
    console.log('⚠️ Mensaje vacío');
    input.focus();
    return;
  }
  
  if (!isConnected) {
    showStatus('Sin conexión - Reintentando...', 'error');
    return;
  }
  
  // Deshabilitar botón temporalmente
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Enviando...';
  }
  
  const messageData = {
    type: 'text',
    content: message,
    userName: currentUser.name,
    userId: currentUser.id,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Agregar información de respuesta si existe
  if (replyingTo) {
    messageData.replyTo = {
      messageId: replyingTo.messageId,
      userName: replyingTo.userName,
      content: replyingTo.content.substring(0, 100) // Limitar contenido citado
    };
    console.log('💬 Mensaje con respuesta preparado');
  }
  
  messagesRef.push(messageData)
    .then(() => {
      console.log('✅ Mensaje enviado');
      input.value = '';
      
      // Cancelar respuesta si estaba activa
      if (replyingTo) {
        cancelReply();
      }
    })
    .catch((error) => {
      console.error('❌ Error al enviar mensaje:', error);
      showStatus(`Error al enviar: ${error.message}`, 'error');
    })
    .finally(() => {
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = 'Enviar 🚀';
      }
      input.focus();
    });
}

// Función para salir de la sala
function leaveRoom() {
  console.log('🚪 Saliendo de la sala...');
  
  if (currentUser && messagesRef) {
    // Enviar mensaje de sistema
    messagesRef.push({
      type: 'system',
      content: `${currentUser.name} salió del chat`,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  // Remover de participantes
  if (currentUser && participantsRef) {
    participantsRef.child(currentUser.id).remove();
  }
  
  // Limpiar listeners
  cleanupListeners();
  
  // Cancelar respuesta si estaba activa
  if (replyingTo) {
    cancelReply();
  }
  
  // Resetear variables
  currentRoom = null;
  currentUser = null;
  messagesRef = null;
  participantsRef = null;
  currentMessages = [];
  
  // Volver a pantalla de bienvenida
  changeState(AppState.WELCOME);
  showStatus('Listo para crear o unirse a una sala! 🎉', 'success');
  
  // Limpiar campos
  document.getElementById('username').value = '';
  document.getElementById('room-name').value = '';
  document.getElementById('username').focus();
}

// Función para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Función para manejar unirse/crear sala
function handleJoinRoom(isCreating = false) {
  const usernameInput = document.getElementById('username');
  const roomNameInput = document.getElementById('room-name');
  
  const username = usernameInput.value.trim();
  const roomName = roomNameInput.value.trim();
  
  if (!username) {
    showStatus('Por favor, ingresa tu nombre', 'error');
    usernameInput.focus();
    return;
  }
  
  if (!roomName) {
    showStatus('Por favor, ingresa el nombre de la sala', 'error');
    roomNameInput.focus();
    return;
  }
  
  if (username.length < 2) {
    showStatus('El nombre debe tener al menos 2 caracteres', 'error');
    usernameInput.focus();
    return;
  }
  
  if (roomName.length < 2) {
    showStatus('El nombre de la sala debe tener al menos 2 caracteres', 'error');
    roomNameInput.focus();
    return;
  }
  
  showStatus(isCreating ? 'Creando sala...' : 'Uniéndose a la sala...', 'info');
  
  if (joinRoom(roomName, username)) {
    console.log(`✅ ${isCreating ? 'Sala creada' : 'Unido a sala'} exitosamente`);
  }
}

// Función global para iniciar respuesta (llamada desde HTML)
window.startReply = startReply;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM cargado, inicializando aplicación...');
  
  // Inicializar Firebase
  if (!initializeFirebase()) {
    showStatus('Error al inicializar la aplicación', 'error');
    return;
  }
  
  // Configurar pantalla inicial
  changeState(AppState.WELCOME);
  
  // Botones de bienvenida
  const joinBtn = document.getElementById('join-btn');
  const createBtn = document.getElementById('create-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const cancelReplyBtn = document.getElementById('cancel-reply');
  
  if (joinBtn) {
    joinBtn.addEventListener('click', () => handleJoinRoom(false));
  }
  
  if (createBtn) {
    createBtn.addEventListener('click', () => handleJoinRoom(true));
  }
  
  if (leaveBtn) {
    leaveBtn.addEventListener('click', leaveRoom);
  }
  
  if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', cancelReply);
  }
  
  // Enter en campos de bienvenida
  const usernameInput = document.getElementById('username');
  const roomNameInput = document.getElementById('room-name');
  
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        roomNameInput.focus();
      }
    });
  }
  
  if (roomNameInput) {
    roomNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleJoinRoom(false);
      }
    });
  }
  
  // Formulario de mensaje
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  
  if (messageForm) {
    messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      
      // Cancelar respuesta con Escape
      if (e.key === 'Escape' && replyingTo) {
        cancelReply();
      }
    });
  }
  
  // Focus inicial
  setTimeout(() => {
    if (usernameInput) {
      usernameInput.focus();
    }
  }, 500);
  
  console.log('🎉 Aplicación con respuestas inicializada correctamente');
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
  console.error('❌ Error global:', event.error);
  showStatus('Error inesperado - Recarga la página', 'error');
});

// Manejar cierre de ventana/pestaña
window.addEventListener('beforeunload', () => {
  if (currentUser && participantsRef) {
    participantsRef.child(currentUser.id).remove();
  }
});

console.log('📜 Cliente con respuestas cargado completamente');
