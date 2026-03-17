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
    console.log("Archivo chat.js cargado correctamente");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Usuario autenticado:", currentUser.uid);
            initChatList();
        }
    });

    function initChatList() {
        console.log("Iniciando escucha de chats...");
        
        chatService.listenMyChats(currentUser.uid, (chats) => {
            if (!contactsListEl) return;
            contactsListEl.innerHTML = ''; 

            if (chats.length === 0) {
                contactsListEl.innerHTML = '<li class="no-chats">No tienes chats aún</li>';
                return;
            }

            chats.forEach(chat => {
                // CAMBIO CLAVE: En lugar de buscar por nombre del DOM, 
                // buscamos la POSICIÓN de nuestro ID en el array de participantes
                const myIndex = chat.participants.indexOf(currentUser.uid);
                
                // El "otro" índice será 0 si el mío es 1, o 1 si el mío es 0
                const otherIndex = myIndex === 0 ? 1 : 0;
                
                // Obtenemos el nombre del amigo usando ese índice
                const otherName = chat.participantNames[otherIndex] || "Amigo";
                
                const li = document.createElement('li');
                li.className = `chat-contact-item ${chat.id === activeChatId ? 'active' : ''}`;
                
                li.addEventListener('click', () => {
                    document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
                    li.classList.add('active');
                    selectContact(chat.id, otherName);
                });

                li.innerHTML = `
                    <div class="chat-contact-avatar">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=random" alt="${otherName}">
                    </div>
                    <div class="chat-contact-name">${otherName}</div>
                `;
                contactsListEl.appendChild(li);
            });
            console.log("Lista de chats renderizada:", chats.length);
        });
    }

    function selectContact(chatId, contactName) {
        console.log("Intentando seleccionar chat con ID:", chatId); // ESTE LOG ES VITAL
        if (!chatId) {
            console.error("Error: El ID del chat que llegó a selectContact es inválido o undefined");
            return;
        }
    
    activeChatId = chatId; // <--- Aquí se asigna el ID global
    console.log("Chat seleccionado:", activeChatId);

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
    const text = messageInputEl.value;
    
    // DEBUG: Mira esto en la consola del navegador (F12)
    console.log("DATOS A ENVIAR:");
    console.log("- Chat ID:", activeChatId);
    console.log("- Texto:", text);
    console.log("- User ID:", currentUser?.uid);

    if (activeChatId && text && currentUser?.uid) {
        await chatService.sendMessage(activeChatId, text, currentUser.uid);
        messageInputEl.value = '';
    } else {
        console.warn("Faltan datos críticos para enviar el mensaje");
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