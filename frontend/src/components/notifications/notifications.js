document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('hasNewNotification', 'false');
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    const searchInput = document.getElementById('notificationSearch');
    const statusFilter = document.getElementById('statusFilter');
    const notificationsList = document.getElementById('notificationsList');
    const paginationList = document.querySelector('.pagination-list');

    const ITEMS_PER_PAGE = 8;
    let currentPage = 1;

    let notifications = [
        { id: 1, name: 'Martín', action: 'te ha enviado una solicitud para ser tu amigo', date: '20.09.2025', time: '10:40', read: false },
        { id: 2, name: 'Lucía', action: 'te ha enviado una solicitud para ser tu amigo', date: '19.09.2025', time: '10:20', read: false },
        { id: 3, name: 'Juan', action: 'compartió contigo un evento', date: '19.09.2025', time: '10:20', read: false },
        { id: 4, name: 'Lucía', action: 'te ha enviado una solicitud para ser tu amigo', date: '19.09.2025', time: '10:20', read: true },
        { id: 5, name: 'Lucía', action: 'te ha enviado una solicitud для ser tu amigo', date: '19.09.2025', time: '10:20', read: false },
        { id: 6, name: 'Lucía', action: 'te ha enviado una solicitud для ser tu amigo', date: '19.09.2025', time: '10:20', read: true },
        { id: 7, name: 'Lucía', action: 'te ha enviado una solicitud для ser tu amigo', date: '19.09.2025', time: '10:20', read: false },
        { id: 8, name: 'Lucía', action: 'te ha enviado una solicitud для ser tu amigo', date: '19.09.2025', time: '10:20', read: false },
        { id: 9, name: 'Carlos', action: 'comentó en tu publicación', date: '18.09.2025', time: '09:00', read: false },
        { id: 10, name: 'Ana', action: 'te invitó a un grupo', date: '18.09.2025', time: '08:30', read: true }
    ];

    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        paginationList.innerHTML = '';
        if (totalPages <= 1) return;

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
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        renderNotifications(pageItems);
        renderPagination(filtered.length);
    }

    function renderNotifications(list) {
        notificationsList.innerHTML = '';
        if (list.length === 0) {
            notificationsList.innerHTML = '<div style="text-align:center; padding: 40px; color: #888; font-size: 18px;">No hay notificaciones que coincidan con el filtro.</div>';
            return;
        }
        list.forEach(notif => {
            const panel = document.createElement('div');
            panel.className = `notification-panel ${notif.read ? 'read' : 'unread'}`;
            panel.dataset.id = notif.id;

            const menuContent = notif.read 
                ? `<button class="notification-menu-item action-unread">Marcar como no leído</button>
                   <button class="notification-menu-item delete action-delete">Eliminar</button>`
                : `<button class="notification-menu-item action-read">Leer</button>
                   <button class="notification-menu-item delete action-delete">Eliminar</button>`;

            panel.innerHTML = `
                <div class="notification-main-text">
                    <span class="username">${notif.name}</span> ${notif.action}
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

    notificationsList.addEventListener('click', (e) => {
        const panel = e.target.closest('.notification-panel');
        if (!panel) return;
        const id = parseInt(panel.dataset.id);
        const index = notifications.findIndex(n => n.id === id);

        if (e.target.closest('.notification-menu-btn')) {
            document.querySelectorAll('.notification-menu').forEach(m => {
                if (m !== panel.querySelector('.notification-menu')) m.classList.remove('active');
            });
            panel.querySelector('.notification-menu').classList.toggle('active');
            return;
        }

        if (e.target.classList.contains('action-read')) {
            if (index !== -1) notifications[index].read = true;
            updateUI();
        }

        if (e.target.classList.contains('action-unread')) {
            if (index !== -1) notifications[index].read = false;
            updateUI();
        }

        if (e.target.classList.contains('action-delete')) {
            notifications = notifications.filter(n => n.id !== id);
            if ((currentPage - 1) * ITEMS_PER_PAGE >= notifications.length && currentPage > 1) {
                currentPage--;
            }
            updateUI();
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

    updateUI();
});
