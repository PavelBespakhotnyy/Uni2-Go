import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { notificationService } from '../services/notificationService.js';
import { friendsService } from '../services/friendsService.js';
import Layout from '../components/Layout.jsx';
import '../components/notifications/notifications.css';

const ITEMS_PER_PAGE = 8;

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.listenMyNotifications(user.uid, (data) => {
      const sorted = [...data].sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setNotifications(sorted.map(n => ({
        id: n.id,
        name: n.senderName,
        action: n.action,
        date: n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : '',
        time: n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        read: n.read,
        type: n.type,
        data: n.data,
      })));
    });
    return () => unsub && unsub();
  }, [user]);

  const filtered = notifications
    .filter(n => {
      const matchSearch = `${n.name} ${n.action}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || (statusFilter === 'read' ? n.read : !n.read);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (a.read === b.read) return 0;
      return a.read ? 1 : -1;
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleAcceptFriend = async (notif) => {
    try {
      if (notif.data?.contactDocId && notif.data?.fromUid) {
        await friendsService.acceptFriendRequest(notif.data.contactDocId, notif.data.fromUid, user.uid);
        await notificationService.markAsRead(notif.id);
      }
    } catch (err) {
      alert('Error al aceptar solicitud');
    }
  };

  const handleDeclineFriend = async (notif) => {
    try {
      if (notif.data?.contactDocId) {
        await friendsService.declineFriendRequest(notif.data.contactDocId);
        await notificationService.markAsRead(notif.id);
      }
    } catch {}
  };

  const handleGoToChat = async (notif) => {
    await notificationService.markAsRead(notif.id);
    navigate(`/chat${notif.data?.chatId ? `?id=${notif.data.chatId}` : ''}`);
  };

  const handleGoToGrupo = async (notif) => {
    await notificationService.markAsRead(notif.id);
    navigate(`/grupos${notif.data?.groupId ? `?id=${notif.data.groupId}` : ''}`);
  };

  const handlePanelClick = (notif) => {
    if (notif.type === 'new_chat' || notif.type === 'new_message') handleGoToChat(notif);
    else if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
      notificationService.markAsRead(notif.id);
      navigate('/friends');
    } else if (notif.type === 'group_invitation') handleGoToGrupo(notif);
  };

  return (
    <Layout contentClass="notifications-wrapper">
      <div className="universal-page-header">
        <div className="header-left-zone">
          <select
            className="filters-select"
            style={{ height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', background: '#fff', fontSize: '14px' }}
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Todas</option>
            <option value="unread">No leídas</option>
            <option value="read">Leídas</option>
          </select>
        </div>
        
        <div className="header-center-zone">
          <div className="header-search-container">
            <i className="bx bx-search" />
            <input
              className="header-search-input"
              id="notificationSearch"
              type="text"
              placeholder="Buscar notificación..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="header-right-zone" />
      </div>

      <div className="notifications-page">
        <div className="notifications-container" id="notificationsList">
          <div className="notifications-list">
            {pageItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '18px' }}>
                No hay notificaciones.
              </div>
            ) : (
              pageItems.map(notif => (
                <NotifPanel
                  key={notif.id}
                  notif={notif}
                  onAcceptFriend={handleAcceptFriend}
                  onDeclineFriend={handleDeclineFriend}
                  onGoToChat={handleGoToChat}
                  onGoToGrupo={handleGoToGrupo}
                  onPanelClick={handlePanelClick}
                />
              ))
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <ul className="pagination-list">
              <i
                className={`bx bx-chevron-left pagination-item${page === 1 ? ' disabled' : ''}`}
                onClick={() => page > 1 && setCurrentPage(p => p - 1)}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <span
                  key={n}
                  className={`pagination-item${n === page ? ' active' : ''}`}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </span>
              ))}
              <i
                className={`bx bx-chevron-right pagination-item${page === totalPages ? ' disabled' : ''}`}
                onClick={() => page < totalPages && setCurrentPage(p => p + 1)}
              />
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

function NotifPanel({ notif, onAcceptFriend, onDeclineFriend, onGoToChat, onGoToGrupo, onPanelClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [accepted, setAccepted] = useState(null); // null | 'accepted' | 'declined'
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const actionButtons = () => {
    if (notif.read) return null;
    if (accepted) return <span className="action-status">{accepted === 'accepted' ? 'Solicitud aceptada' : 'Solicitud rechazada'}</span>;
    if (notif.type === 'new_chat' || notif.type === 'new_message') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToChat(notif); }}>Ir al chat</button>;
    }
    if (notif.type === 'group_invitation') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToGrupo(notif); }}>Aceptar invitación</button>;
    }
    if (notif.type === 'friend_request') {
      return (
        <div className="notification-action-group">
          <button className="notification-action-btn" onClick={async (e) => { e.stopPropagation(); await onAcceptFriend(notif); setAccepted('accepted'); }}>Aceptar</button>
          <button className="notification-action-btn secondary" onClick={async (e) => { e.stopPropagation(); await onDeclineFriend(notif); setAccepted('declined'); }}>Rechazar</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`notification-panel ${notif.read ? 'read' : 'unread'}`}
      onClick={() => onPanelClick(notif)}
    >
      <div className="notification-content">
        <div className="notification-main-text">
          <span className="username">{notif.name}</span> {notif.action}
        </div>
        {actionButtons()}
      </div>
      <div className="notification-meta" onClick={(e) => e.stopPropagation()}>
        <span>{notif.date}</span>
        <span>{notif.time}</span>
        <button
          ref={menuBtnRef}
          className="notification-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!menuOpen && menuBtnRef.current) {
              const rect = menuBtnRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 5, right: window.innerWidth - rect.right });
            }
            setMenuOpen(v => !v);
          }}
        >
          <i className="bx bx-dots-vertical-rounded" />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="notification-menu active"
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          >
            {notif.read ? (
              <button className="notification-menu-item" onClick={() => { notificationService.markAsUnread(notif.id); setMenuOpen(false); }}>Marcar como no leído</button>
            ) : (
              <button className="notification-menu-item" onClick={() => { notificationService.markAsRead(notif.id); setMenuOpen(false); }}>Leer</button>
            )}
            <button className="notification-menu-item delete" onClick={() => { notificationService.deleteNotification(notif.id); setMenuOpen(false); }}>Eliminar</button>
          </div>
        )}
      </div>
    </div>
  );
}
