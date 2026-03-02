document.addEventListener('DOMContentLoaded', () => {
    const folderSearchInput = document.getElementById('folderSearch');
    const folderGrid = document.getElementById('foldersGrid');
    const paginationList = document.querySelector('.pagination-list');

    const ITEMS_PER_PAGE = 6;
    let currentPage = 1;

    let foldersData = [
        { 
            id: 1, 
            name: 'Personal', 
            hasBackground: true, 
            backgroundImg: '../public/images/Rectangle 129.png',
            eventCount: 5,
            users: ['../public/images/logo_Uni2_Go.svg', '../public/images/logo_Uni2_Go.svg'] 
        },
        { 
            id: 2, 
            name: 'Universidad', 
            hasBackground: true, 
            backgroundImg: '../public/images/Rectangle 130.png',
            eventCount: 12,
            users: ['../public/images/logo_Uni2_Go.svg'] 
        },
        { 
            id: 3, 
            name: 'Trabajo', 
            hasBackground: false, 
            eventCount: 3,
            users: ['../public/images/logo_Uni2_Go.svg', '../public/images/logo_Uni2_Go.svg', '../public/images/logo_Uni2_Go.svg'] 
        },
        { 
            id: 4, 
            name: 'Proyectos', 
            hasBackground: false, 
            eventCount: 8,
            users: ['../public/images/logo_Uni2_Go.svg'] 
        },
        { id: 5, name: 'Viajes', hasBackground: false, eventCount: 2, users: [] },
        { id: 6, name: 'Hogar', hasBackground: false, eventCount: 0, users: [] },
        { id: 7, name: 'Deportes', hasBackground: false, eventCount: 4, users: [] },
        { id: 8, name: 'Música', hasBackground: false, eventCount: 1, users: [] },
    ];

    function createFolderCard(folder) {
        const folderCardWrapper = document.createElement('div');
        folderCardWrapper.className = 'folder-card-wrapper';
        folderCardWrapper.dataset.id = folder.id;

        const folderCard = document.createElement('div');
        folderCard.className = `folder-card ${folder.hasBackground ? '' : 'folder-empty'}`;
        
        let cardContent = '';
        if (folder.hasBackground) {
            cardContent += `<img src="${folder.backgroundImg}" class="folder-bg" alt="Folder Background">`;
            cardContent += `<div class="folder-content"></div>`;
        } else {
            cardContent += `
                <div class="folder-content">
                    <img src="../public/images/av5c8336583e291842624 1.png" class="folder-icon" />
                </div>
            `;
        }

        cardContent += `
            <button class="folder-menu-btn">
                <i class="bx bx-dots-vertical-rounded"></i>
            </button>
            <div class="folder-menu">
                <button class="folder-menu-item action-add-photo">Añadir foto</button>
                <button class="folder-menu-item delete action-delete">Eliminar</button>
            </div>
        `;
        
        folderCard.innerHTML = cardContent;

        const folderFooter = document.createElement('div');
        folderFooter.className = 'folder-footer';
        
        const folderInfo = document.createElement('div');
        folderInfo.className = 'folder-info';
        folderInfo.innerHTML = `
            <div class="folder-name-container">
                <span class="folder-name" title="${folder.name}">${folder.name}</span>
                <i class="bx bx-pencil edit-folder-btn"></i>
            </div>
            <span class="folder-events">${folder.eventCount} eventos</span>
        `;

        const editBtn = folderInfo.querySelector('.edit-folder-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = folderInfo.querySelector('.folder-name-container');
            const originalName = folder.name;
            
            container.innerHTML = `<input type="text" class="folder-name-input" value="${originalName}" />`;
            const input = container.querySelector('.folder-name-input');
            input.focus();
            input.select();

            const saveEdit = () => {
                const newName = input.value.trim();
                if (newName && newName !== originalName) {
                    folder.name = newName;
                    updateUI();
                } else {
                    cancelEdit();
                }
            };

            const cancelEdit = () => {
                container.innerHTML = `
                    <span class="folder-name">${folder.name}</span>
                    <i class="bx bx-pencil edit-folder-btn"></i>
                `;
                // Re-attach listener since we replaced the HTML
                container.querySelector('.edit-folder-btn').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    editBtn.click(); // Trigger same logic
                });
            };

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') saveEdit();
                if (ev.key === 'Escape') cancelEdit();
            });

            input.addEventListener('blur', () => {
                setTimeout(saveEdit, 100);
            });
        });

        const userIconsContainer = document.createElement('div');
        userIconsContainer.className = 'folder-users';
        folder.users.forEach(userIconPath => {
            const userImg = document.createElement('img');
            userImg.className = 'user-avatar-img';
            userImg.src = userIconPath;
            userIconsContainer.appendChild(userImg);
        });

        folderFooter.appendChild(folderInfo);
        folderFooter.appendChild(userIconsContainer);
        
        folderCardWrapper.appendChild(folderCard);
        folderCardWrapper.appendChild(folderFooter);
        return folderCardWrapper;
    }

    function createAddFolderCard() {
        const addFolderWrapper = document.createElement('div');
        addFolderWrapper.className = 'folder-card-wrapper';
        
        const addFolderBtn = document.createElement('div');
        addFolderBtn.className = 'folder-card add-folder-card folder-empty';
        addFolderBtn.id = 'addFolderBtn';
        addFolderBtn.innerHTML = `
            <div class="folder-content">
                <i class="bx bx-plus"></i>
            </div>
        `;
        
        const addFolderFooter = document.createElement('div');
        addFolderFooter.className = 'folder-footer';
        addFolderFooter.innerHTML = `
            <div class="folder-info">
                <span class="folder-name">Nueva Carpeta</span>
            </div>
        `;

        addFolderWrapper.appendChild(addFolderBtn);
        addFolderWrapper.appendChild(addFolderFooter);

        let isCreating = false;
        
        addFolderBtn.addEventListener('click', () => {
            if (isCreating) return;
            isCreating = true;

            const folderInfo = addFolderFooter.querySelector('.folder-info');
            const originalHTML = folderInfo.innerHTML;

            folderInfo.innerHTML = `
                <input type="text" class="folder-name-input" placeholder="Nombre..." />
            `;

            const input = folderInfo.querySelector('.folder-name-input');
            input.focus();

            const handleConfirm = () => {
                const folderName = input.value.trim();
                if (folderName) {
                    const newFolder = {
                        id: Date.now(),
                        name: folderName,
                        hasBackground: false,
                        eventCount: 0,
                        users: []
                    };
                    foldersData.unshift(newFolder);
                    isCreating = false;
                    updateUI();
                } else {
                    handleCancel();
                }
            };

            const handleCancel = () => {
                isCreating = false;
                folderInfo.innerHTML = originalHTML;
            };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    handleConfirm();
                }
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    handleCancel();
                }
            });

            // Cancel if user clicks away
            input.addEventListener('blur', () => {
                setTimeout(() => {
                    if (isCreating) handleCancel();
                }, 100);
            });
        });

        return addFolderWrapper;
    }

    function renderFolders(folders, isFirstPage) {
        folderGrid.innerHTML = '';
        
        if (isFirstPage) {
            folderGrid.appendChild(createAddFolderCard());
        }
        
        folders.forEach(folder => {
            folderGrid.appendChild(createFolderCard(folder));
        });
    }

    function renderPagination(totalItems) {
        // totalItems + 1 because the "Add Folder" button always takes the first slot on the first page
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
        const term = folderSearchInput.value.toLowerCase();
        const filtered = foldersData.filter(folder => 
            folder.name.toLowerCase().includes(term)
        );

        // We use ITEMS_PER_PAGE - 1 on the first page because the "Add" button takes a slot
        let pageItems;
        if (currentPage === 1) {
            pageItems = filtered.slice(0, ITEMS_PER_PAGE - 1);
        } else {
            // Adjust slice for subsequent pages
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE - 1;
            pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        }

        renderFolders(pageItems, currentPage === 1);
        renderPagination(filtered.length);
    }

    // Menu handlers
    folderGrid.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.folder-menu-btn');
        if (menuBtn) {
            const menu = menuBtn.nextElementSibling;
            document.querySelectorAll('.folder-menu').forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });
            menu.classList.toggle('active');
            return;
        }

        if (e.target.classList.contains('action-delete')) {
            const id = parseInt(e.target.closest('.folder-card-wrapper').dataset.id);
            foldersData = foldersData.filter(f => f.id !== id);
            updateUI();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.folder-card')) {
            document.querySelectorAll('.folder-menu').forEach(m => m.classList.remove('active'));
        }
    });

    folderSearchInput.addEventListener('input', () => { 
        currentPage = 1; 
        updateUI(); 
    });

    updateUI();
});
