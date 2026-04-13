import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { chatService } from '../services/chatService.js';
import { friendsService } from '../services/friendsService.js';
import Layout from '../components/Layout.jsx';
import '../components/chat/style.css';

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatName, setActiveChatName] = useState('');
  const [activeChatParticipants, setActiveChatParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubMessagesRef = useRef(null);
  const autoOpenedRef = useRef(null);

  const myName = profile
    ? `${profile.name || ''} ${profile.surname || ''}`.trim()
    : (user?.email || '');

  useEffect(() => {
    if (!user) return;
    friendsService.getFriends(user.uid).then(setFriends).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = chatService.listenMyChats(user.uid, (newChats) => {
      setChats(newChats);

      const chatIdParam = searchParams.get('id') || searchParams.get('chatId');
      if (chatIdParam && !autoOpenedRef.current) {
        const target = newChats.find(c => c.id === chatIdParam);
        if (target) {
          autoOpenedRef.current = chatIdParam;
          const otherName = getOtherName(target, myName, user);
          selectChat(target.id, otherName, target.participants);
        }
      }
    });
    return () => unsub && unsub();
  }, [user, searchParams, myName]);

  function getOtherName(chat, myName, user) {
    return chat.participantNames?.find(name =>
      name !== myName && name !== user?.email && name !== user?.displayName
    ) || 'Amigo';
  }

  const selectChat = (chatId, name, participants) => {
    if (unsubMessagesRef.current) {
      unsubMessagesRef.current();
      unsubMessagesRef.current = null;
    }
    setActiveChatId(chatId);
    setActiveChatName(name);
    setActiveChatParticipants(participants);
    setLoadingMessages(true);
    setMessages([]);

    unsubMessagesRef.current = chatService.listenMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });
  };

  useEffect(() => {
    return () => { if (unsubMessagesRef.current) unsubMessagesRef.current(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !activeChatId || !user) return;
    try {
      await chatService.sendMessage(activeChatId, text, user.uid, activeChatParticipants, myName);
      setMessageText('');
    } catch (err) {
      alert('Error al enviar mensaje: ' + err.message);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este chat?')) return;
    try {
      await chatService.deleteChat(chatId);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        if (unsubMessagesRef.current) { unsubMessagesRef.current(); unsubMessagesRef.current = null; }
      }
    } catch { alert('No se pudo eliminar el chat'); }
  };

  const handleCreateChatWithFriend = async (friendUid, name, participants) => {
    try {
      const newChatId = await chatService.createChatWithUser(friendUid, user);
      selectChat(newChatId, name, participants);
    } catch { alert('No se pudo iniciar el chat'); }
  };

  // Filter chats/friend suggestions
  const term = search.toLowerCase().trim();
  const filteredChats = chats.filter(chat => {
    const otherName = getOtherName(chat, myName, user);
    return otherName.toLowerCase().includes(term);
  });

  const friendSuggestions = term ? friends.filter(f => {
    const fullName = `${f.name} ${f.surname}`.toLowerCase();
    const matchesName = fullName.includes(term) || f.username?.toLowerCase().includes(term);
    const alreadyHasChat = chats.some(c => c.participants.includes(f.uid));
    return matchesName && !alreadyHasChat;
  }) : [];

  return (
    <Layout contentClass="chat-page-wrapper">
      <div className="chat-body">
        {/* Contacts sidebar */}
        <div className="chat-contacts-sidebar">
          <div className="chat-search-container">
            <form onSubmit={(e) => { e.preventDefault(); }}>
              <i className="bx bx-search" />
              <input
                className="chat-search-input"
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          <ul className="chat-contacts-list" id="contacts-list">
            {filteredChats.length === 0 && friendSuggestions.length === 0 && term && (
              <li className="no-chats">No se encontraron resultados</li>
            )}
            {filteredChats.map(chat => {
              const otherName = getOtherName(chat, myName, user);
              const unread = chat.unreadCount?.[user?.uid] || 0;
              const lastMsg = chat.lastMessage?.text
                ? (chat.lastMessage.senderId === user?.uid ? 'Tú: ' : '') + chat.lastMessage.text
                : 'No hay mensajes aún';
              return (
                <ChatContactItem
                  key={chat.id}
                  chatId={chat.id}
                  name={otherName}
                  lastMessage={lastMsg}
                  unread={unread}
                  isActive={activeChatId === chat.id}
                  onClick={() => selectChat(chat.id, otherName, chat.participants)}
                  onDelete={(e) => handleDeleteChat(chat.id, e)}
                />
              );
            })}
            {friendSuggestions.map(friend => {
              const name = `${friend.name} ${friend.surname}`.trim();
              return (
                <li
                  key={friend.uid}
                  className="chat-contact-item"
                  onClick={() => handleCreateChatWithFriend(friend.uid, name, [user.uid, friend.uid])}
                >
                  <div className="chat-contact-avatar">
                    <img src="/images/av5c8336583e291842624 1.svg" alt={name} />
                  </div>
                  <div className="chat-contact-info">
                    <div className="chat-contact-name">{name}</div>
                    <div className="chat-last-message" style={{ color: '#0056FF' }}>Amigo (clic para chatear)</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Chat main area */}
        <div className="chat-main-window">
          {!activeChatId && (
            <EmptyState friends={friends} chats={chats} />
          )}
          <div className="chat-window-header" id="chat-header" style={{ borderBottom: activeChatId ? '2px solid #d1d1d1' : 'none' }}>
            {activeChatId && (
              <>
                <div className="chat-contact-avatar">
                  <img src="/images/av5c8336583e291842624 1.svg" alt={activeChatName} />
                </div>
                <div className="chat-header-info">
                  <h2>{activeChatName}</h2>
                  <span className="chat-header-status">En línea</span>
                </div>
              </>
            )}
          </div>

          <div className="chat-messages-area" id="chat-messages">
            {loadingMessages && <div className="chat-loading">Cargando mensajes...</div>}
            {!loadingMessages && messages.length === 0 && activeChatId && (
              <div className="chat-empty-messages">No hay mensajes aún. ¡Escribe el primero!</div>
            )}
            {messages.map((msg, i) => {
              const isSent = msg.senderId === user?.uid;
              const time = msg.timestamp?.toDate
                ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div key={i} className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                  <div className="chat-message-content">{msg.text || msg.messageText || ''}</div>
                  <div className="chat-message-time">{time}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {activeChatId && (
            <div className="chat-input-area">
              <input
                className="chat-input-field"
                type="text"
                placeholder="Escribe un mensaje..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button className="chat-send-btn" onClick={handleSend}>
                <i className="bx bx-send" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ChatContactItem({ chatId, name, lastMessage, unread, isActive, onClick, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <li className={`chat-contact-item${isActive ? ' active' : ''}`} data-chat-id={chatId} onClick={onClick}>
      <div className="chat-contact-avatar">
        <img src="/images/av5c8336583e291842624 1.svg" alt={name} />
      </div>
      <div className="chat-contact-info">
        <div className="chat-contact-name">{name}</div>
        <div className="chat-last-message">{lastMessage}</div>
      </div>
      {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
      <button
        className="group-menu-btn"
        title="Opciones"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
      >
        <i className="bx bx-dots-vertical-rounded" />
      </button>
      {menuOpen && (
        <div className="group-submenu active">
          <button className="submenu-item delete" onClick={onDelete}>
            <i className="bx bx-trash" /> Eliminar chat
          </button>
        </div>
      )}
    </li>
  );
}

function EmptyState({ friends, chats }) {
  if (friends.length === 0 && chats.length === 0) {
    return (
      <div className="chat-empty-state">
        <div className="empty-state-emoji">🥺</div>
        <h2>Parece que no tienes amigos aún...</h2>
        <p>¡Añade amigos para empezar a chatear!</p>
        <a href="/friends" className="empty-state-btn">Ir a Amigos</a>
      </div>
    );
  }
  if (friends.length > 0 && chats.length === 0) {
    return (
      <div className="chat-empty-state">
        <div className="empty-state-icons">
          <i className="bx bx-plus" /><i className="bx bx-conversation" />
        </div>
        <h2>Empieza un chat</h2>
        <p>Busca a tus amigos arriba para empezar a hablar.</p>
      </div>
    );
  }
  return (
    <div className="chat-empty-state">
      <div className="empty-state-icons">
        <i className="bx bx-plus" /><i className="bx bx-conversation" />
      </div>
      <h2>Selecciona un chat</h2>
      <p>¡Tus amigos están esperando!</p>
    </div>
  );
}
