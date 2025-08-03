console.log('🚀 Iniciando Chat Ultra Épico Dark Mode con Archivos...');

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

// Función para obtener icono según tipo de archivo
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
    console.log(`🔄 Iniciando conversión de ${file.name} (${formatFileSize(file.size)}) a Base64...`);
    
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
        console.log(`📊 Progreso ${file.name}: ${percentComplete.toFixed(1)}%`);
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
    chatContainer.innerHTML = '<div class="system-message">¡Sé el primero en escribir o compartir archivos! 💬📎</div>';
    return;
  }
  
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    
    if (msg.type === 'system') {
      messageDiv.className = 'system-message';
      messageDiv.textContent = msg.content;
    } else {
      const isOwn = msg.userId === currentUser.id;
      messageDiv.className = `message ${isOwn ? 'own' : 'other'} ${msg.type === 'file' ? 'file' : ''}`;
      messageDiv.setAttribute('data-message-id', msg.id);
      
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      
      let quotedHtml = '';
      if (msg.replyTo) {
        quotedHtml = `
          <div class="quoted-message">
            <div class="quoted-author">📝 ${msg.replyTo.userName}</div>
            <div class="quoted-content">${escapeHtml(msg.replyTo.content)}</div>
          </div>
        `;
      }
      
      let contentHtml = '';
      
      if (msg.type === 'file') {
        // Mensaje de archivo
        const fileIcon = getFileIcon(msg.fileName);
        
        if (msg.fileType && msg.fileType.startsWith('image/')) {
          // Imagen
          contentHtml = `
            <div class="file-preview">
              <div class="file-icon">${fileIcon}</div>
              <div class="file-info">
                <div class="file-name">${escapeHtml(msg.fileName)}</div>
                <div class="file-size">${formatFileSize(msg.fileSize || 0)}</div>
              </div>
            </div>
            <img class="image-preview" src="${msg.fileData}" alt="${escapeHtml(msg.fileName)}" onclick="openImageModal('${msg.fileData}')">
          `;
        } else {
          // Otros archivos
          contentHtml = `
            <div class="file-preview">
              <div class="file-icon">${fileIcon}</div>
              <div class="file-info">
                <div class="file-name">${escapeHtml(msg.fileName)}</div>
                <div class="file-size">${formatFileSize(msg.fileSize || 0)}</div>
              </div>
              <button class="file-download" onclick="downloadFile('${msg.fileData}', '${escapeHtml(msg.fileName)}')">⬇️ Descargar</button>
            </div>
          `;
        }
        
        if (msg.content && msg.content.trim()) {
          contentHtml += `<div class="message-content">${escapeHtml(msg.content)}</div>`;
        }
      } else {
        // Mensaje de texto normal
        contentHtml = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
      }
      
      messageDiv.innerHTML = `
        <div class="message-header">
          <span>${isOwn ? 'Tú' : (msg.userName || 'Usuario')}</span>
          ${!isOwn ? `<button class="reply-btn" onclick="startReply('${msg.id}', '${escapeHtml(msg.userName)}', '${escapeHtml(msg.content || msg.fileName || 'archivo')}')">↩️ Responder</button>` : ''}
        </div>
        ${quotedHtml}
        ${contentHtml}
        <div class="message-time">${timestamp}</div>
      `;
      
      // Agregar evento de doble click para respuesta rápida
      if (!isOwn) {
        messageDiv.addEventListener('dblclick', () => {
          startReply(msg.id, msg.userName, msg.content || msg.fileName || 'archivo');
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

// Función para procesar archivos
async function processFiles(files, messageText = '') {
  if (!files || files.length === 0) {
    console.log('⚠️ No hay archivos para procesar');
    return;
  }
  
  if (!messagesRef || !currentUser) {
    console.error('❌ No hay conexión activa para enviar archivos');
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
      
      // Validar tamaño (máximo 2MB por archivo - reducido para mejor rendimiento)
      if (file.size > 2 * 1024 * 1024) {
        console.warn(`⚠️ Archivo ${file.name} muy grande: ${formatFileSize(file.size)}`);
        showStatus(`${file.name} es muy grande (máx. 2MB)`, 'error');
        continue;
      }
      
      // Convertir a Base64
      console.log(`🔄 Convirtiendo ${file.name} a Base64...`);
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
        content: (i === 0 && messageText) ? messageText : '', // Solo en el primer archivo
        userName: currentUser.name,
        userId: currentUser.id,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      // Agregar información de respuesta si existe (solo en el primer archivo)
      if (replyingTo && i === 0) {
        messageData.replyTo = {
          messageId: replyingTo.messageId,
          userName: replyingTo.userName,
          content: replyingTo.content.substring(0, 100)
        };
      }
      
      // Enviar archivo
      console.log(`📤 Enviando archivo a Firebase: ${file.name}`);
      await messagesRef.push(messageData);
      
      processedCount++;
      console.log(`✅ Archivo enviado exitosamente: ${file.name}`);
      
    } catch (error) {
      console.error(`❌ Error procesando ${file.name}:`, error);
      showStatus(`Error con ${file.name}: ${error.message}`, 'error');
    }
  }
  
  // Cancelar respuesta después de enviar
  if (replyingTo) {
    cancelReply();
  }
  
  if (processedCount > 0) {
    showStatus(`✅ ${processedCount} archivo(s) enviado(s)!`, 'success');
    console.log(`🎉 Proceso completado: ${processedCount}/${files.length} archivos enviados`);
  } else {
    showStatus('❌ No se pudo enviar ningún archivo', 'error');
  }
  
  // Limpiar estado después de 3 segundos
  setTimeout(() => {
    if (currentState === AppState.CHAT) {
      showStatus('', 'info');
    }
  }, 3000);
}

// Función para enviar mensaje de texto
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
      content: replyingTo.content.substring(0, 100)
    };
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
  showStatus('Listo para crear o unirse a una sala! 🎉', 'success');
  
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
  }
};

