console.log('🚀 Iniciando ChatFlow Pro - Versión Móvil Optimizada...');

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
let replyingTo = null;
let currentMessages = [];
let userLanguage = 'es';
let translationEnabled = true;

// Función para traducir texto usando Google Translate API gratuita
async function translateText(text, targetLang, sourceLang = 'auto') {
  try {
    // URL de la API gratuita de Google Translate (via translate.googleapis.com)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    
    throw new Error('No translation available');
  } catch (error) {
    console.error('Error traduciendo:', error);
    throw error;
  }
}

// Función para detectar idioma del texto
function detectLanguage(text) {
  // Detección simple basada en caracteres
  const cyrillic = /[\u0400-\u04FF]/.test(text);
  const spanish = /[ñáéíóúü]/i.test(text);
  const chinese = /[\u4e00-\u9fff]/.test(text);
  
  if (cyrillic) return 'ru';
  if (chinese) return 'zh';
  if (spanish) return 'es';
  
  // Por defecto, asumir inglés si no se detecta
  return 'en';
}

// Función para obtener idioma de destino automático
function getTargetLanguage(sourceText, userLang) {
  const detectedLang = detectLanguage(sourceText);
  
  // Si el mensaje está en el idioma del usuario, traducir al más común de la sala
  if (detectedLang === userLang) {
    // Por defecto, si es español → ruso, si es ruso → español
    if (userLang === 'es') return 'ru';
    if (userLang === 'ru') return 'es';
    return 'en'; // Fallback a inglés
  }
  
  // Si el mensaje NO está en el idioma del usuario, traducir a su idioma
  return userLang;
}

// Función para obtener bandera del idioma
function getLanguageFlag(langCode) {
  const flags = {
    'es': '🇪🇸',
    'ru': '🇷🇺', 
    'en': '🇺🇸',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'zh': '🇨🇳'
  };
  
// Estados de la aplicación
const AppState = {
  WELCOME: 'welcome',
  CHAT: 'chat'
};

let currentState = AppState.WELCOME;

// Función para mostrar estado en la barra
function showStatus(message, type = 'info') {
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    statusBar.textContent = message;
    statusBar.className = `status-bar ${type}`;
    console.log(`📊 Estado: ${message}`);
  }
}

// Función para generar ID único
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Función para obtener iniciales
function getInitials(name) {
  return name.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Función para obtener color de avatar
function getAvatarColor(name) {
  const colors = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Función para cambiar estado de la aplicación
function changeState(newState) {
  currentState = newState;
  
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatScreen = document.getElementById('chat-screen');
  
  if (newState === AppState.WELCOME) {
    welcomeScreen.style.display = 'flex';
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
    console.log('📊 Database referencia creada');
    
    // Verificar conexión
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      const connected = snapshot.val();
      console.log('🌐 Estado de conexión Firebase:', connected);
      
      if (connected === true) {
        console.log('🌐 Conectado a Firebase');
        isConnected = true;
        if (currentState === AppState.WELCOME) {
          showStatus('Listo para comenzar', 'success');
        } else {
          showStatus('Conectado', 'success');
        }
      } else {
        console.log('❌ Desconectado de Firebase');
        isConnected = false;
        showStatus('Sin conexión', 'error');
      }
    });
    
    // Test de escritura para verificar permisos
    const testRef = database.ref('test');
    testRef.set({
      timestamp: Date.now(),
      test: 'connection'
    }).then(() => {
      console.log('✅ Test de escritura exitoso');
      testRef.remove(); // Limpiar test
    }).catch((error) => {
      console.error('❌ Error en test de escritura:', error);
      showStatus('Error de permisos en Firebase', 'error');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    showStatus('Error de conexión', 'error');
    return false;
  }
}

// Función para limpiar listeners
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
function joinRoom(roomName, username, language) {
  if (!isConnected || !database) {
    showStatus('Sin conexión', 'error');
    return false;
  }

  console.log(`🏠 Uniéndose a la sala: ${roomName} como ${username} (${language})`);
  
  cleanupListeners();
  
  currentRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
  userLanguage = language;
  
  currentUser = {
    id: generateUserId(),
    name: username,
    language: language,
    joinedAt: Date.now(),
    avatar: getInitials(username),
    color: getAvatarColor(username)
  };
  
  messagesRef = database.ref(`rooms/${currentRoom}/messages`);
  participantsRef = database.ref(`rooms/${currentRoom}/participants`);
  
  // Añadir usuario a participantes
  participantsRef.child(currentUser.id).set({
    name: currentUser.name,
    language: currentUser.language,
    avatar: currentUser.avatar,
    color: currentUser.color,
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
  
  // Actualizar UI del header
  updateChatHeader(roomName, language);
  
  setupMessageListener();
  setupParticipantsListener();
  
  // Actualizar actividad cada 30 segundos
  setInterval(() => {
    if (currentUser && participantsRef) {
      participantsRef.child(currentUser.id).update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }, 30000);
  
  showStatus('Conectado', 'success');
  
  // Focus al input después de un momento
  setTimeout(() => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.focus();
    }
  }, 500);
  
  return true;
}

// Función para actualizar header del chat
function updateChatHeader(roomName, language) {
  const roomAvatar = document.getElementById('room-avatar');
  const roomTitle = document.getElementById('room-title');
  const roomStatusText = document.getElementById('room-status-text');
  const languageIndicator = document.getElementById('language-indicator');
  
  if (roomAvatar) {
    roomAvatar.textContent = getInitials(roomName);
    roomAvatar.style.background = getAvatarColor(roomName);
  }
  
  if (roomTitle) {
    roomTitle.textContent = roomName;
  }
  
  if (roomStatusText) {
    roomStatusText.textContent = 'Traducción activa';
  }
  
  if (languageIndicator) {
    languageIndicator.textContent = `${getLanguageFlag(language)} ${language.toUpperCase()}`;
  }
}

// Función para configurar listener de mensajes
function setupMessageListener() {
  if (!messagesRef) return;
  
  console.log('📥 Configurando listener de mensajes...');
  
  messageListener = messagesRef.limitToLast(100);
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
      
      currentMessages = messages;
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
      
      updateParticipantCount(participants.length);
      console.log(`👥 ${participants.length} participantes activos`);
    } catch (error) {
      console.error('❌ Error al cargar participantes:', error);
    }
  });
}

