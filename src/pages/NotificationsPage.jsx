import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { notificationService } from '../services/notificationService.js';
import { chatService } from '../services/chatService.js';
import Layout from '../components/Layout.jsx';
import '../components/notifications/notifications.css';

function useListItemsPerPage(containerRef, itemHeight = 53, gap = 12) {
  const [itemsPerPage, setItemsPerPage] = useState(8);

  useEffect(() => {
    const calculate = () => {
      if (!containerRef.current) return;
      const h = containerRef.current.offsetHeight;
      setItemsPerPage(Math.max(3, Math.floor((h + gap) / (itemHeight + gap))));
    };

    calculate();

    const ro = new ResizeObserver(calculate);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [containerRef, itemHeight, gap]);

  return itemsPerPage;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef(null);
  const itemsPerPage = useListItemsPerPage(listRef);

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
        interacted: n.interacted || false,
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

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const pageItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleGoToChat = async (notif) => {
    await notificationService.markAsRead(notif.id);
    navigate(`/chat${notif.data?.chatId ? `?id=${notif.data.chatId}` : ''}`);
  };

  const handleGoToFriends = async (notif) => {
    await notificationService.markAsRead(notif.id);
    navigate('/friends');
  };

  const handleGoToChatWithAcceptor = async (notif) => {
    await notificationService.markAsRead(notif.id);
    const acceptorUid = notif.data?.acceptorUid;
    if (acceptorUid) {
      const chatId = await chatService.createChatWithUser(acceptorUid, user);
      navigate(`/chat${chatId ? `?id=${chatId}` : ''}`);
    } else {
      navigate('/chat');
    }
  };

  const handleGoToGrupos = async (notif) => {
    await notificationService.markAsRead(notif.id);
    navigate('/grupos');
  };

  const handleGoToCalendar = async (notif) => {
    await notificationService.markAsRead(notif.id);
    const eventDate = notif.data?.eventDate;
    if (eventDate) {
      const d = new Date(eventDate);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      navigate(`/calendar?date=${dateStr}`);
    } else {
      navigate('/calendar');
    }
  };

  const handlePanelClick = async (notif) => {
    if (!notif.read) {
      await notificationService.markAsRead(notif.id);
    }
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
        <div className="notifications-container" id="notificationsList" ref={listRef}>
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
                  onGoToChat={handleGoToChat}
                  onGoToFriends={handleGoToFriends}
                  onGoToChatWithAcceptor={handleGoToChatWithAcceptor}
                  onGoToGrupos={handleGoToGrupos}
                  onGoToCalendar={handleGoToCalendar}
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

function NotifPanel({ notif, onGoToChat, onGoToFriends, onGoToChatWithAcceptor, onGoToGrupos, onGoToCalendar, onPanelClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
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
    if (notif.read || notif.interacted) return null;
    if (notif.type === 'new_chat' || notif.type === 'new_message') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToChat(notif); }}>Ir al chat</button>;
    }
    if (notif.type === 'friend_request') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToFriends(notif); }}>Ir a amigos</button>;
    }
    if (notif.type === 'friend_accepted') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToChatWithAcceptor(notif); }}>Iniciar chat</button>;
    }
    if (notif.type === 'group_invitation') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToGrupos(notif); }}>Ir a grupos</button>;
    }
    if (notif.type === 'calendar_share') {
      return <button className="notification-action-btn" onClick={(e) => { e.stopPropagation(); onGoToCalendar(notif); }}>Ir al calendario</button>;
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
              <button
                className="notif-menu-icon-btn"
                title="Marcar como no leído"
                onClick={() => { notificationService.markAsUnread(notif.id); setMenuOpen(false); }}
              >
                <i className="bx bx-envelope" />
              </button>
            ) : (
              <button
                className="notif-menu-icon-btn"
                title="Marcar como leído"
                onClick={() => { notificationService.markAsRead(notif.id); setMenuOpen(false); }}
              >
                <i className="bx bx-envelope-open" />
              </button>
            )}
            <button
              className="notif-menu-icon-btn delete"
              title="Eliminar"
              onClick={() => { notificationService.deleteNotification(notif.id); setMenuOpen(false); }}
            >
              <i className="bx bx-trash" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
