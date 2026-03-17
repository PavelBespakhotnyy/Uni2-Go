// chat.js
import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { chatService } from '../../services/chatService.js';

// Seleccionamos los elementos del DOM
const contactsListEl = document.getElementById('contacts-list');
const chatHeaderEl = document.getElementById('chat-header');
const searchInputEl = document.querySelector('.chat-search-input');
const messageInputEl = document.querySelector('.chat-input-field');
const sendBtnEl = document.querySelector('.chat-send-btn');
const chatMessagesEl = document.getElementById('chat-messages');
const searchForm = document.querySelector('.chat-search-container form');

let currentUser = null;
let activeChatId = null; // Esta variable solo cambiará al hacer clic

document.addEventListener('DOMContentLoaded', () => {
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Usuario autenticado:", currentUser.uid);
            initChatList();
        }
    });

    function initChatList() {
        chatService.listenMyChats(currentUser.uid, (chats) => {
            if (!contactsListEl) return;
            contactsListEl.innerHTML = '';

            chats.forEach(chat => {
                // Buscamos el nombre del otro participante
                const otherName = chat.participantNames.find(name => name !== currentUser.displayName) || "Amigo";
                
                // IMPORTANTE: No asignamos activeChatId aquí arriba, 
                // sino que pasamos chat.id directamente al evento click
                const li = document.createElement('li');
                li.className = `chat-contact-item ${chat.id === activeChatId ? 'active' : ''}`;
                
                li.addEventListener('click', () => {
                    // Quitamos la clase active de los otros y se la damos al seleccionado
                    document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
                    li.classList.add('active');
                    
                    // LLAMADA CORRECTA: Usamos chat.id
                    selectContact(chat.id, otherName);
                });

                li.innerHTML = `
                    <div class="chat-contact-avatar">
                        <img src="../../public/images/default-avatar.svg" alt="${otherName}">
                    </div>
                    <div class="chat-contact-name">${otherName}</div>
                `;
                contactsListEl.appendChild(li);
            });
        });
    }

    function selectContact(chatId, contactName) {
        console.log("Seleccionando chat:", chatId);
        activeChatId = chatId; // Aquí es donde se guarda el ID para enviar mensajes

        // Actualizar UI
        chatHeaderEl.innerHTML = `<h2>${contactName}</h2>`;
        chatMessagesEl.innerHTML = '';

        // Detener escucha previa de mensajes
        if (window.unsubscribeMessages) window.unsubscribeMessages();

        // Iniciar escucha de mensajes en tiempo real para EL CHAT SELECCIONADO
        window.unsubscribeMessages = chatService.listenMessages(chatId, (messages) => {
            chatMessagesEl.innerHTML = ''; 
            messages.forEach(msg => appendMessageDOM(msg));
            scrollToBottom();
        });
    }

    async function handleSendMessage() {
        const text = messageInputEl.value.trim();
        
        if (text && activeChatId) {
            try {
                await chatService.sendMessage(activeChatId, text, currentUser.uid);
                messageInputEl.value = '';
                console.log("Mensaje enviado al chat:", activeChatId);
            } catch (error) {
                console.error("Error al enviar:", error);
            }
        } else if (!activeChatId) {
            alert("Por favor, selecciona un chat primero");
        }
    }

    function appendMessageDOM(msg) {
        if (!chatMessagesEl) return;

        const div = document.createElement('div');
        // Comparamos el senderId para saber si la burbuja es 'sent' o 'received'
        const type = msg.senderId === currentUser.uid ? 'sent' : 'received';
        
        div.className = `chat-message ${type}`; 
        div.textContent = msg.text;

        chatMessagesEl.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // Eventos
    searchForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = searchInputEl.value.trim();
        try {
            const chatId = await chatService.createChatByCode(code, currentUser);
            searchInputEl.value = '';
            // Opcional: abrir el chat automáticamente al crearlo
            // selectContact(chatId, "Nuevo Amigo"); 
        } catch (error) {
            alert(error.message);
        }
    });

    sendBtnEl?.addEventListener('click', handleSendMessage);
    messageInputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
});