import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { notificationService } from '../../services/notificationService.js';
import { friendsService } from '../../services/friendsService.js';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('notificationSearch');
    const statusFilter = document.getElementById('statusFilter');
    const notificationsList = document.getElementById('notificationsList');
    const paginationList = document.querySelector('.pagination-list');

    let ITEMS_PER_PAGE = 8;
    let currentPage = 1;
    let notifications = [];
    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("Listening to notifications for:", user.uid);
            notificationService.listenMyNotifications(user.uid, (data) => {
                console.log("Received notifications:", data.length);
                // Sort by createdAt desc in frontend to avoid index requirement for now
                const sortedData = data.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return timeB - timeA;
                });

                notifications = sortedData.map(n => ({
                    id: n.id,
                    name: n.senderName,
                    action: n.action,
                    date: n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : '',
                    time: n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    read: n.read,
                    type: n.type,
                    data: n.data
                }));
                updateUI();
            });
        } else {
            window.location.href = "/pages/login.html";
        }
    });

    function calculateItemsPerPage() {
        const container = document.querySelector('.notifications-container');
        if (!container) return;

        // Measure a single notification item height
        const dummy = document.createElement('div');
        dummy.className = 'notification-panel unread';
        dummy.style.visibility = 'hidden';
        dummy.style.position = 'absolute';
        dummy.style.width = '100%';
        dummy.innerHTML = '<div class="notification-main-text"><span class="username">M</span> A</div>';
        notificationsList.appendChild(dummy);
        const itemHeight = dummy.offsetHeight;
        notificationsList.removeChild(dummy);

        const gap = 12; // gap from CSS
        const availableHeight = container.clientHeight;

        if (itemHeight > 0) {
            ITEMS_PER_PAGE = Math.floor((availableHeight + gap) / (itemHeight + gap));
            if (ITEMS_PER_PAGE < 1) ITEMS_PER_PAGE = 1;
        }
    }

    function renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            paginationList.innerHTML = '';
            
            if (totalPages <= 1) {
                paginationList.style.display = 'none';
                return;
            }
            paginationList.style.display = 'flex';
            const prev = document.createElement('i');
        prev.className = `bx bx-chevron-left pagination-item ${currentPage === 1 ? 'disabled' : ''}`;
        prev.onclick = () => { if(currentPage > 1) { currentPage--; updateUI(); } };
        paginationList.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            const span = document.createElement('span');
            span.className = `pagination-item ${i === currentPage ? 'active' : ''}`;
            span.textContent = i;
            span.onclick = () => { currentPage = i; updateUI(); };
            paginationList.appendChild(span);
        }

        const next = document.createElement('i');
        next.className = `bx bx-chevron-right pagination-item ${currentPage === totalPages ? 'disabled' : ''}`;
        next.onclick = () => { if(currentPage < totalPages) { currentPage++; updateUI(); } };
        paginationList.appendChild(next);
    }

    function updateUI() {
        const filtered = getFilteredAndSortedList();
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        renderNotifications(pageItems);
        renderPagination(filtered.length);
    }

    function renderNotifications(list) {
        notificationsList.innerHTML = '';
        if (list.length === 0) {
            notificationsList.innerHTML = '<div style="text-align:center; padding: 40px; color: #888; font-size: 18px;">No hay notificaciones.</div>';
            return;
        }
        list.forEach(notif => {
            const panel = document.createElement('div');
            panel.className = `notification-panel ${notif.read ? 'read' : 'unread'}`;
            panel.dataset.id = notif.id;
            panel.dataset.type = notif.type || '';
            if (notif.data && notif.data.chatId) {
                panel.dataset.chatId = notif.data.chatId;
            }
            if (notif.data && notif.data.groupId) {
                panel.dataset.groupId = notif.data.groupId;
            }
            if (notif.data && notif.data.fromUid) {
                panel.dataset.fromUid = notif.data.fromUid;
            }
            if (notif.data && notif.data.contactDocId) {
                panel.dataset.contactDocId = notif.data.contactDocId;
            }

            const menuContent = notif.read
                ? `<button class="notification-menu-item action-unread">Marcar como no leído</button>
                   <button class="notification-menu-item delete action-delete">Eliminar</button>`
                : `<button class="notification-menu-item action-read">Leer</button>
                   <button class="notification-menu-item delete action-delete">Eliminar</button>`;

            let actionButtons = '';
            if (!notif.read) {
                if (notif.type === 'new_chat' || notif.type === 'new_message') {
                    actionButtons = `<button class="notification-action-btn btn-read-redirect">Ir al chat</button>`;
                } else if (notif.type === 'group_invitation') {
                    actionButtons = `<button class="notification-action-btn btn-accept-group">Aceptar invitación</button>`;
                } else if (notif.type === 'friend_request') {
                    actionButtons = `
                        <div class="notification-action-group">
                            <button class="notification-action-btn btn-accept-friend">Aceptar</button>
                            <button class="notification-action-btn btn-decline-friend secondary">Rechazar</button>
                        </div>
                    `;
                }
            }

            panel.innerHTML = `
                <div class="notification-content">
                    <div class="notification-main-text">
                        <span class="username">${notif.name}</span> ${notif.action}
                    </div>
                    ${actionButtons}
                </div>
                <div class="notification-meta">
                    <span>${notif.date}</span>
                    <span>${notif.time}</span>
                    <button class="notification-menu-btn">
                        <i class="bx bx-dots-vertical-rounded"></i>
                    </button>
                    <div class="notification-menu">
                        ${menuContent}
                    </div>
                </div>
            `;
            notificationsList.appendChild(panel);
        });
    }

    notificationsList.addEventListener('click', async (e) => {
        const panel = e.target.closest('.notification-panel');
        if (!panel) return;
        const id = panel.dataset.id;
        const type = panel.dataset.type;
        const chatId = panel.dataset.chatId;
        const groupId = panel.dataset.groupId;
        const fromUid = panel.dataset.fromUid;
        const contactDocId = panel.dataset.contactDocId;

        // Handle menu button click
        if (e.target.closest('.notification-menu-btn')) {
            document.querySelectorAll('.notification-menu').forEach(m => {
                if (m !== panel.querySelector('.notification-menu')) m.classList.remove('active');
            });
            panel.querySelector('.notification-menu').classList.toggle('active');
            return;
        }

        // Handle menu item actions
        if (e.target.classList.contains('action-read')) {
            notificationService.markAsRead(id);
            return;
        }

        if (e.target.classList.contains('action-unread')) {
            notificationService.markAsUnread(id);
            return;
        }

        if (e.target.classList.contains('action-delete')) {
            notificationService.deleteNotification(id);
            return;
        }

        // Handle specific action buttons
        if (e.target.classList.contains('btn-read-redirect')) {
            await notificationService.markAsRead(id);
            window.location.href = `./chat.html${chatId ? `?id=${chatId}` : ''}`;
            return;
        }

        if (e.target.classList.contains('btn-accept-group')) {
            await notificationService.markAsRead(id);
            window.location.href = `./grupos.html${groupId ? `?id=${groupId}` : ''}`;
            return;
        }

        if (e.target.classList.contains('btn-accept-friend')) {
            try {
                if (contactDocId && fromUid && currentUser) {
                    const btnGroup = e.target.closest('.notification-action-group');
                    if (btnGroup) btnGroup.innerHTML = '<span class="action-status">Solicitud aceptada</span>';
                    
                    await friendsService.acceptFriendRequest(contactDocId, fromUid, currentUser.uid);
                    await notificationService.markAsRead(id);
                } else {
                    await notificationService.markAsRead(id);
                    window.location.href = `./friends.html`;
                }
            } catch (err) {
                console.error("Error accepting friend:", err);
                alert("Error al aceptar solicitud");
            }
            return;
        }

        if (e.target.classList.contains('btn-decline-friend')) {
            try {
                if (contactDocId) {
                    const btnGroup = e.target.closest('.notification-action-group');
                    if (btnGroup) btnGroup.innerHTML = '<span class="action-status">Solicitud rechazada</span>';
                    
                    await friendsService.declineFriendRequest(contactDocId);
                    await notificationService.markAsRead(id);
                } else {
                    await notificationService.markAsRead(id);
                    window.location.href = `./friends.html`;
                }
            } catch (err) {
                console.error("Error declining friend:", err);
            }
            return;
        }

        // Click on the panel itself (outside the menu and buttons)
        if (type === 'new_chat' || type === 'new_message') {
            notificationService.markAsRead(id);
            window.location.href = `./chat.html${chatId ? `?id=${chatId}` : ''}`;
        } else if (type === 'friend_request' || type === 'friend_accepted') {
            notificationService.markAsRead(id);
            window.location.href = `./friends.html`;
        } else if (type === 'group_invitation') {
            notificationService.markAsRead(id);
            window.location.href = `./grupos.html${groupId ? `?id=${groupId}` : ''}`;
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-meta')) {
            document.querySelectorAll('.notification-menu').forEach(m => m.classList.remove('active'));
        }
    });

    function getFilteredAndSortedList() {
        const term = searchInput.value.toLowerCase();
        const status = statusFilter.value; // 'all', 'read', 'unread'

        let filtered = notifications.filter(notif => {
            const matchesSearch = `${notif.name} ${notif.action}`.toLowerCase().includes(term);
            const matchesStatus = status === 'all' ||
                                 (status === 'read' && notif.read) ||
                                 (status === 'unread' && !notif.read);
            return matchesSearch && matchesStatus;
        });

        return filtered.sort((a, b) => {
            if (a.read === b.read) return 0;
            return a.read ? 1 : -1;
        });
    }

    searchInput.addEventListener('input', () => { currentPage = 1; updateUI(); });
    statusFilter.addEventListener('change', () => { currentPage = 1; updateUI(); });

    window.addEventListener('resize', () => {
        calculateItemsPerPage();
        updateUI();
    });

    calculateItemsPerPage();
});

