console.log('🚀 Iniciando ChatFlow - Comunicación Moderna...');

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

// Estados de la aplicación
const AppState = {
  WELCOME: 'welcome',
  CHAT: 'chat'
};

let currentState = AppState.WELCOME;

// Función para mostrar estado en la barra superior
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

// Función para obtener iniciales del nombre
function getInitials(name) {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

// Función para obtener color basado en el nombre
function getAvatarColor(name) {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
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

// Función para obtener icono de archivo
function getFileIcon(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const icons = {
    // Imágenes
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
    // Documentos
    'pdf': '📄', 'doc': '📄', 'docx': '📄', 'txt': '📄', 'rtf': '📄',
    // Hojas de cálculo
    'xlsx': '📊', 'xls': '📊', 'csv': '📊',
    // Presentaciones
    'ppt': '📽️', 'pptx': '📽️',
    // Audio
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'm4a': '🎵',
    // Video
    'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬',
    // Archivos comprimidos
    'zip': '📦', 'rar': '📦', '7z': '📦',
    // Código
    'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻'
  };
  
  return icons[extension] || '📎';
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para convertir archivo a Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Convirtiendo ${file.name} (${formatFileSize(file.size)}) a Base64...`);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      console.log(`✅ Conversión exitosa de ${file.name}`);
      resolve(e.target.result);
    };
    
    reader.onerror = function(error) {
      console.error(`❌ Error convirtiendo ${file.name}:`, error);
      reject(error);
    };
    
    reader.onprogress = function(e) {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        if (percentComplete % 25 === 0) { // Log cada 25%
          console.log(`📊 Progreso ${file.name}: ${percentComplete.toFixed(0)}%`);
        }
      }
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(`❌ Error iniciando lectura de ${file.name}:`, error);
      reject(error);
    }
  });
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
          showStatus('Listo para comenzar - Ingresa tus datos', 'success');
        } else {
          showStatus('Conectado y sincronizado', 'success');
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
function joinRoom(roomName, username) {
  if (!isConnected || !database) {
    showStatus('Sin conexión a Firebase', 'error');
    return false;
  }

  console.log(`🏠 Uniéndose a la sala: ${roomName} como ${username}`);
  
  cleanupListeners();
  
  currentRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '');
  currentUser = {
    id: generateUserId(),
    name: username,
    joinedAt: Date.now(),
    avatar: getInitials(username),
    color: getAvatarColor(username)
  };
  
  messagesRef = database.ref(`rooms/${currentRoom}/messages`);
  participantsRef = database.ref(`rooms/${currentRoom}/participants`);
  
  // Añadir usuario a participantes
  participantsRef.child(currentUser.id).set({
    name: currentUser.name,
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
  const roomAvatar = document.getElementById('room-avatar');
  const currentRoomTitle = document.getElementById('current-room');
  
  if (roomAvatar) {
    roomAvatar.textContent = getInitials(roomName);
    roomAvatar.style.background = getAvatarColor(roomName);
  }
  
  if (currentRoomTitle) {
    currentRoomTitle.textContent = roomName;
  }
  
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
  
  showStatus('¡Conectado y listo para chatear!', 'success');
  
  setTimeout(() => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.focus();
  }, 500);
  
  return true;
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
      
      displayParticipants(participants);
      console.log(`👥 ${participants.length} participantes activos`);
    } catch (error) {
      console.error('❌ Error al cargar participantes:', error);
    }
  });
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
    container.innerHTML = '<div class="system-message">¡Comienza la conversación! Escribe algo o comparte un archivo 🚀</div>';
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
        
        avatarHtml = `
          <div class="message-avatar" style="background: ${avatarColor}">
            ${avatarText}
          </div>
        `;
        
        headerHtml = `
          <div class="message-header">
            <span class="message-author">${isOwn ? 'Tú' : (msg.userName || 'Usuario')}</span>
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
      
      let contentHtml = '';
      let actionsHtml = '';
      
      if (msg.type === 'file') {
        const fileIcon = getFileIcon(msg.fileName);
        
        if (msg.fileType && msg.fileType.startsWith('image/')) {
          contentHtml = `
            <div class="file-message">
              <div class="file-icon">${fileIcon}</div>
              <div class="file-details">
                <div class="file-name">${escapeHtml(msg.fileName)}</div>
                <div class="file-size">${formatFileSize(msg.fileSize || 0)}</div>
              </div>
            </div>
            <img class="image-preview" src="${msg.fileData}" alt="${escapeHtml(msg.fileName)}" onclick="openImageModal('${msg.fileData}')">
          `;
        } else {
          contentHtml = `
            <div class="file-message">
              <div class="file-icon">${fileIcon}</div>
              <div class="file-details">
                <div class="file-name">${escapeHtml(msg.fileName)}</div>
                <div class="file-size">${formatFileSize(msg.fileSize || 0)}</div>
              </div>
              <button class="file-download" onclick="downloadFile('${msg.fileData}', '${escapeHtml(msg.fileName)}')">
                ⬇️ Descargar
              </button>
            </div>
          `;
        }
        
        if (msg.content && msg.content.trim()) {
          contentHtml += `<div style="margin-top: 8px;">${escapeHtml(msg.content)}</div>`;
        }
      } else {
        contentHtml = escapeHtml(msg.content);
      }
      
      if (!isOwn) {
        actionsHtml = `
          <div class="message-actions">
            <div class="action-button" onclick="startReply('${msg.id}', '${escapeHtml(msg.userName)}', '${escapeHtml(msg.content || msg.fileName || 'archivo')}')" title="Responder">
              ↩️
            </div>
          </div>
        `;
      }
      
      messageDiv.innerHTML = `
        ${avatarHtml}
        <div class="message-content">
          ${headerHtml}
          <div class="message-bubble">
            ${quotedHtml}
            ${contentHtml}
            ${actionsHtml}
          </div>
        </div>
      `;
      
      // Agregar doble click para respuesta rápida
      if (!isOwn) {
        messageDiv.addEventListener('dblclick', () => {
          startReply(msg.id, msg.userName, msg.content || msg.fileName || 'archivo');
        });
      }
    }
    
    container.appendChild(messageDiv);
    
    // Animar entrada del mensaje
    setTimeout(() => {
      messageDiv.style.animationDelay = `${index * 50}ms`;
    }, 10);
  });
  
  // Scroll al final si estaba al final
  if (wasScrolledToBottom) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
}

