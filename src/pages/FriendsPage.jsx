import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { friendsService } from '../services/friendsService.js';
import { chatService } from '../services/chatService.js';
import Layout from '../components/Layout.jsx';
import '../components/friends/friends.css';

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]); // Array for dropdown
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState({}); // { uid: 'sent' | 'error' }
  const [deleteModal, setDeleteModal] = useState({ open: false, uid: null, name: '' });

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
      // Auto-clear search after a short delay to let user see the "Sent" status
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

  return (
    <Layout>
      <div className="universal-page-header">
        <div className="header-left-zone" />
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
                {searching && <div style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: 'var(--color-muted)' }}>Buscando...</div>}
                {searchResults.map(result => (
                  <div key={result.id} className="search-result-item">
                    <div className="user-info">
                      <span className="user-name">{result.name} {result.surname}</span>
                      <span className="user-handle">@{result.username}</span>
                    </div>
                    {sentRequests[result.id] === 'sent' ? (
                      <span style={{ fontSize: '10px', color: '#27ae60', fontWeight: 'bold' }}>Solicitud enviada ✓</span>
                    ) : sentRequests[result.id] === 'error' ? (
                      <span style={{ fontSize: '10px', color: '#c0392b', fontWeight: 'bold' }}>Error</span>
                    ) : (
                      <button
                        className="btn-send-request"
                        style={{ padding: '5px 12px', fontSize: '10px' }}
                        onClick={() => handleSendRequest(result.id)}
                      >
                        Añadir
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
        <section className="friends-section">
          <h2>
            Solicitudes pendientes
            {requests.length > 0 && (
              <span id="requests-badge" className="requests-badge">{requests.length}</span>
            )}
          </h2>
          <ul id="requests-list">
            {requests.length === 0 ? (
              <li className="friends-empty">No tienes solicitudes pendientes</li>
            ) : (
              requests.map(req => (
                <li key={req.contactDocId} className="friend-item">
                  <div className="friend-info">
                    <span className="friend-name">{req.name} {req.surname}</span>
                    <span className="friend-username">@{req.username}</span>
                  </div>
                  <div className="friend-actions">
                    <button className="btn-accept" onClick={() => handleAccept(req)}>Aceptar</button>
                    <button className="btn-decline" onClick={() => handleDecline(req)}>Rechazar</button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Amigos */}
        <section className="friends-section">
          <h2>Mis amigos</h2>
          <ul id="friends-list">
            {friends.length === 0 ? (
              <li className="friends-empty">No tienes amigos aún</li>
            ) : (
              friends.map(f => (
                <li key={f.uid} className="friend-item">
                  <div className="friend-info">
                    <span className="friend-name">{f.name} {f.surname}</span>
                    <span className="friend-username">@{f.username}</span>
                  </div>
                  <div className="friend-actions">
                    <button className="btn-chat" onClick={() => handleChat(f.uid)} title="Abrir chat">
                      <i className="bx bx-chat" />
                    </button>
                    <button className="btn-remove" onClick={() => handleRemove(f.uid, f.name)} title="Eliminar amigo">
                      <i className="bx bx-user-minus" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