window.closeImageModal = function() {
  const modal = document.getElementById('image-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.downloadFile = function(fileData, fileName) {
  const link = document.createElement('a');
  link.href = fileData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM cargado, inicializando aplicación...');
  
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
      if (e.key === 'Enter') roomNameInput.focus();
    });
  }
  
  if (roomNameInput) {
    roomNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleJoinRoom(false);
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
  
  // Inputs de archivos con debugging
  const imageInput = document.getElementById('image-input');
  const documentInput = document.getElementById('document-input');
  const fileInput = document.getElementById('file-input');
  
  console.log('🔧 Configurando event listeners de archivos...');
  console.log('📷 Image input encontrado:', !!imageInput);
  console.log('📄 Document input encontrado:', !!documentInput);
  console.log('📎 File input encontrado:', !!fileInput);
  
  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      console.log('📷 Image input change event triggered');
      console.log('Files selected:', e.target.files.length);
      
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        
        console.log(`📷 Procesando ${files.length} imágenes...`);
        processFiles(files, messageText);
      }
      e.target.value = ''; // Reset input
    });
    console.log('✅ Image input listener configurado');
  } else {
    console.error('❌ No se encontró image-input');
  }
  
  if (documentInput) {
    documentInput.addEventListener('change', function(e) {
      console.log('📄 Document input change event triggered');
      console.log('Files selected:', e.target.files.length);
      
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        
        console.log(`📄 Procesando ${files.length} documentos...`);
        processFiles(files, messageText);
      }
      e.target.value = ''; // Reset input
    });
    console.log('✅ Document input listener configurado');
  } else {
    console.error('❌ No se encontró document-input');
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      console.log('📎 File input change event triggered');
      console.log('Files selected:', e.target.files.length);
      
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        const messageText = messageInput ? messageInput.value.trim() : '';
        if (messageInput) messageInput.value = '';
        
        console.log(`📎 Procesando ${files.length} archivos...`);
        processFiles(files, messageText);
      }
      e.target.value = ''; // Reset input
    });
    console.log('✅ File input listener configurado');
  } else {
    console.error('❌ No se encontró file-input');
  }
  
  // Cerrar modal al hacer click fuera de la imagen
  const imageModal = document.getElementById('image-modal');
  if (imageModal) {
    imageModal.addEventListener('click', (e) => {
      if (e.target === imageModal) {
        closeImageModal();
      }
    });
  }
  
  // Focus inicial
  setTimeout(() => {
    if (usernameInput) usernameInput.focus();
  }, 500);
  
  console.log('🎉 Aplicación Dark Mode con archivos inicializada');
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

console.log('📜 Cliente Dark Mode con archivos cargado completamente');
