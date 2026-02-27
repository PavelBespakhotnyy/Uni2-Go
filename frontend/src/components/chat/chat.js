document.addEventListener('DOMContentLoaded', () => {
    const contactsListEl = document.getElementById('contacts-list');
    const chatHeaderEl = document.getElementById('chat-header');
    const chatMessagesEl = document.getElementById('chat-messages');
    const searchInputEl = document.querySelector('.chat-search-input');

    // Mock data based on the design
    const contacts = [
        { id: 1, name: 'Martina Orobidg', avatar: 'https://ui-avatars.com/api/?name=Martina+Orobidg&background=random' },
        { id: 2, name: 'Carlos Melchor', avatar: 'https://ui-avatars.com/api/?name=Carlos+Melchor&background=random' },
        { id: 3, name: 'Arcadi Martin', avatar: 'https://ui-avatars.com/api/?name=Arcadi+Martin&background=random' },
        { id: 4, name: 'Ariadna Jobani', avatar: 'https://ui-avatars.com/api/?name=Ariadna+Jobani&background=random' },
        { id: 5, name: 'Hugo Ruiz', avatar: 'https://ui-avatars.com/api/?name=Hugo+Ruiz&background=random' },
        { id: 6, name: 'Alba Lopez', avatar: 'https://ui-avatars.com/api/?name=Alba+Lopez&background=random' }
    ];

    const messagesData = {
        // No test messages yet
    };

    let activeContactId = 5; // Default to Hugo Ruiz based on mockup
    let searchQuery = '';

    function renderContacts() {
        contactsListEl.innerHTML = '';
        const filtered = contacts.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

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

    function selectContact(id) {
        activeContactId = id;
        renderContacts();
        renderActiveChat();
    }

    function renderActiveChat() {
        const contact = contacts.find(c => c.id === activeContactId);
        if (!contact) return;

        // Render header
        chatHeaderEl.innerHTML = `
            <div class="chat-contact-avatar">
                <img src="${contact.avatar}" alt="${contact.name}">
            </div>
            <h2>${contact.name}</h2>
        `;

        // Render messages
        chatMessagesEl.innerHTML = '';
        const msgs = messagesData[activeContactId] || [];
        msgs.forEach(msg => {
            const div = document.createElement('div');
            div.className = `chat-message ${msg.type}`;
            div.textContent = msg.text;
            chatMessagesEl.appendChild(div);
        });

        // Scroll to bottom
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // Search functionality
    searchInputEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderContacts();
    });

    // Initialize
    renderContacts();
    renderActiveChat();
});
