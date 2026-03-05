document.addEventListener('DOMContentLoaded', () => {
    const groupSearchInput = document.getElementById('groupSearch');
    const groupsGrid = document.getElementById('groupsGrid');
    const paginationList = document.querySelector('.pagination-list');

    let ITEMS_PER_PAGE = 6;
    let currentPage = 1;

    let groupsData = [
        { 
            id: 1, 
            name: 'Equipo de Diseño', 
            members: 8, 
            users: [
                { id: 101, avatar: '../public/images/grupo.svg' },
                { id: 102, avatar: '../public/images/grupo.svg' }
            ], 
            description: 'Grupo dedicado al diseño de interfaces y experiencia de usuario para Uni2Go.',
            events: ['Reunión semanal', 'Sprint review'] 
        },
        { 
            id: 2, 
            name: 'Desarrollo Frontend', 
            members: 12, 
            users: [
                { id: 201, avatar: '../public/images/grupo.svg' }
            ], 
            description: 'Equipo encargado del desarrollo de la plataforma web utilizando React y Vite.',
            events: ['Daily standup', 'Tech talk'] 
        },
        { 
            id: 3, 
            name: 'Marketing Digital', 
            members: 5, 
            users: [
                { id: 301, avatar: '../public/images/grupo.svg' }
            ], 
            description: 'Estrategias de comunicación y posicionamiento de la aplicación.',
            events: ['Campaña marzo'] 
        },
    ];

    function calculateItemsPerPage() {
        const container = document.querySelector('.groups-container');
        if (!container) return;
        const availableWidth = container.clientWidth;
        const cardWidth = 300; 
        const gapX = 40;
        let cols = Math.floor((availableWidth + gapX) / (cardWidth + gapX));
        if (cols < 1) cols = 1;
        ITEMS_PER_PAGE = Math.max(6, cols * 2);
    }

    function showGroupModal(group) {
        let modal = document.getElementById('groupModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'groupModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const renderModalContent = () => {
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${group.name}</h2>
                        <i class="bx bx-x modal-close"></i>
                    </div>
                    <div class="modal-body">
                        <div class="modal-section">
                            <div class="section-header">
                                <h3>Descripción</h3>
                                <i class="bx bx-pencil edit-desc-btn"></i>
                            </div>
                            <div id="descContainer">
                                <p class="desc-text">${group.description || 'Sin descripción.'}</p>
                            </div>
                        </div>
                        <div class="modal-section">
                            <h3>Usuarios en este grupo</h3>
                            <div class="modal-users-container">
                                <button class="modal-add-user-btn">
                                    <i class="bx bx-plus"></i>
                                </button>
                                <div class="modal-users-list">
                                    ${group.users.map(u => `
                                        <div class="user-avatar-wrapper" data-user-id="${u.id}">
                                            <img src="${u.avatar}" class="user-avatar-modal">
                                            <div class="user-action-menu">
                                                <button class="user-delete-btn">Eliminar</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Close modal
            modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
            
            // Edit description
            modal.querySelector('.edit-desc-btn').onclick = () => {
                const container = modal.querySelector('#descContainer');
                const p = container.querySelector('.desc-text');
                const textarea = document.createElement('textarea');
                textarea.className = 'modal-desc-input';
                textarea.value = group.description;
                container.replaceChild(textarea, p);
                textarea.focus();
                textarea.onblur = () => {
                    group.description = textarea.value.trim();
                    renderModalContent();
                };
            };

            // Add user
            modal.querySelector('.modal-add-user-btn').onclick = () => {
                const userId = Date.now();
                group.users.push({ id: userId, avatar: '../public/images/grupo.svg' });
                group.members = group.users.length;
                renderModalContent();
                updateUI();
            };

            // User context menu (toggle)
            modal.querySelectorAll('.user-avatar-modal').forEach(img => {
                img.onclick = (e) => {
                    e.stopPropagation();
                    const menu = img.nextElementSibling;
                    document.querySelectorAll('.user-action-menu').forEach(m => {
                        if (m !== menu) m.classList.remove('active');
                    });
                    menu.classList.toggle('active');
                };
            });

            // Delete user
            modal.querySelectorAll('.user-delete-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const userId = parseInt(btn.closest('.user-avatar-wrapper').dataset.userId);
                    group.users = group.users.filter(u => u.id !== userId);
                    group.members = group.users.length;
                    renderModalContent();
                    updateUI();
                };
            });
        };

        renderModalContent();
        modal.style.display = 'flex';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    function createGroupCard(group) {
        const groupCardWrapper = document.createElement('div');
        groupCardWrapper.className = 'group-card-wrapper';
        groupCardWrapper.dataset.id = group.id;

        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.onclick = () => showGroupModal(group);

        const groupContent = document.createElement('div');
        groupContent.className = 'group-content';
        
        // Only user avatar in bottom right, no centered plus
        const userIconsContainer = document.createElement('div');
        userIconsContainer.className = 'group-card-users';
        const userImg = document.createElement('img');
        userImg.className = 'user-avatar-inside';
        userImg.src = '../public/images/grupo.svg';
        userIconsContainer.appendChild(userImg);
        groupContent.appendChild(userIconsContainer);

        const menuBtn = document.createElement('button');
        menuBtn.className = 'group-menu-btn';
        menuBtn.innerHTML = '<i class="bx bx-dots-vertical-rounded"></i>';
        
        const submenu = document.createElement('div');
        submenu.className = 'group-submenu';
        submenu.innerHTML = `
            <button class="submenu-item action-favorite">Añadir a favoritas</button>
            <button class="submenu-item delete action-delete">Eliminar</button>
        `;

        menuBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.group-submenu').forEach(m => {
                if (m !== submenu) m.classList.remove('active');
            });
            submenu.classList.toggle('active');
        };

        submenu.querySelector('.action-favorite').onclick = (e) => {
            e.stopPropagation();
            submenu.classList.remove('active');
            alert('Añadido a favoritas');
        };

        submenu.querySelector('.action-delete').onclick = (e) => {
            e.stopPropagation();
            if(confirm('¿Seguro que quieres eliminar este grupo?')) {
                groupsData = groupsData.filter(g => g.id !== group.id);
                updateUI();
            }
        };

        groupCard.appendChild(menuBtn);
        groupCard.appendChild(submenu);
        groupCard.appendChild(groupContent);

        const groupFooter = document.createElement('div');
        groupFooter.className = 'group-footer';
        const groupNameContainer = document.createElement('div');
        groupNameContainer.className = 'group-name-container';
        groupNameContainer.innerHTML = `
            <span class="group-name" title="${group.name}">${group.name}</span>
            <i class="bx bx-pencil edit-name-btn"></i>
        `;

        groupNameContainer.querySelector('.edit-name-btn').onclick = (e) => {
            e.stopPropagation();
            const span = groupNameContainer.querySelector('.group-name');
            const currentPencil = groupNameContainer.querySelector('.edit-name-btn');
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'group-name-input';
            input.value = group.name;
            groupNameContainer.replaceChild(input, span);
            currentPencil.style.display = 'none';
            input.focus();
            const save = () => {
                const newName = input.value.trim();
                if (newName) group.name = newName;
                updateUI();
            };
            input.onblur = save;
            input.onkeydown = (ev) => { if (ev.key === 'Enter') save(); };
        };

        groupFooter.appendChild(groupNameContainer);
        groupFooter.insertAdjacentHTML('beforeend', `<span class="group-members">${group.members} miembros</span>`);

        groupCardWrapper.appendChild(groupCard);
        groupCardWrapper.appendChild(groupFooter);
        return groupCardWrapper;
    }

    function createAddGroupCard() {
        const addGroupWrapper = document.createElement('div');
        addGroupWrapper.className = 'group-card-wrapper';
        const addGroupCard = document.createElement('div');
        addGroupCard.className = 'group-card add-group-card-main';
        addGroupCard.innerHTML = `<img src="../public/images/Plus.1.svg" class="create-plus-icon" alt="Add">`;
        
        const addGroupFooter = document.createElement('div');
        addGroupFooter.className = 'group-footer';
        addGroupFooter.innerHTML = `<div class="group-info"><span class="group-name">nuevo grupo</span></div>`;

        addGroupCard.onclick = () => {
            const newName = prompt('Nombre del nuevo grupo:');
            if (newName) {
                groupsData.unshift({
                    id: Date.now(),
                    name: newName,
                    members: 0,
                    users: [],
                    description: '',
                    events: []
                });
                updateUI();
            }
        };

        addGroupWrapper.appendChild(addGroupCard);
        addGroupWrapper.appendChild(addGroupFooter);
        return addGroupWrapper;
    }

    function renderGroups(groups, isFirstPage) {
        groupsGrid.innerHTML = '';
        if (isFirstPage) groupsGrid.appendChild(createAddGroupCard());
        groups.forEach(group => groupsGrid.appendChild(createGroupCard(group)));
    }

    function renderPagination(totalItems) {
        const totalPages = Math.ceil((totalItems + 1) / ITEMS_PER_PAGE);
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
        calculateItemsPerPage();
        const term = groupSearchInput.value.toLowerCase();
        const filtered = groupsData.filter(group => group.name.toLowerCase().includes(term));
        let pageItems;
        if (currentPage === 1) {
            pageItems = filtered.slice(0, ITEMS_PER_PAGE - 1);
        } else {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE - 1;
            pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        }
        renderGroups(pageItems, currentPage === 1);
        renderPagination(filtered.length);
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.group-submenu, .user-action-menu').forEach(m => m.classList.remove('active'));
    });

    groupSearchInput.addEventListener('input', () => { currentPage = 1; updateUI(); });
    window.addEventListener('resize', updateUI);
    updateUI();
});
