import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { gruposService } from '../../services/gruposService.js';
import { friendsService } from '../../services/friendsService.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let groupsData = [];
    let unsubscribeGroups = null;

    const groupsGrid = document.getElementById('groupsGrid');
    const groupSearchInput = document.getElementById('groupSearch');

    // Ocultar paginación (no se necesita con datos en tiempo real)
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) paginationContainer.style.display = 'none';

    // ── Auth ──────────────────────────────────────────────
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            startListeningGroups();
        }
    });

    function startListeningGroups() {
        if (unsubscribeGroups) unsubscribeGroups();
        unsubscribeGroups = gruposService.listenMyGroups(currentUser.uid, (groups) => {
            groupsData = groups;
            updateUI();
        });
    }

    // ── UI Update ─────────────────────────────────────────
    function updateUI() {
        const term = groupSearchInput.value.toLowerCase();
        const filtered = groupsData.filter(g =>
            g.name.toLowerCase().includes(term)
        );
        renderGroups(filtered);
    }

    function renderGroups(groups) {
        groupsGrid.innerHTML = '';
        groupsGrid.appendChild(createAddCard());

        if (groups.length === 0 && groupSearchInput.value) {
            groupsGrid.appendChild(emptyState('bx-search-alt', 'No se encontraron grupos'));
            return;
        }
        if (groups.length === 0) {
            groupsGrid.appendChild(emptyState('bx-group', '¡Aún no tienes grupos. Crea el primero!'));
            return;
        }

        groups.forEach(g => groupsGrid.appendChild(createGroupCard(g)));
    }

    function emptyState(icon, text) {
        const el = document.createElement('div');
        el.className = 'empty-state';
        el.innerHTML = `<i class="bx ${icon}"></i><p>${text}</p>`;
        return el;
    }

    // ── Color / initials helpers ──────────────────────────
    const CARD_COLORS = ['#fce4e4', '#dce8f8', '#d8f0d8', '#fddcb0', '#f8d8f0', '#e8e0f8', '#fef3cc', '#d8f0f0'];
    const MEMBER_COLORS = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#0056FF'];
    const EMOJIS = [
        '👥', '🏠', '🎓', '🏀', '🍕', '✈️', '🎮', '💡', '🎉', '💼',
        '❤️', '🌟', '🔥', '📚', '🎨', '🎬', '🎸', '🌈', '🐶', '🐱',
        '🍎', '🍺', '⚽', '🚗', '📱', '💻', '🔒', '🛠️', '🌍', '🚀'
    ];

    function avatarColor(str) {
        if (!str) return CARD_COLORS[0];
        let h = 0;
        for (const c of str) h = ((h << 5) - h) + c.charCodeAt(0);
        return CARD_COLORS[Math.abs(h) % CARD_COLORS.length];
    }

    function memberAvatarColor(str) {
        if (!str) return MEMBER_COLORS[0];
        let h = 0;
        for (const c of str) h = ((h << 5) - h) + c.charCodeAt(0);
        return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
    }

    function initials(name, surname) {
        const n = (name || '').trim();
        const s = (surname || '').trim();
        if (n && s) return (n[0] + s[0]).toUpperCase();
        if (n) return n.substring(0, 2).toUpperCase();
        return '?';
    }

    function groupInitials(groupName) {
        if (!groupName) return '?';
        const words = groupName.trim().split(/\s+/);
        return words.length === 1
            ? words[0].substring(0, 2).toUpperCase()
            : (words[0][0] + words[1][0]).toUpperCase();
    }

    // ── Cards ─────────────────────────────────────────────
    function createAddCard() {
        const card = document.createElement('div');
        card.className = 'group-card add-card';
        card.innerHTML = `
            <div class="add-card-placeholder"><i class="bx bx-plus"></i></div>
            <span class="add-card-label">Nuevo grupo</span>
        `;
        card.addEventListener('click', () => showCreateGroupModal());
        return card;
    }

    function createGroupCard(group) {
        const card = document.createElement('div');
        card.className = 'group-card';

        const color = avatarColor(group.name);

        const displayName = group.name
            ? group.name.charAt(0).toUpperCase() + group.name.slice(1)
            : group.name;

        card.style.backgroundColor = color;
        card.innerHTML = `
            <div class="card-emoji-container">${group.emoji || '👥'}</div>
            <span class="card-group-name" title="${displayName}">${displayName}</span>
            <button class="group-card-menu-btn" title="Opciones">
                <i class="bx bx-dots-vertical-rounded"></i>
            </button>
            <div class="card-members-strip"></div>
            <div class="group-card-submenu">
                <button class="submenu-item delete action-delete">
                    <i class="bx bx-trash"></i> Eliminar grupo
                </button>
            </div>
        `;

        loadCardMembers(card, group);

        // Abrir modal al hacer clic en la tarjeta (excepto botón de menú)
        card.addEventListener('click', () => showGroupModal(group));

        // Menú de tres puntos
        const menuBtn = card.querySelector('.group-card-menu-btn');
        const submenu = card.querySelector('.group-card-submenu');

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.group-card-submenu.active').forEach(m => {
                if (m !== submenu) m.classList.remove('active');
            });
            submenu.classList.toggle('active');
        });

        card.querySelector('.action-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            submenu.classList.remove('active');
            showConfirmDialog(
                `¿Eliminar "${group.name}"?`,
                'Esta acción no se puede deshacer.',
                async () => {
                    try {
                        await gruposService.deleteGroup(group.id);
                        showToast('Grupo eliminado', 'success');
                    } catch {
                        showToast('Error al eliminar el grupo', 'error');
                    }
                }
            );
        });

        return card;
    }

    async function loadCardMembers(card, group) {
        const strip = card.querySelector('.card-members-strip');
        if (!strip) return;
        const ids = (group.member_ids || []).slice(0, 4);
        if (ids.length === 0) return;
        try {
            const members = await gruposService.getMemberDetails(ids);
            strip.innerHTML = members.map(m => {
                const inits = initials(m.name, m.surname);
                const c = memberAvatarColor(m.name || m.id);
                return `<div class="card-member-avatar" style="background-color:${c}">${inits}</div>`;
            }).join('');
        } catch { /* fallo silencioso */ }
    }

    // ── Group detail modal ────────────────────────────────
    async function showGroupModal(group) {
        const modal = getOrCreateModal('groupDetailModal');
        modal.querySelector('.modal-title').textContent = group.name;
        modal.querySelector('.modal-body').innerHTML = `
            <div class="modal-loading">
                <div class="loading-spinner"></div>
                <p>Cargando miembros...</p>
            </div>
        `;
        modal.classList.add('active');

        try {
            // 1. Obtener documentos de la subcolección members
            const memberDocs = await gruposService.getGroupMembers(group.id);
            // 2. Obtener datos de usuario (name, surname, friend_code, thumbnail)
            const userIds = memberDocs.map(m => m.id);
            const userDetails = await gruposService.getMemberDetails(userIds);
            // 3. Combinar rol con datos de usuario
            const members = memberDocs.map(md => {
                const user = userDetails.find(u => u.id === md.id) || { id: md.id };
                return { ...user, role: md.role, joined_at: md.joined_at };
            });

            renderGroupModalBody(modal, group, members);
        } catch (e) {
            console.error(e);
            modal.querySelector('.modal-body').innerHTML =
                '<p style="color:#aaa;text-align:center;padding:40px">Error al cargar los miembros.</p>';
        }
    }

    function renderGroupModalBody(modal, group, members) {
        const color = avatarColor(group.name);
        const isAdmin = members.some(m => m.id === currentUser.uid && m.role === 'admin');

        modal.querySelector('.modal-title').textContent = group.name;
        modal.querySelector('.modal-body').innerHTML = `
            <div class="modal-group-header">
                <div class="modal-group-avatar" style="background-color:${color}">
                    ${group.emoji || groupInitials(group.name)}
                </div>
                <div class="modal-group-title-area">
                    <h2 class="modal-group-name">${group.name}</h2>
                    <p class="modal-group-desc">${group.description || 'Sin descripción'}</p>
                </div>
                ${isAdmin
                    ? '<button class="modal-edit-btn" title="Editar grupo"><i class="bx bx-pencil"></i></button>'
                    : ''}
            </div>

            <div class="modal-members-section">
                <div class="modal-members-header">
                    <h3>Miembros (${members.length})</h3>
                    ${isAdmin
                        ? `<button class="modal-add-member-btn">
                               <i class="bx bx-user-plus"></i> Añadir
                           </button>`
                        : ''}
                </div>

                ${isAdmin
                    ? `<div class="add-member-form" id="addMemberForm" style="display:none">
                           <select id="addMemberSelect" class="member-code-input">
                               <option value="">Cargando amigos...</option>
                           </select>
                           <button class="add-member-submit-btn" id="addMemberSubmitBtn"><i class="bx bx-check"></i></button>
                           <button class="add-member-cancel-btn" id="addMemberCancelBtn"><i class="bx bx-x"></i></button>
                       </div>`
                    : ''}

                <ul class="modal-members-list">
                    ${members.map(m => {
                        const hasName = m.name || m.surname;
                        const displayName = hasName
                            ? `${m.name || ''} ${m.surname || ''}`.trim()
                            : m.id;
                        const inits = initials(m.name, m.surname);
                        const memberColor = avatarColor(m.name || m.id);
                        const isMe = m.id === currentUser.uid;
                        const canRemove = isAdmin && !isMe && m.role !== 'admin';

                        return `
                        <li class="modal-member-item">
                            <div class="member-avatar" style="background-color:${memberColor}">${inits}</div>
                            <div class="member-info">
                                <span class="member-name">${displayName}</span>
                                <span class="member-code">${m.username ? '@' + m.username : ''}</span>
                            </div>
                            ${isMe
                                ? '<span class="member-you-badge">Tú</span>'
                                : m.role === 'admin'
                                    ? '<span class="member-role-badge">Admin</span>'
                                    : ''
                            }
                            ${canRemove
                                ? `<button class="member-remove-btn" data-uid="${m.id}" title="Eliminar del grupo">
                                       <i class="bx bx-user-minus"></i>
                                   </button>`
                                : ''}
                        </li>`;
                    }).join('')}
                </ul>
            </div>
        `;

        // Botón editar (solo admin)
        const editBtn = modal.querySelector('.modal-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => showEditGroupForm(modal, group));
        }

        // Toggle form añadir miembro (solo admin)
        const addBtn = modal.querySelector('.modal-add-member-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const form = modal.querySelector('#addMemberForm');
                const hidden = form.style.display === 'none';
                form.style.display = hidden ? 'flex' : 'none';
                if (hidden) {
                    const select = modal.querySelector('#addMemberSelect');
                    select.innerHTML = '<option value="">Cargando...</option>';
                    try {
                        const currentMemberIds = members.map(m => m.id);
                        const friends = await friendsService.getFriends(currentUser.uid);
                        const available = friends.filter(f => !currentMemberIds.includes(f.uid));
                        if (available.length === 0) {
                            select.innerHTML = '<option value="">No hay amigos para añadir</option>';
                        } else {
                            select.innerHTML = '<option value="">Selecciona un amigo</option>' +
                                available.map(f =>
                                    `<option value="${f.uid}">${f.name} ${f.surname} @${f.username}</option>`
                                ).join('');
                        }
                    } catch {
                        select.innerHTML = '<option value="">Error al cargar amigos</option>';
                    }
                    select.focus();
                }
            });

            const submitBtn = modal.querySelector('#addMemberSubmitBtn');
            submitBtn.addEventListener('click', async () => {
                const uid = modal.querySelector('#addMemberSelect').value;
                if (!uid) return;
                submitBtn.disabled = true;
                try {
                    await gruposService.addMemberByUid(group.id, uid);
                    showToast('Miembro añadido', 'success');
                    await refreshGroupModal(modal, group.id);
                } catch (e) {
                    showToast(e.message || 'Error al añadir miembro', 'error');
                    submitBtn.disabled = false;
                }
            });

            modal.querySelector('#addMemberCancelBtn').addEventListener('click', () => {
                modal.querySelector('#addMemberForm').style.display = 'none';
            });
        }

        // Eliminar miembro (solo admin, solo no-admins)
        modal.querySelectorAll('.member-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = btn.dataset.uid;
                const member = members.find(m => m.id === uid);
                const displayName = member?.name
                    ? `${member.name} ${member.surname || ''}`.trim()
                    : 'este miembro';

                showConfirmDialog(
                    `¿Eliminar a ${displayName}?`,
                    'El miembro será eliminado del grupo.',
                    async () => {
                        try {
                            await gruposService.removeMember(group.id, uid);
                            showToast('Miembro eliminado', 'success');
                            await refreshGroupModal(modal, group.id);
                        } catch {
                            showToast('Error al eliminar miembro', 'error');
                        }
                    }
                );
            });
        });
    }

    async function refreshGroupModal(modal, groupId) {
        try {
            const updatedGroup = await gruposService.getGroupById(groupId);
            if (!updatedGroup) return;
            const memberDocs = await gruposService.getGroupMembers(groupId);
            const userDetails = await gruposService.getMemberDetails(memberDocs.map(m => m.id));
            const members = memberDocs.map(md => ({
                ...userDetails.find(u => u.id === md.id) || { id: md.id },
                role: md.role,
                joined_at: md.joined_at
            }));
            renderGroupModalBody(modal, updatedGroup, members);
        } catch (e) {
            console.error('Error al refrescar modal:', e);
        }
    }

    // ── Edit group form ───────────────────────────────────
    function showEditGroupForm(modal, group) {
        let selectedEmoji = group.emoji || '👥';

        modal.querySelector('.modal-body').innerHTML = `
            <div class="edit-group-form">
                <div class="form-group emoji-selection-group">
                    <label>Icono del grupo</label>
                    <div class="emoji-picker">
                        ${EMOJIS.map(e => `<span class="emoji-option ${e === selectedEmoji ? 'active' : ''}" data-emoji="${e}">${e}</span>`).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>Nombre del grupo</label>
                    <input type="text" id="editGroupName" class="edit-group-input" value="${group.name}">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="editGroupDesc" class="edit-group-textarea">${group.description || ''}</textarea>
                </div>
                <div class="edit-form-actions">
                    <button class="btn-cancel" id="cancelEditBtn">Cancelar</button>
                    <button class="btn-save" id="saveEditBtn">Guardar</button>
                </div>
            </div>
        `;

        const emojiOptions = modal.querySelectorAll('.emoji-option');
        emojiOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                emojiOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                selectedEmoji = opt.dataset.emoji;
            });
        });

        modal.querySelector('#cancelEditBtn').addEventListener('click', async () => {
            await refreshGroupModal(modal, group.id);
        });

        modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
            const newName = modal.querySelector('#editGroupName').value.trim();
            const newDesc = modal.querySelector('#editGroupDesc').value.trim();
            if (!newName) { showToast('El nombre no puede estar vacío', 'error'); return; }

            const saveBtn = modal.querySelector('#saveEditBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';

            try {
                await gruposService.updateGroup(group.id, { 
                    name: newName, 
                    description: newDesc,
                    emoji: selectedEmoji
                });
                showToast('Grupo actualizado', 'success');
                await refreshGroupModal(modal, group.id);
            } catch {
                showToast('Error al actualizar el grupo', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
        });
    }

    // ── Create group modal ────────────────────────────────
    async function showCreateGroupModal() {
        const modal = getOrCreateModal('createGroupModal');
        let selectedFriends = [];
        let selectedEmoji = '👥';

        modal.querySelector('.modal-title').textContent = 'Nuevo grupo';
        modal.querySelector('.modal-body').innerHTML = `
            <div class="create-group-form">
                <div class="form-group emoji-selection-group">
                    <label>Icono del grupo</label>
                    <div class="emoji-picker">
                        ${EMOJIS.map(e => `<span class="emoji-option ${e === selectedEmoji ? 'active' : ''}" data-emoji="${e}">${e}</span>`).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label>Nombre del grupo *</label>
                    <input type="text" id="newGroupName" class="form-input" placeholder="Ej: Compañeros de piso">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="newGroupDesc" class="form-textarea" placeholder="Descripción opcional..."></textarea>
                </div>

                <div class="form-group">
                    <label>Añadir amigos</label>
                    <div class="friend-selector-container">
                        <select id="friendSelect" class="form-input">
                            <option value="">Cargando amigos...</option>
                        </select>
                        <button type="button" class="btn-add-friend" id="btnAddFriendToGroup"><i class="bx bx-plus"></i></button>
                    </div>
                    <div class="selected-friends-list" id="selectedFriendsList">
                        <!-- Selected friends will appear here -->
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-cancel" id="cancelCreateBtn">Cancelar</button>
                    <button class="btn-save" id="submitCreateBtn">Crear grupo</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
        
        const emojiOptions = modal.querySelectorAll('.emoji-option');
        emojiOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                emojiOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                selectedEmoji = opt.dataset.emoji;
            });
        });

        const friendSelect = modal.querySelector('#friendSelect');
        let friends = [];
        try {
            friends = await friendsService.getFriends(currentUser.uid);
            friendSelect.innerHTML = '<option value="">Selecciona un amigo</option>' +
                friends.map(f => `<option value="${f.uid}">${f.name} ${f.surname}</option>`).join('');
        } catch {
            friendSelect.innerHTML = '<option value="">Error al cargar amigos</option>';
        }

        const friendsListEl = modal.querySelector('#selectedFriendsList');
        const updateFriendsUI = () => {
            friendsListEl.innerHTML = selectedFriends.map(f => `
                <div class="selected-friend-tag">
                    <span>${f.name} ${f.surname}</span>
                    <i class="bx bx-x remove-friend" data-uid="${f.uid}"></i>
                </div>
            `).join('');
            
            friendsListEl.querySelectorAll('.remove-friend').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectedFriends = selectedFriends.filter(sf => sf.uid !== btn.dataset.uid);
                    updateFriendsUI();
                });
            });
        };

        modal.querySelector('#btnAddFriendToGroup').addEventListener('click', () => {
            const uid = friendSelect.value;
            if (!uid) return;
            if (selectedFriends.some(f => f.uid === uid)) {
                showToast('Este amigo уже добавлен', 'error');
                return;
            }
            const friend = friends.find(f => f.uid === uid);
            if (friend) {
                selectedFriends.push(friend);
                updateFriendsUI();
                friendSelect.value = '';
            }
        });

        modal.querySelector('#cancelCreateBtn').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.querySelector('#submitCreateBtn').addEventListener('click', async () => {
            const name = modal.querySelector('#newGroupName').value.trim();
            const desc = modal.querySelector('#newGroupDesc').value.trim();
            if (!name) { showToast('El nombre es obligatorio', 'error'); return; }

            const btn = modal.querySelector('#submitCreateBtn');
            btn.disabled = true;
            btn.textContent = 'Creando...';

            try {
                const memberIds = selectedFriends.map(f => f.uid);
                await gruposService.createGroup(name, desc, currentUser.uid, selectedEmoji, memberIds);
                modal.classList.remove('active');
                showToast('Grupo creado', 'success');
            } catch (e) {
                console.error(e);
                showToast('Error al crear el grupo', 'error');
                btn.disabled = false;
                btn.textContent = 'Crear grupo';
            }
        });
    }

    // ── Modal factory ─────────────────────────────────────
    function getOrCreateModal(id) {
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = id;
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="modal-title"></span>
                        <button class="modal-close-btn"><i class="bx bx-x"></i></button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.modal-close-btn').addEventListener('click', () =>
                modal.classList.remove('active')
            );
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
        return modal;
    }

    // ── Confirm dialog ────────────────────────────────────
    function showConfirmDialog(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn-cancel" id="confirmCancelBtn">Cancelar</button>
                    <button class="btn-confirm-delete" id="confirmOkBtn">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirmCancelBtn').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#confirmOkBtn').addEventListener('click', async () => {
            overlay.remove();
            await onConfirm();
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    // ── Toast ─────────────────────────────────────────────
    function showToast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ── Event listeners ───────────────────────────────────
    groupSearchInput.addEventListener('input', () => updateUI());

    document.addEventListener('click', () => {
        document.querySelectorAll('.group-card-submenu.active').forEach(m => m.classList.remove('active'));
    });
});
