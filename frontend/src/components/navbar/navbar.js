import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { notificationService } from '../../services/notificationService.js';

(function() {
    // Apply initial state immediately to avoid animation on load
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
    }

    // Enable transitions after a short delay (once the initial state is rendered)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('sidebar-ready');
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        const sidebarButton = document.querySelector('.sidebar-button');
        if (!sidebarButton) return;

        sidebarButton.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', document.body.classList.contains('sidebar-collapsed'));
        });

        // Initialize real-time badge updates
        onAuthStateChanged(auth, (user) => {
            if (user) {
                notificationService.listenMyNotifications(user.uid, (notifications) => {
                    const unreadCount = notifications.filter(n => !n.read).length;
                    updateBadgeUI(unreadCount);
                });
            }
        });
    });

    function updateBadgeUI(count) {
        const navItem = document.querySelector('.buttons-list .notifications i');
        if (!navItem) return;

        // Remove existing badge if any
        const existingBadge = navItem.querySelector('.notification-badge');
        if (existingBadge) existingBadge.remove();

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = count > 9 ? '9+' : count;
            navItem.appendChild(badge);
        }
    }

    // Export for manual updates if needed
    window.updateNotificationBadge = function() {
        const user = auth.currentUser;
        if (user) {
            // This is just a fallback, the real-time listener should handle it
            // but we can trigger a manual check if absolutely necessary.
        }
    };
})();
