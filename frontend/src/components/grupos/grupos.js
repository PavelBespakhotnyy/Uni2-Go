document.addEventListener('DOMContentLoaded', () => {
    const groupSearchInput = document.getElementById('groupSearch');
    const groupsGrid = document.getElementById('groupsGrid');
    const paginationList = document.querySelector('.pagination-list');

    let ITEMS_PER_PAGE = 6;
    let currentPage = 1;

    let groupsData = [
        { id: 1, name: 'Equipo de Diseño', members: 8, users: ['../public/images/grupo.svg'], events: ['Reunión semanal', 'Sprint review'] },
        { id: 2, name: 'Desarrollo Frontend', members: 12, users: ['../public/images/grupo.svg'], events: ['Daily standup', 'Tech talk'] },
        { id: 3, name: 'Marketing Digital', members: 5, users: ['../public/images/grupo.svg'], events: ['Campaña marzo'] },
        { id: 4, name: 'Gestión de Proyectos', members: 15, users: ['../public/images/grupo.svg'], events: ['Planificación Q2'] },
        { id: 5, name: 'Ciencia de Datos', members: 6, users: [], events: [] },
        { id: 6, name: 'Ciberseguridad', members: 4, users: [], events: [] },
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

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${group.name}</h2>
                    <i class="bx bx-x modal-close"></i>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h3>Eventos</h3>
                        <ul>
                            ${group.events && group.events.length ? group.events.map(e => `<li>${e}</li>`).join('') : '<li>No hay eventos</li>'}
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h3>Usuarios</h3>
                        <div class="modal-users">
                            ${group.users && group.users.length ? group.users.map(() => `<img src="../public/images/grupo.svg" class="user-avatar-modal">`).join('') : 'No hay usuarios'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        modal.querySelector('.modal-close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    function createGroupCard(group) {
        const groupCardWrapper = document.createElement('div');
        groupCardWrapper.className = 'group-card-wrapper';
        groupCardWrapper.dataset.id = group.id;

        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        
        const groupContent = document.createElement('div');
        groupContent.className = 'group-content';
        
        const userIconsContainer = document.createElement('div');
        userIconsContainer.className = 'group-card-users';
        const userImg = document.createElement('img');
        userImg.className = 'user-avatar-inside';
        userImg.src = '../public/images/grupo.svg';
        userIconsContainer.appendChild(userImg);

        const addUserBtn = document.createElement('button');
        addUserBtn.className = 'add-user-btn combined-plus';
        addUserBtn.innerHTML = `
            <img src="../public/images/Rectangle 154.svg" class="rect-bg" alt="Bg">
            <img src="../public/images/Plus.svg" class="plus-icon" alt="Add">
        `;
        addUserBtn.onclick = (e) => { e.stopPropagation(); alert('Añadir usuario'); };

        groupContent.appendChild(userIconsContainer);
        groupContent.appendChild(addUserBtn);

        const menuBtn = document.createElement('button');
        menuBtn.className = 'group-menu-btn';
        menuBtn.innerHTML = '<i class="bx bx-dots-vertical-rounded"></i>';
        
        const submenu = document.createElement('div');
        submenu.className = 'group-submenu';
        submenu.innerHTML = `
            <button class="submenu-item action-open">Abrir</button>
            <button class="submenu-item delete">Eliminar</button>
        `;

        menuBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.group-submenu').forEach(m => {
                if (m !== submenu) m.classList.remove('active');
            });
            submenu.classList.toggle('active');
        };

        submenu.querySelector('.action-open').onclick = (e) => {
            e.stopPropagation();
            submenu.classList.remove('active');
            showGroupModal(group);
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
                if (newName) {
                    group.name = newName;
                }
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
        addGroupCard.innerHTML = `
            <img src="../public/images/Plus.1.svg" class="create-plus-icon" alt="Add">
        `;
        
        const addGroupFooter = document.createElement('div');
        addGroupFooter.className = 'group-footer';
        addGroupFooter.innerHTML = `
            <div class="group-info">
                <span class="group-name">nuevo grupo</span>
            </div>
        `;

        addGroupCard.onclick = () => {
            const newName = prompt('Nombre del nuevo grupo:');
            if (newName) {
                groupsData.unshift({
                    id: Date.now(),
                    name: newName,
                    members: 0,
                    users: [],
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
        document.querySelectorAll('.group-submenu').forEach(m => m.classList.remove('active'));
    });

    groupSearchInput.addEventListener('input', () => { currentPage = 1; updateUI(); });
    window.addEventListener('resize', updateUI);
    updateUI();
});
