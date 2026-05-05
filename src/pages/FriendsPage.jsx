import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { friendsService } from '../services/friendsService.js';
import { chatService } from '../services/chatService.js';
import { presenceService } from '../services/presenceService.js';
import { gruposService } from '../services/gruposService.js';
import Layout from '../components/Layout.jsx';
import '../components/friends/friends.css';

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

function FriendAvatar({ name, avatarUrl }) {
  if (avatarUrl && isEmoji(avatarUrl)) {
    return (
      <div className="friend-avatar" style={{ backgroundColor: '#f0f0f0', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {avatarUrl}
      </div>
    );
  }
  if (avatarUrl) {
    return (
      <div className="friend-avatar">
        <img src={avatarUrl} alt={name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: hashAvatarColor(name), color: '#fff', fontWeight: 700, fontSize: '14px' }}>
          {chatInitials(name)}
        </span>
      </div>
    );
  }
  return (
    <div className="friend-avatar" style={{ backgroundColor: hashAvatarColor(name), color: '#fff', fontWeight: 700, fontSize: '14px' }}>
      {chatInitials(name)}
    </div>
  );
}

function FriendStatus({ uid }) {
  const [status, setStatus] = useState({ isOnline: false });
  useEffect(() => {
    return presenceService.listenUserStatus(uid, setStatus);
  }, [uid]);
  
  if (!status.isOnline) return null;
  return <span className="friend-status-dot" title="En línea" />;
}

function FriendGroups({ uid }) {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to groups where this user is a member
    return gruposService.listenMyGroups(uid, setGroups);
  }, [uid]);

  if (groups.length === 0) return null;

  const displayGroups = groups.slice(0, 3);
  const extraCount = groups.length - 3;

  return (
    <div className="friend-groups-badges">
      {displayGroups.map(g => (
        <span 
          key={g.id} 
          className="friend-group-badge" 
          title={`Ir al grupo ${g.name}`}
          onClick={(e) => { e.stopPropagation(); navigate(`/grupos?id=${g.id}`); }}
          style={{ cursor: 'pointer' }}
        >
          {g.emoji || '👥'}
        </span>
      ))}
      {extraCount > 0 && (
        <span className="friend-group-badge extra" onClick={(e) => { e.stopPropagation(); navigate('/grupos'); }} style={{ cursor: 'pointer' }}>
          +{extraCount}
        </span>
      )}
    </div>
  );
}

function RequestAvatar({ uid, name }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  useEffect(() => {
    getUserProfile(uid).then(p => {
      if (p?.avatarUrl) setAvatarUrl(p.avatarUrl);
    });
  }, [uid]);

  return <FriendAvatar name={name} avatarUrl={avatarUrl} />;
}

