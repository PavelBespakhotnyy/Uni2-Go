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

        // Badge logic
        updateNotificationBadge();
    });

    // Function to show/hide badge based on localStorage
    window.updateNotificationBadge = function() {
        const hasNew = localStorage.getItem('hasNewNotification') === 'true';
        const navItem = document.querySelector('.buttons-list .notifications i');
        
        if (!navItem) return;

        // Remove existing badge if any
        const existingBadge = navItem.querySelector('.notification-badge');
        if (existingBadge) existingBadge.remove();

        if (hasNew) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = '1';
            navItem.appendChild(badge);
        }
    };
})();