// Función para actualizar contador de participantes
function updateParticipantCount(count) {
  const participantNumber = document.getElementById('participant-number');
  if (participantNumber) {
    participantNumber.textContent = count;
  }
}

// Función para mostrar mensajes
function displayMessages(messages) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  // Guardar posición del scroll
  const wasScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
  
  // Ordenar por timestamp
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = '<div class="system-message">¡Comienza la conversación! Los mensajes se traducirán automáticamente 🌍</div>';
    return;
  }
  
  messages.forEach((msg, index) => {
    const messageDiv = document.createElement('div');
    
    if (msg.type === 'system') {
      messageDiv.className = 'system-message';
      messageDiv.textContent = msg.content;
    } else {
      const isOwn = msg.userId === currentUser.id;
      const prevMsg = messages[index - 1];
      const isGrouped = prevMsg && 
                       prevMsg.userId === msg.userId && 
                       prevMsg.type !== 'system' &&
                       (msg.timestamp - prevMsg.timestamp) < 300000; // 5 minutos
      
      messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
      messageDiv.setAttribute('data-message-id', msg.id);
      
      const timestamp = msg.timestamp ? 
        new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      
      let avatarHtml = '';
      let headerHtml = '';
      
      if (!isGrouped) {
        const avatarColor = msg.userColor || getAvatarColor(msg.userName || 'Usuario');
        const avatarText = msg.userAvatar || getInitials(msg.userName || 'U');
        const userLangFlag = msg.userLanguage ? getLanguageFlag(msg.userLanguage) : '🌍';
        
        avatarHtml = `
          <div class="message-avatar" style="background: ${avatarColor}">
            ${avatarText}
          </div>
        `;
        
        headerHtml = `
          <div class="message-header">
            <span class="message-author">${isOwn ? 'Tú' : (msg.userName || 'Usuario')} ${userLangFlag}</span>
            <span class="message-time">${timestamp}</span>
          </div>
        `;
      }
      
      let quotedHtml = '';
      if (msg.replyTo) {
        quotedHtml = `
          <div class="quoted-message">
            <div class="quoted-author">💬 ${msg.replyTo.userName}</div>
            <div class="quoted-content">${escapeHtml(msg.replyTo.content)}</div>
          </div>
        `;
      }
      
      let actionsHtml = '';
      if (!isOwn) {
        actionsHtml = `
          <div class="message-actions">
            <div class="action-button" onclick="startReply('${msg.id}', '${escapeHtml(msg.userName)}', '${escapeHtml(msg.content)}')" title="Responder">
              ↩️
            </div>
          </div>
        `;
      }
      
      // Contenido del mensaje con traducción
      let messageContentHtml = `<div class="original-message">${escapeHtml(msg.content)}</div>`;
      
      // Si la traducción está habilitada y el mensaje no es del usuario actual
      if (translationEnabled && !isOwn && msg.userLanguage && msg.userLanguage !== userLanguage) {
        messageContentHtml += `<div class="translated-message translation-loading" id="translation-${msg.id}">🌐 Traduciendo...</div>`;
        
        // Traducir mensaje de forma asíncrona
        translateMessage(msg.id, msg.content, msg.userLanguage);
      }
      
      messageDiv.innerHTML = `
        ${avatarHtml}
        <div class="message-content">
          ${headerHtml}
          <div class="message-bubble">
            ${quotedHtml}
            ${messageContentHtml}
            ${actionsHtml}
          </div>
        </div>
      `;
      
      // Agregar evento de doble toque para respuesta rápida en móvil
      if (!isOwn) {
        let touchTime = 0;
        messageDiv.addEventListener('touchend', (e) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - touchTime;
          if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
            startReply(msg.id, msg.userName, msg.content);
          }
          touchTime = currentTime;
        });
      }
    }
    
    container.appendChild(messageDiv);
  });
  
  // Scroll al final si estaba al final
  if (wasScrolledToBottom) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
}

