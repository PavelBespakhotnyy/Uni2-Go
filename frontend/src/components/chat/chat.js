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
    const myIndex = chat.participants.indexOf(currentUser.uid);
    const otherIndex = myIndex === 0 ? 1 : 0;
    const otherName = chat.participantNames[otherIndex] || "Amigo";
    
    const li = document.createElement('li');
    li.className = `chat-contact-item ${chat.id === activeChatId ? 'active' : ''}`;
    
    // Contenido principal del contacto
    li.innerHTML = `
        <div class="chat-contact-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=random" alt="${otherName}">
        </div>
        <div class="chat-contact-name">${otherName}</div>
    `;

    // 1. Crear el botón de menú (tres puntos)
    const menuBtn = document.createElement('button');
    menuBtn.className = 'group-menu-btn';
    menuBtn.innerHTML = '<i class="bx bx-dots-vertical-rounded"></i>';

    // 2. Crear el submenú
    const submenu = document.createElement('div');
    submenu.className = 'group-submenu';
    submenu.innerHTML = `
        <button class="submenu-item delete action-delete">Eliminar</button>
    `;

    // EVENTOS
    li.addEventListener('click', () => {
        document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        selectContact(chat.id, otherName);
    });

    menuBtn.onclick = (e) => {
        e.stopPropagation(); // Evita que se abra el chat al tocar los puntos
        document.querySelectorAll('.group-submenu').forEach(m => {
            if (m !== submenu) m.classList.remove('active');
        });
        submenu.classList.toggle('active');
    };

    submenu.querySelector('.action-delete').onclick = async (e) => {
        e.stopPropagation();
        if(confirm('¿Seguro que quieres eliminar este chat?')) {
            // Aquí llamarías a una función de chatService para borrar de Firebase
            // await chatService.deleteChat(chat.id); 
            console.log("Eliminando chat:", chat.id);
        }
    };

    // CONSTRUCCIÓN FINAL: Añadimos todo al LI y el LI a la lista
    li.appendChild(menuBtn);
    li.appendChild(submenu);
    contactsListEl.appendChild(li); 

    submenu.querySelector('.action-delete').onclick = async (e) => {
    e.stopPropagation(); // Evita abrir el chat
    submenu.classList.remove('active'); // Cierra la ventanita

    const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar el chat con ${otherName}? Esta acción no se puede deshacer.`);
    
    if (confirmDelete) {
        try {
            // Llamamos al servicio para borrar de Firebase
            await chatService.deleteChat(chat.id);
            
            // Si el chat que borramos era el que estaba abierto, limpiamos la pantalla
            if (activeChatId === chat.id) {
                activeChatId = null;
                chatHeaderEl.innerHTML = '<h2>Selecciona un chat</h2>';
                chatMessagesEl.innerHTML = '';
                if (window.unsubscribeMessages) window.unsubscribeMessages();
            }
            
            alert('Chat eliminado correctamente.');
        } catch (error) {
            alert('No se pudo eliminar el chat: ' + error.message);
        }
    }
};
});
        });
    }

    function selectContact(chatId, contactName) {
        console.log("Intentando seleccionar chat con ID:", chatId); // ESTE LOG ES VITAL
        if (!chatId) {
            console.error("Error: El ID del chat que llegó a selectContact es inválido o undefined");
            return;
        }
    
    activeChatId = chatId; // <--- Aquí se asigna el ID global

        // Actualizar UI
        chatHeaderEl.innerHTML = `
                    <div class="chat-contact-avatar">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=random" alt="${contactName}">
                    </div>
                    <h2>${contactName}</h2>`;
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