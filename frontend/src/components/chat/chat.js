// chat.js
import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { chatService } from '../../services/chatService.js';
import { friendsService } from '../../services/friendsService.js';
import { getUserProfile } from '../../services/userService.js';

// Seleccionamos los elementos del DOM
const contactsListEl = document.getElementById('contacts-list');
const chatHeaderEl = document.getElementById('chat-header');
const searchInputEl = document.querySelector('.chat-search-input');
const messageInputEl = document.querySelector('.chat-input-field');
const sendBtnEl = document.querySelector('.chat-send-btn');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputAreaEl = document.querySelector('.chat-input-area');
const searchForm = document.querySelector('.chat-search-container form');

let currentUser = null;
let currentUserProfile = null;
let activeChatId = null;
let activeChatName = '';
let activeChatParticipants = [];
let allChats = [];
let allFriends = [];

document.addEventListener('DOMContentLoaded', () => {
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("Usuario autenticado:", currentUser.uid);
            
            // Cargar perfil del usuario para tener nombre completo
            try {
                currentUserProfile = await getUserProfile(user.uid);
            } catch (err) {
                console.warn("No se pudo cargar el perfil del usuario:", err);
            }
            
            initChatList();
        } else {
            console.log("Usuario no autenticado");
            window.location.href = "/pages/login.html";
        }
    });

    let autoOpenedChatId = null;

    async function initChatList() {
        console.log("Iniciando escucha de chats...");
        
        // Ocultar input area inicialmente
        if (chatInputAreaEl) chatInputAreaEl.style.display = 'none';

        // Obtener amigos para el buscador
        try {
            allFriends = await friendsService.getFriends(currentUser.uid);
        } catch (err) {
            console.warn("Error al cargar amigos:", err);
        }

        chatService.listenMyChats(currentUser.uid, (chats) => {
            allChats = chats;
            updateContactsUI();

            // Handle URL parameter to open specific chat only once
            const urlParams = new URLSearchParams(window.location.search);
            const chatIdParam = urlParams.get('id');
            
            if (chatIdParam && !activeChatId && !autoOpenedChatId) {
                const targetChat = chats.find(c => c.id === chatIdParam);
                if (targetChat) {
                    autoOpenedChatId = chatIdParam;
                    const myName = currentUserProfile 
                        ? `${currentUserProfile.name || ''} ${currentUserProfile.surname || ''}`.trim() 
                        : (currentUser.displayName || currentUser.email);

                    const otherName = targetChat.participantNames?.find(name => 
                        name !== myName && 
                        name !== currentUser.email && 
                        name !== currentUser.displayName
                    ) || "Amigo";
                    
                    selectContact(targetChat.id, otherName, targetChat.participants);
                }
            }
        });
    }

    function updateContactsUI() {
        if (!contactsListEl) return;
        const searchTerm = searchInputEl?.value.toLowerCase().trim() || '';
        contactsListEl.innerHTML = '';

        const myName = currentUserProfile 
            ? `${currentUserProfile.name || ''} ${currentUserProfile.surname || ''}`.trim() 
            : (currentUser.displayName || currentUser.email);

        // 1. Filtrar chats existentes
        const filteredChats = allChats.filter(chat => {
            const otherName = chat.participantNames?.find(name => 
                name !== myName && 
                name !== currentUser.email && 
                name !== currentUser.displayName
            ) || "Amigo";
            return otherName.toLowerCase().includes(searchTerm);
        });

        // 2. Filtrar amigos que NO tienen chat aún (solo si hay término de búsqueda)
        let friendSuggestions = [];
        if (searchTerm) {
            friendSuggestions = allFriends.filter(friend => {
                const fullName = `${friend.name} ${friend.surname}`.toLowerCase();
                const matchesName = fullName.includes(searchTerm) || friend.username?.toLowerCase().includes(searchTerm);
                // Verificar si ya existe un chat con este amigo
                const alreadyHasChat = allChats.some(chat => chat.participants.includes(friend.uid));
                return matchesName && !alreadyHasChat;
            });
        }

        if (filteredChats.length === 0 && friendSuggestions.length === 0 && searchTerm) {
            contactsListEl.innerHTML = '<li class="no-chats">No se encontraron resultados</li>';
            renderInitialState(allFriends, allChats);
            return;
        }

        // Renderizar chats existentes
        filteredChats.forEach(chat => {
            const otherName = chat.participantNames?.find(name => 
                name !== myName && 
                name !== currentUser.email && 
                name !== currentUser.displayName
            ) || "Amigo";
            
            const li = createContactLi(chat.id, otherName, chat.participants, chat.lastMessage, chat.unreadCount?.[currentUser.uid], false);
            contactsListEl.appendChild(li);
        });

        // Renderizar sugerencias de amigos
        friendSuggestions.forEach(friend => {
            const friendName = `${friend.name} ${friend.surname}`.trim();
            const li = createContactLi(null, friendName, [currentUser.uid, friend.uid], null, 0, true, friend.uid);
            contactsListEl.appendChild(li);
        });

        // Manejar estado inicial si no hay búsqueda
        if (!searchTerm && !activeChatId) {
            renderInitialState(allFriends, allChats);
        }
        
        // Mantener activo el seleccionado
        if (activeChatId) {
            const activeLi = document.querySelector(`[data-chat-id="${activeChatId}"]`);
            if (activeLi) activeLi.classList.add('active');
        }
    }

    function createContactLi(chatId, otherName, participants, lastMessage, unreadCount, isFriendSuggestion, friendUid = null) {
        const li = document.createElement('li');
        li.className = `chat-contact-item ${chatId === activeChatId ? 'active' : ''}`;
        if (chatId) li.setAttribute('data-chat-id', chatId);
        
        li.addEventListener('click', async (e) => {
            if (e.target.closest('.group-menu-btn') || e.target.closest('.group-submenu')) return;
            
            document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');

            if (isFriendSuggestion) {
                try {
                    // Crear chat automáticamente al hacer clic en un amigo buscado
                    const newChatId = await chatService.createChatWithUser(friendUid, currentUser);
                    selectContact(newChatId, otherName, participants);
                } catch (err) {
                    console.error("Error al crear chat con amigo:", err);
                    alert("No se pudo iniciar el chat");
                }
            } else {
                selectContact(chatId, otherName, participants);
            }
        });

        const lastMessageText = isFriendSuggestion 
            ? '<span style="color: #0056FF">Amigo (clic para chatear)</span>'
            : lastMessage?.text 
                ? (lastMessage.senderId === currentUser.uid ? 'Tú: ' : '') + lastMessage.text 
                : 'No hay mensajes aún';
        
        li.innerHTML = `
            <div class="chat-contact-avatar">
                <img src="../public/images/av5c8336583e291842624 1.svg" alt="${otherName}">
            </div>
            <div class="chat-contact-info">
                <div class="chat-contact-name">${otherName}</div>
                <div class="chat-last-message">${lastMessageText}</div>
            </div>
            ${unreadCount > 0 ? '<span class="chat-unread-badge">' + unreadCount + '</span>' : ''}
            ${!isFriendSuggestion ? `
                <button class="group-menu-btn" title="Opciones">
                    <i class="bx bx-dots-vertical-rounded"></i>
                </button>
                <div class="group-submenu">
                    <button class="submenu-item delete">
                        <i class="bx bx-trash"></i> Eliminar chat
                    </button>
                </div>
            ` : ''}
        `;

        if (!isFriendSuggestion) {
            const menuBtn = li.querySelector('.group-menu-btn');
            const submenu = li.querySelector('.group-submenu');
            
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.group-submenu.active').forEach(m => {
                    if (m !== submenu) m.classList.remove('active');
                });
                submenu.classList.toggle('active');
            });

            li.querySelector('.submenu-item.delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`¿Estás seguro de que deseas eliminar el chat con ${otherName}?`)) {
                    try {
                        const idToDelete = chatId;
                        if (activeChatId === idToDelete) {
                            activeChatId = null;
                        }
                        await chatService.deleteChat(idToDelete);
                    } catch (err) {
                        console.error("Error al eliminar chat:", err);
                        alert("No se pudo eliminar el chat");
                    }
                }
            });
        }

        return li;
    }

    function renderInitialState(friends, chats) {
        if (!chatMessagesEl) return;
        
        // Limpiar header y quitar borde
        if (chatHeaderEl) {
            chatHeaderEl.innerHTML = '';
            chatHeaderEl.style.borderBottom = 'none';
        }
        
        let content = '';
        
        if (friends.length === 0 && chats.length === 0) {
            // Escenario 1: Sin amigos y sin chats
            content = `
                <div class="chat-empty-state">
                    <div class="empty-state-emoji">🥺</div>
                    <h2>Parece que no tienes amigos aún...</h2>
                    <p>¡Añade amigos para empezar a chatear!</p>
                    <a href="./friends.html" class="empty-state-btn">Ir a Amigos</a>
                </div>
            `;
        } else if (friends.length > 0 && chats.length === 0) {
            // Escenario 2: Tiene amigos pero sin chats
            content = `
                <div class="chat-empty-state clickable-state" id="start-chat-state">
                    <div class="empty-state-icons">
                        <i class='bx bx-plus'></i>
                        <i class='bx bx-conversation'></i>
                    </div>
                    <h2>Empieza un chat</h2>
                    <p>Busca a tus amigos arriba a la izquierda para empezar a hablar.</p>
                </div>
            `;
            setTimeout(() => {
                document.getElementById('start-chat-state')?.addEventListener('click', () => {
                    searchInputEl?.focus();
                    // Efecto visual para resaltar el buscador
                    const searchContainer = document.querySelector('.chat-search-container');
                    searchContainer?.classList.add('highlight-search');
                    setTimeout(() => searchContainer?.classList.remove('highlight-search'), 2000);
                });
            }, 100);
        } else {
            // Escenario 3: Tiene amigos y chats
            content = `
                <div class="chat-empty-state">
                    <div class="empty-state-icons">
                        <i class='bx bx-plus'></i>
                        <i class='bx bx-conversation'></i>
                    </div>
                    <h2>Selecciona un chat</h2>
                    <p>¡Tus amigos están esperando!</p>
                </div>
            `;
        }
        
        chatMessagesEl.innerHTML = content;
        if (chatInputAreaEl) chatInputAreaEl.style.display = 'none';
    }

    function selectContact(chatId, contactName, participants) {
        console.log("Seleccionando chat:", chatId, "con:", contactName);
        activeChatId = chatId;
        activeChatName = contactName;
        activeChatParticipants = participants;

        // Mostrar el área de input y restaurar borde al seleccionar un chat
        if (chatInputAreaEl) chatInputAreaEl.style.display = 'flex';
        if (chatHeaderEl) chatHeaderEl.style.borderBottom = '2px solid #d1d1d1';

        // Actualizar UI del header
        if (chatHeaderEl) {
            chatHeaderEl.innerHTML = `
                <div class="chat-contact-avatar">
                    <img src="../public/images/av5c8336583e291842624 1.svg" alt="${contactName}">
                </div>
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
            console.log("Mensaje enviado al chat:", activeChatId);
        } catch (error) {
            console.error("Error al enviar:", error);
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
            
            console.log("Buscando código:", code);
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
            console.error("Error en búsqueda:", error);
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

    // Evento de búsqueda en tiempo real
    searchInputEl?.addEventListener('input', () => {
        updateContactsUI();
    });

    // Cerrar submenús al hacer clic fuera
    document.addEventListener('click', () => {
        document.querySelectorAll('.group-submenu.active').forEach(m => m.classList.remove('active'));
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
