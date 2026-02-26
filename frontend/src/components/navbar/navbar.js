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
    });
})();