// Función para traducir mensaje de forma asíncrona
async function translateMessage(messageId, originalText, sourceLang) {
  try {
    const targetLang = userLanguage;
    if (sourceLang === targetLang) return;
    
    const translatedText = await translateText(originalText, targetLang, sourceLang);
    
    const translationDiv = document.getElementById(`translation-${messageId}`);
    if (translationDiv) {
      translationDiv.className = 'translated-message';
      translationDiv.innerHTML = `🌐 ${escapeHtml(translatedText)}`;
    }
  } catch (error) {
    console.error('Error traduciendo mensaje:', error);
    const translationDiv = document.getElementById(`translation-${messageId}`);
    if (translationDiv) {
      translationDiv.className = 'translated-message translation-error';
      translationDiv.innerHTML = '🌐 Error de traducción';
    }
  }
}

// Función para iniciar respuesta
function startReply(messageId, userName, content) {
  console.log(`💬 Iniciando respuesta a mensaje de ${userName}`);
  
  replyingTo = {
    messageId: messageId,
    userName: userName,
    content: content
  };
  
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
    showStatus('Sin conexión', 'error');
    return;
  }
  
  // Deshabilitar botón temporalmente
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.innerHTML = '<span>⏳</span>';
  }
  
  const messageData = {
    type: 'text',
    content: message,
    userName: currentUser.name,
    userId: currentUser.id,
    userAvatar: currentUser.avatar,
    userColor: currentUser.color,
    userLanguage: currentUser.language,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Agregar información de respuesta si existe
  if (replyingTo) {
    messageData.replyTo = {
      messageId: replyingTo.messageId,
      userName: replyingTo.userName,
      content: replyingTo.content.substring(0, 100)
    };
  }
  
  messagesRef.push(messageData)
    .then(() => {
      console.log('✅ Mensaje enviado');
      input.value = '';
      
      if (replyingTo) {
        cancelReply();
      }
    })
    .catch((error) => {
      console.error('❌ Error al enviar mensaje:', error);
      showStatus('Error al enviar', 'error');
    })
    .finally(() => {
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.innerHTML = '<span>📤</span>';
      }
      input.focus();
    });
}

