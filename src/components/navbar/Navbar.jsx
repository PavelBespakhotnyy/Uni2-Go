import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { notificationService } from '../../services/notificationService.js';
import { toggleDarkMode, isDarkMode } from '../../utils/theme.js';
import './navbar.css';

export default function Navbar() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [dark, setDark] = useState(isDarkMode);

  // Sync body classes
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add('sidebar-ready');
      });
    });
    return () => {
      document.body.classList.remove('sidebar-ready', 'sidebar-collapsed');
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.listenMyNotifications(user.uid, (notifications) => {
      setUnreadCount(notifications.filter(n => !n.read).length);
    });
    return () => unsub && unsub();
  }, [user]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', next);
  };

  const handleDarkToggle = () => {
    const next = toggleDarkMode();
    setDark(next);
  };

  const navItems = [
    { to: '/calendar',       icon: 'bx-calendar',     label: 'Calendar' },
    { to: '/chat',           icon: 'bx-chat',         label: 'Chat' },
    { to: '/notifications',  icon: 'bx-bell',         label: 'Notifications', badge: unreadCount },
    { to: '/grupos',         icon: 'bx-group',        label: 'Grupos' },
    { to: '/friends',        icon: 'bx-user-plus',    label: 'Amigos' },
    { to: '/lista-compras',  icon: 'bx-edit',         label: 'Lista de Compras' },
    { to: '/sobre-nosotros', icon: 'bx-info-circle',  label: 'Info' },
  ];

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`} id="navbar">
      <div className="sidebar-top-part">
        <NavLink to="/calendar">
          <img className="sidebar-logo" src="/images/logo_Uni2_Go.svg" alt="Uni2Go" />
        </NavLink>
        <span
          className="sidebar-button bx bx-sm bx-sidebar"
          onClick={toggleSidebar}
        />
      </div>

      <ul className="buttons-list">
        {navItems.map(({ to, icon, label, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => isActive ? 'button-change-page-active' : ''}
            >
              <span className="nav-icon-wrapper">
                <i className={`bx bx-sm ${icon}`} />
                {badge > 0 && (
                  <span className="notification-badge">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className="nav-label font-bold">{label}</span>
            </NavLink>
          </li>
        ))}

        {/* ── Bottom group: dark toggle + Usuario ── */}
        <li className="nav-bottom-group">
          <button
            className={`dark-toggle-nav${dark ? ' dark-toggle-nav--active' : ''}`}
            onClick={handleDarkToggle}
            title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span className="nav-icon-wrapper">
              <i className={`bx bx-sm ${dark ? 'bx-sun' : 'bx-moon'}`} />
            </span>
            <span className="nav-label font-bold">{dark ? 'Claro' : 'Noche'}</span>
          </button>
          <NavLink
            to="/user"
            className={({ isActive }) => isActive ? 'button-change-page-active' : ''}
          >
            <span className="nav-icon-wrapper">
              <i className="bx bx-sm bx-user" />
            </span>
            <span className="nav-label font-bold">Usuario</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
