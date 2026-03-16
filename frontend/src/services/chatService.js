// chatService.js

class ChatService {
    constructor() {
        this.contacts = [
            { id: 1, name: 'Martina Orobidg', avatar: 'https://ui-avatars.com/api/?name=Martina+Orobidg&background=random' },
            { id: 2, name: 'Carlos Melchor', avatar: 'https://ui-avatars.com/api/?name=Carlos+Melchor&background=random' },
            { id: 3, name: 'Arcadi Martin', avatar: 'https://ui-avatars.com/api/?name=Arcadi+Martin&background=random' },
            { id: 4, name: 'Ariadna Jobani', avatar: 'https://ui-avatars.com/api/?name=Ariadna+Jobani&background=random' },
            { id: 5, name: 'Hugo Ruiz', avatar: 'https://ui-avatars.com/api/?name=Hugo+Ruiz&background=random' },
            { id: 6, name: 'Alba Lopez', avatar: 'https://ui-avatars.com/api/?name=Alba+Lopez&background=random' }
        ];
        
        this.messagesData = {}; // Estructura: { contactId: [ {text, type, timestamp} ] }
        this.onMessageReceived = null; // Callback para avisar a la UI
    }

    getContacts(query = '') {
        return this.contacts.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    getContactById(id) {
        return this.contacts.find(c => c.id === id);
    }

    getMessages(contactId) {
        return this.messagesData[contactId] || [];
    }

    sendMessage(contactId, text) {
        if (!text.trim()) return;

        const newMessage = {
            text: text,
            type: 'sent',
            timestamp: new Date()
        };

        if (!this.messagesData[contactId]) this.messagesData[contactId] = [];
        this.messagesData[contactId].push(newMessage);

        // Simulación de respuesta automática (Tiempo Real Fake)
        setTimeout(() => {
            this.receiveMessage(contactId, "¡Hola! Soy un bot respondiendo en tiempo real.");
        }, 1000);

        return newMessage;
    }

    receiveMessage(contactId, text) {
        const incomingMsg = {
            text: text,
            type: 'received',
            timestamp: new Date()
        };

        if (!this.messagesData[contactId]) this.messagesData[contactId] = [];
        this.messagesData[contactId].push(incomingMsg);

        // Si tenemos un callback configurado, avisamos a la UI
        if (this.onMessageReceived) {
            this.onMessageReceived(contactId, incomingMsg);
        }
    }
}

// Exportamos la instancia para que sea única
export const chatService = new ChatService();