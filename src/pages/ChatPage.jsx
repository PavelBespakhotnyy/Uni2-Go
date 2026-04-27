import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { chatService } from '../services/chatService.js';
import { friendsService } from '../services/friendsService.js';
import { getUserProfile } from '../services/userService.js';
import Layout from '../components/Layout.jsx';
import '../components/chat/style.css';

const AVATAR_COLORS = ['#4f46e5','#0284c7','#059669','#d97706','#7c3aed','#db2777','#0891b2','#0056FF'];

function hashAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (const c of str) h = ((h << 5) - h) + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function chatInitials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].substring(0, 2).toUpperCase();
  return '?';
}

function isEmoji(str) {
  return str && !/^https?:\/\//.test(str) && str.length <= 8;
}

function ChatAvatar({ name, avatarUrl }) {
  if (avatarUrl && isEmoji(avatarUrl)) {
    return (
      <div className="chat-contact-avatar" style={{ backgroundColor: '#f0f0f0', fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {avatarUrl}
      </div>
    );
  }
  if (avatarUrl) {
    return (
      <div className="chat-contact-avatar">
        <img src={avatarUrl} alt={name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: hashAvatarColor(name), color: '#fff', fontWeight: 700, fontSize: '16px' }}>
          {chatInitials(name)}
        </span>
      </div>
    );
  }
  return (
    <div className="chat-contact-avatar" style={{ backgroundColor: hashAvatarColor(name), color: '#fff', fontWeight: 700, fontSize: '16px' }}>
      {chatInitials(name)}
    </div>
  );
}

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
  const [activeChatOtherUid, setActiveChatOtherUid] = useState(null);
  const [isFriend, setIsFriend] = useState(true);
  const [avatarCache, setAvatarCache] = useState({});
  const messagesEndRef = useRef(null);
  const unsubMessagesRef = useRef(null);
  const autoOpenedRef = useRef(null);

  const myName = profile
    ? `${profile.name || ''} ${profile.surname || ''}`.trim()
    : (user?.email || '');

  useEffect(() => {
    if (!user) return;
    const unsub = friendsService.listenMyFriends(user.uid, setFriends);
    return () => unsub && unsub();
  }, [user]);

  useEffect(() => {
    if (!activeChatOtherUid) { setIsFriend(true); return; }
    setIsFriend(friends.some(f => f.uid === activeChatOtherUid));
  }, [activeChatOtherUid, friends]);

  useEffect(() => {
    if (!user || chats.length === 0) return;
    const unknownUids = chats
      .map(c => c.participants.find(p => p !== user.uid))
      .filter(uid => uid && !(uid in avatarCache));
    if (unknownUids.length === 0) return;
    const unique = [...new Set(unknownUids)];
    Promise.allSettled(unique.map(uid => getUserProfile(uid).then(p => ({ uid, avatarUrl: p?.avatarUrl || '' })))).then(results => {
      setAvatarCache(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r.status === 'fulfilled') next[r.value.uid] = r.value.avatarUrl; });
        return next;
      });
    });
  }, [chats, user]);

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
    setActiveChatOtherUid(participants.find(p => p !== user?.uid) || null);
    setLoadingMessages(true);
    setMessages([]);
    chatService.markAsRead(chatId, user.uid).catch(() => {});

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
    if (!text || !activeChatId || !user || !isFriend) return;
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
              const otherUid = chat.participants.find(p => p !== user?.uid);
              const otherAvatar = avatarCache[otherUid] ?? null;
              const unread = chat.unreadCount?.[user?.uid] || 0;
              const lastMsg = chat.lastMessage?.text
                ? (chat.lastMessage.senderId === user?.uid ? 'Tú: ' : '') + chat.lastMessage.text
                : 'No hay mensajes aún';
              return (
                <ChatContactItem
                  key={chat.id}
                  chatId={chat.id}
                  name={otherName}
                  avatarUrl={otherAvatar}
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
                  <ChatAvatar name={name} avatarUrl={friend.avatarUrl || null} />
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
                <ChatAvatar name={activeChatName} avatarUrl={activeChatOtherUid ? (avatarCache[activeChatOtherUid] ?? null) : null} />
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
              const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : null;
              const time = msgDate
                ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const prevDate = messages[i - 1]?.timestamp?.toDate ? messages[i - 1].timestamp.toDate() : null;
              const showDateSep = msgDate && (
                !prevDate ||
                msgDate.toDateString() !== prevDate.toDateString()
              );

              const formatDateLabel = (d) => {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                if (d.toDateString() === today.toDateString()) return 'Hoy';
                if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
                return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
              };

              return (
                <React.Fragment key={i}>
                  {showDateSep && (
                    <div className="chat-date-separator">
                      <span>{formatDateLabel(msgDate)}</span>
                    </div>
                  )}
                  <div className={`chat-message-row ${isSent ? 'sent' : 'received'}`}>
                    {isSent && (
                      <button
                        className="chat-message-delete-btn"
                        title="Eliminar mensaje"
                        onClick={() => {
                          setMessages(prev => prev.filter(m => m.id !== msg.id));
                          chatService.deleteMessage(activeChatId, msg.id, user.uid, activeChatParticipants).catch(() => {
                            setMessages(prev => [...prev, msg]);
                          });
                        }}
                      >
                        <i className="bx bx-trash" />
                      </button>
                    )}
                    <div className={`chat-message ${isSent ? 'sent' : 'received'}`}>
                      <div className="chat-message-content">{msg.text || msg.messageText || ''}</div>
                      <div className="chat-message-time">{time}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {activeChatId && (
            isFriend ? (
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
            ) : (
              <div className="chat-input-area chat-input-blocked">
                <span>No puedes enviar mensajes a esta persona porque ya no sois amigos.</span>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}

function ChatContactItem({ chatId, name, avatarUrl, lastMessage, unread, isActive, onClick, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <li className={`chat-contact-item${isActive ? ' active' : ''}`} data-chat-id={chatId} onClick={onClick}>
      <ChatAvatar name={name} avatarUrl={avatarUrl} />
      <div className="chat-contact-info">
        <div className="chat-contact-name">{name}</div>
        <div className="chat-last-message">{lastMessage}</div>
      </div>
      <div className="chat-contact-actions">
        {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
        <button
          className="group-menu-btn"
          title="Opciones"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <i className="bx bx-dots-vertical-rounded" />
        </button>
      </div>
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