// Función para salir de la sala
function leaveRoom() {
  console.log('🚪 Saliendo de la sala...');
  
  if (currentUser && messagesRef) {
    messagesRef.push({
      type: 'system',
      content: `${currentUser.name} salió del chat`,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }
  
  if (currentUser && participantsRef) {
    participantsRef.child(currentUser.id).remove();
  }
  
  cleanupListeners();
  
  if (replyingTo) {
    cancelReply();
  }
  
  // Resetear variables
  currentRoom = null;
  currentUser = null;
  messagesRef = null;
  participantsRef = null;
  currentMessages = [];
  
  changeState(AppState.WELCOME);
  showStatus('Listo para comenzar', 'success');
  
  // Limpiar campos
  document.getElementById('username').value = '';
  document.getElementById('room-name').value = '';
  
  // Focus al username después de un momento
  setTimeout(() => {
    document.getElementById('username').focus();
  }, 500);
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
  const languageSelect = document.getElementById('user-language');
  
  const username = usernameInput.value.trim();
  const roomName = roomNameInput.value.trim();
  const language = languageSelect ? languageSelect.value : 'es';
  
  console.log('🎯 Intentando unirse:', { username, roomName, language });
  
  if (!username) {
    showStatus('Ingresa tu nombre', 'error');
    usernameInput.focus();
    return;
  }
  
  if (!roomName) {
    showStatus('Ingresa el nombre de la sala', 'error');
    roomNameInput.focus();
    return;
  }
  
  if (username.length < 2) {
    showStatus('Nombre muy corto', 'error');
    usernameInput.focus();
    return;
  }
  
  if (roomName.length < 2) {
    showStatus('Nombre de sala muy corto', 'error');
    roomNameInput.focus();
    return;
  }
  
  showStatus(isCreating ? 'Creando sala...' : 'Uniéndose...', 'info');
  
  try {
    if (joinRoom(roomName, username, language)) {
      console.log(`✅ ${isCreating ? 'Sala creada' : 'Unido a sala'} exitosamente`);
    }
  } catch (error) {
    console.error('❌ Error al unirse a la sala:', error);
    showStatus('Error al unirse a la sala', 'error');
  }
}

// Funciones globales para HTML
window.startReply = startReply;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM cargado, inicializando ChatFlow Pro...');
  
  if (!initializeFirebase()) {
    showStatus('Error de inicialización', 'error');
    return;
  }
  
  changeState(AppState.WELCOME);
  
  // Botones principales
  const joinBtn = document.getElementById('join-btn');
  const createBtn = document.getElementById('create-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const cancelReplyBtn = document.getElementById('cancel-reply');
  const toggleTranslationBtn = document.getElementById('toggle-translation');
  
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      console.log('🔘 Botón unirse presionado');
      handleJoinRoom(false);
    });
  }
  
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      console.log('🔘 Botón crear presionado');
      handleJoinRoom(true);
    });
  }
  
  if (leaveBtn) {
    leaveBtn.addEventListener('click', leaveRoom);
  }
  
  if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', cancelReply);
  }
  
  if (toggleTranslationBtn) {
    toggleTranslationBtn.addEventListener('click', () => {
      translationEnabled = !translationEnabled;
      toggleTranslationBtn.classList.toggle('active', translationEnabled);
      
      const statusText = document.getElementById('room-status-text');
      if (statusText) {
        statusText.textContent = translationEnabled ? 'Traducción activa' : 'Traducción desactivada';
      }
      
      console.log('🌐 Traducción:', translationEnabled ? 'activada' : 'desactivada');
    });
  }
  
  // Inputs de bienvenida
  const usernameInput = document.getElementById('username');
  const roomNameInput = document.getElementById('room-name');
  const languageSelect = document.getElementById('user-language');
  
  console.log('🔧 Elementos encontrados:', {
    username: !!usernameInput,
    roomName: !!roomNameInput,
    language: !!languageSelect
  });
  
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (roomNameInput) {
          roomNameInput.focus();
        } else {
          handleJoinRoom(false);
        }
      }
    });
    
    // Auto-focus después de cargar
    setTimeout(() => {
      usernameInput.focus();
      console.log('🎯 Focus en username input');
    }, 1000);
  }
  
  if (roomNameInput) {
    roomNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('⏎ Enter presionado en room name');
        handleJoinRoom(false);
      }
    });
  }
  
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      console.log('🌍 Idioma seleccionado:', e.target.value);
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
      if (e.key === 'Escape' && replyingTo) {
        cancelReply();
      }
    });
  }
  
  // Prevenir zoom en iOS
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  });
  
  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    // Escape para cancelar respuesta
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      cancelReply();
    }
  });
  
  console.log('🎉 ChatFlow Pro inicializado correctamente');
});

// Manejo de errores y limpieza
window.addEventListener('error', (event) => {
  console.error('❌ Error global:', event.error);
  showStatus('Error inesperado', 'error');
});

window.addEventListener('beforeunload', () => {
  if (currentUser && participantsRef) {
    participantsRef.child(currentUser.id).remove();
  }
});

// Manejo de visibilidad de la página para móvil
document.addEventListener('visibilitychange', () => {
  if (currentUser && participantsRef) {
    if (document.visibilityState === 'visible') {
      participantsRef.child(currentUser.id).update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }
});

console.log('📜 ChatFlow Pro cargado - Optimizado para móvil');