export default function FriendsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]); 
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState({}); 
  const [deleteModal, setDeleteModal] = useState({ open: false, uid: null, name: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubFriends = friendsService.listenMyFriends(user.uid, setFriends);
    const unsubRequests = friendsService.listenIncomingRequests(user.uid, setRequests);
    return () => { unsubFriends && unsubFriends(); unsubRequests && unsubRequests(); };
  }, [user]);

  // Live search effect
  useEffect(() => {
    const term = search.trim().replace(/^@/, '');
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await friendsService.searchByUsername(term);
        if (found && found.id !== user.uid) {
          setSearchResults([found]);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, user.uid]);

  const handleSendRequest = async (uid) => {
    try {
      await friendsService.sendFriendRequest(user.uid, uid);
      setSentRequests(prev => ({ ...prev, [uid]: 'sent' }));
      setTimeout(() => {
        setSearch('');
        setSearchResults([]);
      }, 2000);
    } catch (err) {
      setSentRequests(prev => ({ ...prev, [uid]: 'error' }));
    }
  };

  const handleAccept = async (req) => {
    try { await friendsService.acceptFriendRequest(req.contactDocId, req.requested_by, user.uid); }
    catch (err) { alert(err.message); }
  };

  const handleDecline = async (req) => {
    try { await friendsService.declineFriendRequest(req.contactDocId); }
    catch (err) { alert(err.message); }
  };

  const handleChat = async (uid) => {
    try {
      const chatId = await chatService.createChatWithUser(uid, user);
      navigate(`/chat?chatId=${chatId}`);
    } catch (err) { alert(err.message); }
  };

  const handleRemove = (uid, name) => {
    setDeleteModal({ open: true, uid, name });
  };

  const confirmRemove = async () => {
    const { uid } = deleteModal;
    try {
      await friendsService.removeFriend(user.uid, uid);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModal({ open: false, uid: null, name: '' });
    }
  };

  const handleCopyCode = () => {
    if (profile?.friend_code) {
      navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="universal-page-header">
        <div className="header-left-zone">
          {profile?.friend_code && (
            <div className="my-code-badge" onClick={handleCopyCode} title="Click para copiar mi código">
              <i className={`bx ${copied ? 'bx-check' : 'bx-copy-alt'}`} />
              <span>{copied ? 'Copiado' : profile.friend_code}</span>
            </div>
          )}
        </div>
        <div className="header-center-zone">
          <div className="header-search-container">
            <i className="bx bx-search" />
            <input
              className="header-search-input"
              type="text"
              placeholder="Buscar por @usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Live Search Dropdown */}
            {(searchResults.length > 0 || searching) && (
              <div className="search-results-dropdown">
                {searching && <div className="searching-indicator">Buscando...</div>}
                {searchResults.map(result => (
                  <div key={result.id} className="search-result-item">
                    <FriendAvatar name={`${result.name} ${result.surname}`} avatarUrl={result.avatarUrl} />
                    <div className="user-info">
                      <span className="user-name">{result.name} {result.surname}</span>
                      <span className="user-handle">@{result.username}</span>
                    </div>
                    {sentRequests[result.id] === 'sent' ? (
                      <span className="status-sent">Enviada ✓</span>
                    ) : sentRequests[result.id] === 'error' ? (
                      <span className="status-error">Error</span>
                    ) : (
                      <button
                        className="btn-add-result"
                        onClick={() => handleSendRequest(result.id)}
                      >
                        <i className="bx bx-plus" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="header-right-zone" />
      </div>

      <div className="friends-page">
        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="modal-overlay" onClick={() => setDeleteModal({ open: false, uid: null, name: '' })}>
            <div className="modal-confirm-card" onClick={e => e.stopPropagation()}>
              <div className="modal-confirm-body">
                <div className="modal-confirm-icon">
                  <i className="bx bx-trash" />
                </div>
                <h3>¿Eliminar amigo?</h3>
                <p>¿Estás seguro de que quieres eliminar a <b>{deleteModal.name}</b> de tu lista de amigos?</p>
              </div>
              <div className="modal-confirm-footer">
                <button className="btn-modal-cancel" onClick={() => setDeleteModal({ open: false, uid: null, name: '' })}>Cancelar</button>
                <button className="btn-modal-delete" onClick={confirmRemove}>Eliminar</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Solicitudes */}
        {requests.length > 0 && (
          <section className="friends-section animated-section">
            <h2 className="section-title">
              <i className="bx bx-user-plus" />
              Solicitudes pendientes
              <span className="requests-count-badge">{requests.length}</span>
            </h2>
            <div className="friend-cards-grid">
              {requests.map(req => (
                <div key={req.contactDocId} className="friend-card request-card">
                  <div className="card-avatar-zone">
                    <RequestAvatar uid={req.requested_by} name={`${req.name} ${req.surname}`} />
                  </div>
                  <div className="card-info-zone">
                    <span className="friend-name">{req.name} {req.surname}</span>
                    <span className="friend-username">@{req.username}</span>
                    <FriendGroups uid={req.requested_by} />
                  </div>
                  <div className="card-actions-zone">
                    <button className="btn-action-accept" onClick={() => handleAccept(req)} title="Aceptar">
                      <i className="bx bx-check" />
                    </button>
                    <button className="btn-action-decline" onClick={() => handleDecline(req)} title="Rechazar">
                      <i className="bx bx-x" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Amigos */}
        <section className="friends-section">
          <h2 className="section-title">
            <i className="bx bx-group" />
            Mis amigos
            <span className="friends-count-badge">{friends.length}</span>
          </h2>
          
          {friends.length === 0 ? (
            <div className="friends-empty-state">
              <i className="bx bx-ghost" />
              <p>No tienes amigos aún. ¡Usa el buscador para añadir a alguien!</p>
            </div>
          ) : (
            <div className="friend-cards-grid">
              {friends.map(f => (
                <div key={f.uid} className="friend-card">
                  <div className="card-avatar-zone">
                    <FriendAvatar name={`${f.name} ${f.surname}`} avatarUrl={f.avatarUrl} />
                    <FriendStatus uid={f.uid} />
                  </div>
                  <div className="card-info-zone">
                    <span className="friend-name">{f.name} {f.surname}</span>
                    <span className="friend-username">@{f.username}</span>
                    <FriendGroups uid={f.uid} />
                  </div>
                  <div className="card-actions-zone">
                    <button className="btn-action-chat" onClick={() => handleChat(f.uid)} title="Abrir chat">
                      <i className="bx bx-conversation" />
                    </button>
                    <button className="btn-action-remove" onClick={() => handleRemove(f.uid, f.name)} title="Eliminar amigo">
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