// Función para mostrar participantes
function displayParticipants(participants) {
  const participantsList = document.getElementById('participants-list');
  const participantCount = document.getElementById('participant-count');
  
  if (!participantsList || !participantCount) return;
  
  participantCount.textContent = `${participants.length} ${participants.length === 1 ? 'participante' : 'participantes'} conectados`;
  
  participantsList.innerHTML = '';
  
  participants.slice(0, 8).forEach(participant => { // Máximo 8 avatares
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `participant-avatar ${participant.id === currentUser.id ? 'you' : ''}`;
    avatarDiv.style.background = participant.color || getAvatarColor(participant.name);
    avatarDiv.textContent = participant.avatar || getInitials(participant.name);
    avatarDiv.title = participant.id === currentUser.id ? `${participant.name} (tú)` : participant.name;
    participantsList.appendChild(avatarDiv);
  });
  
  if (participants.length > 8) {
    const moreDiv = document.createElement('div');
    moreDiv.className = 'participant-avatar';
    moreDiv.textContent = `+${participants.length - 8}`;
    moreDiv.title = `${participants.length - 8} participantes más`;
    participantsList.appendChild(moreDiv);
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

// Función para procesar archivos
async function processFiles(files, messageText = '') {
  if (!files || files.length === 0) {
    console.log('⚠️ No hay archivos para procesar');
    return;
  }
  
  if (!messagesRef || !currentUser) {
    console.error('❌ No hay conexión activa');
    showStatus('Error: No hay conexión activa', 'error');
    return;
  }
  
  console.log(`📎 Procesando ${files.length} archivo(s)...`);
  showStatus(`Subiendo ${files.length} archivo(s)...`, 'info');
  
  let processedCount = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      console.log(`📎 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);
      
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        console.warn(`⚠️ Archivo ${file.name} muy grande: ${formatFileSize(file.size)}`);
        showStatus(`${file.name} es muy grande (máx. 2MB)`, 'error');
        continue;
      }
      
      // Convertir a Base64
      const fileData = await fileToBase64(file);
      
      if (!fileData) {
        throw new Error('Error al convertir archivo');
      }
      
      // Preparar datos del mensaje
      const messageData = {
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileData: fileData,
        content: (i === 0 && messageText) ? messageText : '',
        userName: currentUser.name,
        userId: currentUser.id,
        userAvatar: currentUser.avatar,
        userColor: currentUser.color,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Agregar respuesta si existe
      if (replyingTo && i === 0) {
        messageData.replyTo = {
          messageId: replyingTo.messageId,
          userName: replyingTo.userName,
          content: replyingTo.content.substring(0, 100)
        };
      }
      
      // Enviar archivo
      await messagesRef.push(messageData);
      processedCount++;
      console.log(`✅ Archivo enviado: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Error procesando ${file.name}:`, error);
      showStatus(`Error con ${file.name}: ${error.message}`, 'error');
    }
  }
  
  if (replyingTo) {
    cancelReply();
  }
  
  if (processedCount > 0) {
    showStatus(`✅ ${processedCount} archivo(s) enviado(s)`, 'success');
  } else {
    showStatus('❌ No se pudo enviar ningún archivo', 'error');
  }
  
  setTimeout(() => {
    if (currentState === AppState.CHAT) {
      showStatus('Conectado y sincronizado', 'success');
    }
  }, 3000);
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
    sendButton.innerHTML = '<span>⏳</span>Enviando...';
  }
  
  const messageData = {
    type: 'text',
    content: message,
    userName: currentUser.name,
    userId: currentUser.id,
    userAvatar: currentUser.avatar,
    userColor: currentUser.color,
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
      showStatus(`Error al enviar: ${error.message}`, 'error');
    })
    .finally(() => {
      if (sendButton) {
        sendButton.disabled = false;
        sendButton.innerHTML = '<span>🚀</span>Enviar';
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
  showStatus('Listo para comenzar - Ingresa tus datos', 'success');
  
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

// Funciones globales para HTML
window.startReply = startReply;

window.openImageModal = function(imageSrc) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');
  
  if (modal && modalImage) {
    modalImage.src = imageSrc;
    modal.classList.add('active');
    
    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeImageModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
};

window.closeImageModal = function() {
  const modal = document.getElementById('image-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.downloadFile = function(fileData, fileName) {
  try {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus(`Descargando ${fileName}...`, 'success');
  } catch (error) {
    console.error('Error descargando archivo:', error);
    showStatus('Error al descargar archivo', 'error');
  }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM cargado, inicializando ChatFlow...');
  
  if (!initializeFirebase()) {
    showStatus('Error al inicializar la aplicación', 'error');
    return;
  }
  
  changeState(AppState.WELCOME);
  
  // Botones principales
  const joinBtn = document.getElementById('join-btn');
  const createBtn = document.getElementById('create-btn');
  const leaveBtn = document.getElementById('leave-btn');
  const cancelReplyBtn = document.getElementById('cancel-reply');
  
  if (joinBtn) joinBtn.addEventListener('click', () => handleJoinRoom(false));
  if (createBtn) createBtn.addEventListener('click', () => handleJoinRoom(true));
  if (leaveBtn) leaveBtn.addEventListener('click', leaveRoom);
  if (cancelReplyBtn) cancelReplyBtn.addEventListener('click', cancelReply);
  
  // Inputs de bienvenida
  const usernameInput = document.getElementById('username');
  const roomNameInput = document.getElementById('room-name');
  
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (roomNameInput) roomNameInput.focus();
      }
    });
    
    // Auto-focus después de un momento
    setTimeout(() => usernameInput.focus(), 1000);
  }
  
  if (roomNameInput) {
    roomNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
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
      if (e.key === 'Escape' && replyingTo) {
        cancelReply();
      }
    });
    
    // Indicador de escritura (futuro)
    let typingTimeout;
    messageInput.addEventListener('input', () => {
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        // Aquí se podría implementar indicador de "está escribiendo"
      }, 1000);
    });
  }
  
  // Inputs de archivos con debugging mejorado
  const imageInput = document.getElementById('image-input');
  const documentInput = document.getElementById('document-input');
  const fileInput = document.getElementById('file-input');
  
  console.log('🔧 Configurando manejadores de archivos...');
  
  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      console.log('📷 Seleccionadas', e.target.files.length, 'imágenes');
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        processFiles(files, messageText);
      }
      e.target.value = '';
    });
  }
  
  if (documentInput) {
    documentInput.addEventListener('change', function(e) {
      console.log('📄 Seleccionados', e.target.files.length, 'documentos');
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        processFiles(files, messageText);
      }
      e.target.value = '';
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      console.log('📎 Seleccionados', e.target.files.length, 'archivos');
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        processFiles(files, messageText);
      }
      e.target.value = '';
    });
  }
  
  // Cerrar modal de imagen al hacer click fuera
  const imageModal = document.getElementById('image-modal');
  if (imageModal) {
    imageModal.addEventListener('click', (e) => {
      if (e.target === imageModal) {
        closeImageModal();
      }
    });
  }
  
  // Atajos de teclado globales
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter para enviar mensaje rápido
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && currentState === AppState.CHAT) {
      e.preventDefault();
      sendMessage();
    }
    
    // Escape para cancelar respuesta
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      cancelReply();
    }
  });
  
  console.log('🎉 ChatFlow inicializado correctamente');
});

// Manejo de errores y limpieza
window.addEventListener('error', (event) => {
  console.error('❌ Error global:', event.error);
  showStatus('Error inesperado - Recarga la página', 'error');
});

window.addEventListener('beforeunload', () => {
  if (currentUser && participantsRef) {
    participantsRef.child(currentUser.id).remove();
  }
});

// Manejo de visibilidad de la página
document.addEventListener('visibilitychange', () => {
  if (currentUser && participantsRef) {
    if (document.visibilityState === 'visible') {
      // Usuario volvió a la pestaña
      participantsRef.child(currentUser.id).update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      });
    }
  }
});

console.log('📜 ChatFlow cargado completamente - Listo para comunicación moderna');
