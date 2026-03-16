// chat.js
import { chatService } from '../../services/chatService.js';

document.addEventListener('DOMContentLoaded', () => {
    const contactsListEl = document.getElementById('contacts-list');
    const chatHeaderEl = document.getElementById('chat-header');
    const searchInputEl = document.querySelector('.chat-search-input');
    const messageInputEl = document.querySelector('.chat-input-field');
    const sendBtnEl = document.querySelector('.chat-send-btn');
    const chatMessagesEl = document.getElementById('chat-messages'); // Asegúrate de tener este ID

    let activeContactId = 5;

    // --- Renderizado ---

    function renderContacts(query = '') {
        contactsListEl.innerHTML = '';
        const filtered = chatService.getContacts(query);

        filtered.forEach(contact => {
            const li = document.createElement('li');
            li.className = `chat-contact-item ${contact.id === activeContactId ? 'active' : ''}`;
            li.onclick = () => selectContact(contact.id);
            li.innerHTML = `
                <div class="chat-contact-avatar">
                    <img src="${contact.avatar}" alt="${contact.name}">
                </div>
                <div class="chat-contact-name">${contact.name}</div>
            `;
            contactsListEl.appendChild(li);
        });
    }

    function renderActiveChat() {
        const contact = chatService.getContactById(activeContactId);
        if (!contact) return;

        // Header
        chatHeaderEl.innerHTML = `
            <div class="chat-contact-avatar">
                <img src="${contact.avatar}" alt="${contact.name}">
            </div>
            <h2>${contact.name}</h2>
        `;

        // Limpiar y renderizar mensajes
        chatMessagesEl.innerHTML = '';
        const msgs = chatService.getMessages(activeContactId);
        msgs.forEach(msg => appendMessageDOM(msg));
        
        scrollToBottom();
    }

    function appendMessageDOM(msg) {
    const chatMessagesEl = document.getElementById('chat-messages');
    
    if (!chatMessagesEl) {
        console.error("Error: No se encontró el elemento #chat-messages en el HTML");
        return;
    }

    const div = document.createElement('div');
    // IMPORTANTE: Asegúrate de que msg.type devuelva 'sent' o 'received'
    div.className = `chat-message ${msg.type}`; 
    div.textContent = msg.text;

    chatMessagesEl.appendChild(div);

    // Auto-scroll al último mensaje
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

    // --- Acciones ---

    function selectContact(id) {
        activeContactId = id;
        renderContacts(searchInputEl.value);
        renderActiveChat();
    }

    function handleSendMessage() {
        const text = messageInputEl.value;
        if (text) {
            const msg = chatService.sendMessage(activeContactId, text);
            appendMessageDOM(msg);
            messageInputEl.value = '';
        }
    }

    function scrollToBottom() {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // --- Eventos ---

    // Escuchar mensajes entrantes desde el servicio
    chatService.onMessageReceived = (contactId, msg) => {
        if (contactId === activeContactId) {
            appendMessageDOM(msg);
        } else {
            console.log(`Nuevo mensaje de un contacto no activo (ID: ${contactId})`);
        }
    };

    searchInputEl.addEventListener('input', (e) => {
        renderContacts(e.target.value);
    });

    sendBtnEl?.addEventListener('click', handleSendMessage);

    messageInputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    // Inicialización
    renderContacts();
    renderActiveChat();
});