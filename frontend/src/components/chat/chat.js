// chat.js
import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { chatService } from '../../services/chatService.js';
import { getUserProfile } from '../../services/userService.js';

// Seleccionamos los elementos del DOM
const contactsListEl = document.getElementById('contacts-list');
const chatHeaderEl = document.getElementById('chat-header');
const searchInputEl = document.querySelector('.chat-search-input');
const messageInputEl = document.querySelector('.chat-input-field');
const sendBtnEl = document.querySelector('.chat-send-btn');
const chatMessagesEl = document.getElementById('chat-messages');
const searchForm = document.querySelector('.chat-search-container form');

let currentUser = null;
let currentUserProfile = null;
let activeChatId = null;
let activeChatName = '';
let activeChatParticipants = [];

document.addEventListener('DOMContentLoaded', () => {
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("✅ Usuario autenticado:", currentUser.uid);
            
            // Cargar perfil del usuario para tener nombre completo
            try {
                currentUserProfile = await getUserProfile(user.uid);
            } catch (err) {
                console.warn("No se pudo cargar el perfil del usuario:", err);
            }
            
            initChatList();
        } else {
            console.log("❌ Usuario no autenticado");
            window.location.href = "/pages/login.html";
        }
    });

    function initChatList() {
        console.log("Iniciando escucha de chats...");
        
        chatService.listenMyChats(currentUser.uid, (chats) => {
            console.log("📥 Количество загруженных чатов:", chats.length);
            if (!contactsListEl) return;
            contactsListEl.innerHTML = ''; 

            if (chats.length === 0) {
                contactsListEl.innerHTML = '<li class="no-chats">No tienes chats aún</li>';
                return;
            }

            if (chats.length === 0) {
                const emptyLi = document.createElement('li');
                emptyLi.className = 'chat-empty';
                emptyLi.textContent = 'No hay chats aún. Busca un amigo por código.';
                contactsListEl.appendChild(emptyLi);
                return;
            }

            const myName = currentUserProfile 
                ? `${currentUserProfile.name || ''} ${currentUserProfile.surname || ''}`.trim() 
                : (currentUser.displayName || currentUser.email);

            chats.forEach(chat => {
                // Buscamos el nombre del otro participante
                const otherName = chat.participantNames?.find(name => 
                    name !== myName && 
                    name !== currentUser.email && 
                    name !== currentUser.displayName
                ) || "Amigo";
                
                const li = document.createElement('li');
                li.className = `chat-contact-item ${chat.id === activeChatId ? 'active' : ''}`;
                li.setAttribute('data-chat-id', chat.id);
                
                li.addEventListener('click', () => {
                    document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
                    li.classList.add('active');
                    selectContact(chat.id, otherName, chat.participants);
                });

                // Mostrar último mensaje si existe
                const lastMessageText = chat.lastMessage?.text 
                    ? (chat.lastMessage.senderId === currentUser.uid ? 'Tú: ' : '') + chat.lastMessage.text 
                    : 'No hay mensajes aún';
                
                li.innerHTML = `
                    <div class="chat-contact-avatar">
                        <img src="../../public/images/default-avatar.svg" alt="${otherName}">
                    </div>
                    <div class="chat-contact-info">
                        <div class="chat-contact-name">${otherName}</div>
                        <div class="chat-last-message">${lastMessageText}</div>
                    </div>
                    ${chat.unreadCount?.[currentUser.uid] > 0 ? '<span class="chat-unread-badge">' + chat.unreadCount[currentUser.uid] + '</span>' : ''}
                `;
                contactsListEl.appendChild(li);
            });
            
            // Si hay un chat activo, aseguramos que esté seleccionado en la UI
            if (activeChatId) {
                const activeLi = document.querySelector(`[data-chat-id="${activeChatId}"]`);
                if (activeLi) activeLi.classList.add('active');
            }
        });
    }

    function selectContact(chatId, contactName, participants) {
        console.log("📱 Seleccionando chat:", chatId, "con:", contactName);
        activeChatId = chatId;
        activeChatName = contactName;
        activeChatParticipants = participants;

        // Actualizar UI del header
        if (chatHeaderEl) {
            chatHeaderEl.innerHTML = `
                <div class="chat-header-info">
                    <h2>${contactName}</h2>
                    <span class="chat-header-status">En línea</span>
                </div>
            `;
        }
        
        // Limpiar mensajes anteriores
        if (chatMessagesEl) chatMessagesEl.innerHTML = '<div class="chat-loading">Cargando mensajes...</div>';

        // Detener escucha previa de mensajes
        if (window.unsubscribeMessages) {
            window.unsubscribeMessages();
            window.unsubscribeMessages = null;
        }

        // Iniciar escucha de mensajes en tiempo real
        window.unsubscribeMessages = chatService.listenMessages(chatId, (messages) => {
            if (!chatMessagesEl) return;
            
            chatMessagesEl.innerHTML = '';
            
            if (messages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'chat-empty-messages';
                emptyDiv.textContent = 'No hay mensajes aún. ¡Escribe el primero!';
                chatMessagesEl.appendChild(emptyDiv);
                return;
            }
            
            messages.forEach(msg => appendMessageDOM(msg));
            scrollToBottom();
        });
    }

    async function handleSendMessage() {
        const text = messageInputEl?.value.trim();
        
        if (!text) return;
        
        if (!activeChatId) {
            alert("Por favor, selecciona un chat primero");
            return;
        }
        
        if (!currentUser) {
            alert("Error de autenticación");
            return;
        }
        
        try {
            const senderName = currentUserProfile 
                ? `${currentUserProfile.name || ''} ${currentUserProfile.surname || ''}`.trim() 
                : (currentUser.displayName || currentUser.email);

            await chatService.sendMessage(activeChatId, text, currentUser.uid, activeChatParticipants, senderName);
            if (messageInputEl) messageInputEl.value = '';
            console.log("✅ Mensaje enviado al chat:", activeChatId);
        } catch (error) {
            console.error("❌ Error al enviar:", error);
            alert("Error al enviar mensaje: " + error.message);
        }
    }

    function appendMessageDOM(msg) {
        if (!chatMessagesEl || !currentUser) return;

        const div = document.createElement('div');
        const type = msg.senderId === currentUser.uid ? 'sent' : 'received';
        
        div.className = `chat-message ${type}`;
        
        // Formatear hora
        const time = msg.timestamp?.toDate 
            ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        
        div.innerHTML = `
            <div class="chat-message-content">${msg.text || msg.messageText || ''}</div>
            <div class="chat-message-time">${time}</div>
        `;

        chatMessagesEl.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        if (chatMessagesEl) {
            setTimeout(() => {
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }, 100);
        }
    }

    // Búsqueda de usuario por código
    searchForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = searchInputEl?.value.trim();
        
        if (!code) {
            alert("Por favor, ingresa un código");
            return;
        }
        
        if (!currentUser) {
            alert("Error de autenticación");
            return;
        }
        
        const searchBtn = searchForm.querySelector('button[type="submit"]');
        const originalText = searchBtn?.textContent;
        
        try {
            if (searchBtn) {
                searchBtn.disabled = true;
                searchBtn.textContent = 'Buscando...';
            }
            
            console.log("🔍 Buscando código:", code);
            const chatId = await chatService.createChatByCode(code, currentUser);
            
            if (searchInputEl) searchInputEl.value = '';
            
            // Obtener información del contacto para abrir el chat
            const chatInfo = await chatService.getChatInfo(chatId);
            if (chatInfo) {
                const myName = currentUserProfile 
                    ? `${currentUserProfile.name || ''} ${currentUserProfile.surname || ''}`.trim() 
                    : (currentUser.displayName || currentUser.email);

                const otherName = chatInfo.participantNames?.find(name => 
                    name !== myName && 
                    name !== currentUser.email && 
                    name !== currentUser.displayName
                ) || "Nuevo Amigo";
                
                // Передаем весь массив участников
                selectContact(chatId, otherName, chatInfo.participants);
            }
            
            alert("✅ ¡Chat creado exitosamente!");
            
        } catch (error) {
            console.error("❌ Error en búsqueda:", error);
            alert(error.message || "Error al buscar usuario");
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = originalText || 'Buscar';
            }
        }
    });

    // Eventos de envío de mensajes
    sendBtnEl?.addEventListener('click', handleSendMessage);
    
    messageInputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    const initEvents = () => {
    console.log("Asignando eventos de botones...");
    
    // Botón de enviar
    if (sendBtnEl) {
        sendBtnEl.onclick = () => {
            console.log("Clic en botón enviar detectado");
            handleSendMessage();
        };
    } else {
        console.error("No se encontró el botón .chat-send-btn");
    }

    // Tecla Enter
    if (messageInputEl) {
        messageInputEl.onkeypress = (e) => {
            if (e.key === 'Enter') {
                console.log("Enter detectado");
                handleSendMessage();
            }
        };
    }
};

});
//29910128