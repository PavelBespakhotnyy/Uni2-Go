import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { shoppingService } from '../../services/shoppingService.js';
import { Picker } from 'emoji-mart';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnShowLists = document.getElementById('btn-show-lists');
    const btnShowNotes = document.getElementById('btn-show-notes');
    const listsContainer = document.getElementById('sidebar-lists-container');
    const notesSidebarContainer = document.getElementById('sidebar-notes-container');
    const addListBtn = document.getElementById('add-list-btn');
    const addNoteBtn = document.getElementById('add-note-btn');
    
    const productsView = document.getElementById('products-list');
    const notesView = document.getElementById('notes-list');
    const addProductBtn = document.getElementById('add-product-btn');
    
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentInput = document.getElementById('note-content-input');
    const saveStatusEl = document.getElementById('save-status');

    // Emoji Picker Setup
    let pickerTargetIdx = null;
    let lastClickedEmoji = null;
    let lastClickTime = 0;

    const pickerContainer = document.createElement('div');
    pickerContainer.id = 'emoji-picker-container';
    pickerContainer.style.position = 'fixed';
    pickerContainer.style.zIndex = '2000';
    pickerContainer.style.display = 'none';
    document.body.appendChild(pickerContainer);
    
    const picker = new Picker({
        parent: pickerContainer,
        categories: ['foods', 'objects', 'symbols'], // Еда, хозтовары, канцелярия
        onEmojiSelect: (emojiData) => {
            const now = Date.now();
            const emoji = emojiData.native;
            
            // Detect double click on the same emoji inside the picker
            if (lastClickedEmoji === emoji && (now - lastClickTime) < 500) {
                if (pickerTargetIdx !== null && selectedListId) {
                    const item = data.lists[selectedListId].items[pickerTargetIdx];
                    item.emoji = emoji; 
                    renderProducts();
                    triggerAutoSave();
                    
                    // After picking emoji, focus name input if empty
                    const card = productsView.querySelector(`.product-card[data-index="${pickerTargetIdx}"]`);
                    if (card && (!item.name || item.name === '')) {
                        const nameSpan = card.querySelector('.product-name');
                        if (nameSpan) nameSpan.click();
                    }
                }
                pickerContainer.style.display = 'none';
                lastClickedEmoji = null;
            } else {
                lastClickedEmoji = emoji;
                lastClickTime = now;
            }
        },
        onClickOutside: () => {
            if (pickerContainer.style.display === 'block') {
                pickerContainer.style.display = 'none';
                lastClickedEmoji = null;
            }
        }
    });

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (pickerContainer.style.display === 'block' && 
            !pickerContainer.contains(e.target) && 
            !e.target.closest('.product-img-container')) {
            pickerContainer.style.display = 'none';
            lastClickedEmoji = null;
        }
    });

    // State
    let currentUser = null;
    let currentMode = 'lists';
    let selectedListId = null;
    let selectedNoteId = null;
    let isSaving = false;

    let data = {
        lists: {},
        notes: {}
    };

    // Helper: Debounce for auto-saving
    let saveTimeout;
    function triggerAutoSave() {
        if (!currentUser) return;
        clearTimeout(saveTimeout);
        
        saveStatusEl.classList.add('visible');
        saveStatusEl.querySelector('span').innerText = 'Guardando...';
        saveStatusEl.querySelector('.spinner').style.display = 'block';

        saveTimeout = setTimeout(async () => {
            try {
                isSaving = true;
                if (currentMode === 'lists' && selectedListId) {
                    const id = await shoppingService.saveList(currentUser.uid, selectedListId, data.lists[selectedListId]);
                    if (selectedListId !== id) {
                        data.lists[id] = data.lists[selectedListId];
                        delete data.lists[selectedListId];
                        selectedListId = id;
                        renderSidebarLists();
                    }
                } else if (currentMode === 'notes' && selectedNoteId) {
                    const id = await shoppingService.saveNote(currentUser.uid, selectedNoteId, data.notes[selectedNoteId]);
                    if (selectedNoteId !== id) {
                        data.notes[id] = data.notes[selectedNoteId];
                        delete data.notes[selectedNoteId];
                        selectedNoteId = id;
                        renderSidebarNotes();
                    }
                }
                
                saveStatusEl.querySelector('span').innerText = 'Guardado';
                saveStatusEl.querySelector('.spinner').style.display = 'none';
                setTimeout(() => { if (!isSaving) saveStatusEl.classList.remove('visible'); }, 2000);
            } catch (err) {
                console.error("Save failed:", err);
                saveStatusEl.querySelector('span').innerText = 'Error al guardar';
                saveStatusEl.querySelector('.spinner').style.display = 'none';
            } finally {
                isSaving = false;
            }
        }, 1500);
    }

    // Auth & Data loading
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            data.lists = await shoppingService.getUserLists(user.uid);
            data.notes = await shoppingService.getUserNotes(user.uid);
            
            if (Object.keys(data.lists).length > 0) {
                selectedListId = Object.keys(data.lists)[0];
            } else {
                const tempId = 'list-new-' + Date.now();
                data.lists[tempId] = {
                    name: "Lista de la compra",
                    description: "Qué hay que comprar",
                    color_tag: "#f28c18",
                    is_shared: false,
                    shared_with: [],
                    items: [
                        { name: "Tomate", quantity: 2, unit: "uds.", is_purchased: false, category: "Alimentación" },
                        { name: "Leche", quantity: 1, unit: "uds.", is_purchased: false, category: "Alimentación" }
                    ]
                };
                selectedListId = tempId;
                triggerAutoSave();
            }
            
            if (Object.keys(data.notes).length > 0) {
                selectedNoteId = Object.keys(data.notes)[0];
            }
            
            renderSidebarLists();
            renderSidebarNotes();
            renderProducts();
            loadNoteContent();
        }
    });

    // Icons logic
    function getProductIcon(name) {
        const lowerName = name.toLowerCase();
        const iconMap = {
            'leche': 'milk', 'pan': 'bread', 'huevo': 'eggs', 'queso': 'cheese',
            'jamon': 'ham', 'pera': 'pear', 'manzana': 'apple', 'platano': 'banana',
            'carne': 'steak', 'pollo': 'poultry-leg', 'pescado': 'fish', 'arroz': 'rice',
            'pasta': 'spaghetti', 'yogur': 'yogurt', 'aceite': 'olive-oil',
            'cervez': 'beer', 'vino': 'wine', 'cafe': 'coffee', 'tarta': 'pie',
            'bombones': 'candy', 'limpiador': 'spray', 'lejia': 'bleach',
            'escoba': 'broom', 'basura': 'trash', 'pilas': 'battery', 'bombilla': 'idea'
        };
        for (const [key, icon] of Object.entries(iconMap)) {
            if (lowerName.includes(key)) return { url: `https://img.icons8.com/fluency/96/${icon}.png`, isFallback: false };
        }
        return { url: 'https://img.icons8.com/fluency/96/shopping-basket.png', isFallback: true };
    }

    function createProductElement(item, index) {
        const div = document.createElement('div');
        div.className = `product-card ${item.is_purchased ? 'purchased' : ''}`;
        div.dataset.index = index;
        const iconData = getProductIcon(item.name);
        
        let filterStyle = '';
        if (iconData.isFallback) {
            let hash = 0;
            for (let i = 0; i < item.name.length; i++) hash = item.name.charCodeAt(i) + ((hash << 5) - hash);
            filterStyle = `style="filter: hue-rotate(${Math.abs(hash % 360)}deg)"`;
        }

        const iconContent = item.emoji 
            ? `<span class="product-emoji">${item.emoji}</span>`
            : `<img src="${iconData.url}" class="product-img" alt="Product" ${filterStyle}>`;

        div.innerHTML = `
            <div class="product-img-container" title="Cambiar icono/emoji">
                ${iconContent}
            </div>
            <div class="product-info">
                <span class="product-name">${item.name || 'Nuevo producto'}</span>
                ${item.notes ? `<small class="product-note">${item.notes}</small>` : ''}
            </div>
            <div class="product-qty-container">
                <span class="product-qty">${item.quantity} ${item.unit || ''}</span>
            </div>
            <div class="product-actions">
                <i class='bx bx-trash delete-btn'></i>
                <i class='bx ${item.is_purchased ? 'bx-check-circle' : 'bx-circle'} check-btn'></i>
            </div>
        `;
        return div;
    }

    function renderProducts() {
        const cards = productsView.querySelectorAll('.product-card');
        cards.forEach(card => card.remove());

        if (selectedListId && data.lists[selectedListId]) {
            const list = data.lists[selectedListId];
            list.items.forEach((item, index) => {
                addProductBtn.before(createProductElement(item, index));
            });
            productsView.style.display = 'flex';
        }
    }

    function renderSidebarLists() {
        listsContainer.innerHTML = '';
        Object.keys(data.lists).forEach(id => {
            const list = data.lists[id];
            const div = document.createElement('div');
            div.className = `lists-header ${id === selectedListId ? 'active-list' : ''}`;
            div.dataset.id = id;
            div.innerHTML = `
                <div class="list-color" style="background: ${list.color_tag || '#f28c18'}"></div>
                <div class="list-meta">
                    <h2>${list.name}</h2>
                    ${list.description ? `<small>${list.description}</small>` : ''}
                </div>
                <div class="list-actions">
                    <i class='bx bx-pencil edit-title-btn'></i>
                    <i class='bx bx-trash delete-list-btn'></i>
                </div>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-list-btn')) {
                    if (confirm('¿Eliminar lista?')) {
                        shoppingService.deleteList(id);
                        delete data.lists[id];
                        if (selectedListId === id) selectedListId = Object.keys(data.lists)[0] || null;
                        renderSidebarLists(); renderProducts();
                    }
                    return;
                }
                selectedListId = id;
                renderSidebarLists(); renderProducts();
            });
            bindRenameEvent(div, 'lists');
            listsContainer.appendChild(div);
        });
    }

    function renderSidebarNotes() {
        notesSidebarContainer.innerHTML = '';
        Object.keys(data.notes).forEach(id => {
            const note = data.notes[id];
            const div = document.createElement('div');
            div.className = `lists-header ${id === selectedNoteId ? 'active-list' : ''}`;
            div.dataset.id = id;
            div.innerHTML = `<h2>${note.title || 'Nota sin título'}</h2><i class='bx bx-trash delete-note-btn'></i>`;
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-note-btn')) {
                    if (confirm('¿Eliminar nota?')) {
                        shoppingService.deleteNote(id);
                        delete data.notes[id];
                        if (selectedNoteId === id) selectedNoteId = Object.keys(data.notes)[0] || null;
                        renderSidebarNotes(); loadNoteContent();
                    }
                    return;
                }
                selectedNoteId = id;
                renderSidebarNotes(); loadNoteContent();
            });
            notesSidebarContainer.appendChild(div);
        });
    }

    function loadNoteContent() {
        if (selectedNoteId && data.notes[selectedNoteId]) {
            noteTitleInput.value = data.notes[selectedNoteId].title;
            noteContentInput.value = data.notes[selectedNoteId].content;
            notesView.style.display = 'block';
        } else {
            noteTitleInput.value = ''; noteContentInput.value = '';
            notesView.style.display = selectedNoteId ? 'block' : 'none';
        }
    }

    function bindRenameEvent(container, type) {
        const editBtn = container.querySelector('.edit-title-btn');
        if (!editBtn) return;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = container.querySelector('h2');
            const textarea = document.createElement('textarea');
            textarea.value = title.innerText;
            textarea.className = 'edit-title-area';
            title.replaceWith(textarea);
            textarea.focus();
            const save = () => {
                const text = textarea.value.trim() || "Nueva Lista";
                data.lists[container.dataset.id].name = text;
                const newTitle = document.createElement('h2');
                newTitle.innerText = text;
                textarea.replaceWith(newTitle);
                triggerAutoSave();
            };
            textarea.onblur = save;
            textarea.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); textarea.blur(); } };
        });
    }

    // View Switching
    btnShowLists.onclick = () => {
        currentMode = 'lists';
        btnShowLists.classList.add('active'); btnShowNotes.classList.remove('active');
        listsContainer.style.display = 'block'; notesSidebarContainer.style.display = 'none';
        addListBtn.style.display = 'flex'; addNoteBtn.style.display = 'none';
        productsView.style.display = 'flex'; notesView.style.display = 'none';
        renderSidebarLists(); renderProducts();
    };

    btnShowNotes.onclick = () => {
        currentMode = 'notes';
        btnShowNotes.classList.add('active'); btnShowLists.classList.remove('active');
        listsContainer.style.display = 'none'; notesSidebarContainer.style.display = 'block';
        addListBtn.style.display = 'none'; addNoteBtn.style.display = 'flex';
        productsView.style.display = 'none'; notesView.style.display = 'block';
        renderSidebarNotes(); loadNoteContent();
    };

    addListBtn.onclick = () => {
        const id = 'list-' + Date.now();
        data.lists[id] = { name: 'Nueva Lista', description: 'Qué hay que comprar', color_tag: '#f28c18', items: [], is_shared: false };
        selectedListId = id;
        renderSidebarLists(); renderProducts(); triggerAutoSave();
    };

    addNoteBtn.onclick = () => {
        const id = 'note-' + Date.now();
        data.notes[id] = { title: 'Nueva Nota', content: '', color_tag: '#f28c18' };
        selectedNoteId = id;
        renderSidebarNotes(); loadNoteContent(); triggerAutoSave();
        noteTitleInput.focus();
    };

    noteTitleInput.oninput = () => { if (selectedNoteId) { data.notes[selectedNoteId].title = noteTitleInput.value; renderSidebarNotes(); triggerAutoSave(); } };
    noteContentInput.oninput = () => { if (selectedNoteId) { data.notes[selectedNoteId].content = noteContentInput.value; triggerAutoSave(); } };

    addProductBtn.onclick = () => {
        if (!selectedListId) return;
        const newIdx = data.lists[selectedListId].items.length;
        data.lists[selectedListId].items.push({ name: '', quantity: 1, unit: 'uds.', is_purchased: false });
        renderProducts();
        
        // Auto-open picker for the new product
        const cards = productsView.querySelectorAll('.product-card');
        const lastCard = Array.from(cards).find(c => c.dataset.index == newIdx);
        if (lastCard) {
            const imgContainer = lastCard.querySelector('.product-img-container');
            if (imgContainer) {
                pickerTargetIdx = newIdx;
                const rect = imgContainer.getBoundingClientRect();
                pickerContainer.style.display = 'block';
                
                // Position logic
                let top = rect.bottom + 5;
                let left = rect.left;
                if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
                if (top + 430 > window.innerHeight) top = rect.top - 440;
                
                pickerContainer.style.top = `${top}px`;
                pickerContainer.style.left = `${left}px`;
            }
        }
    };

    productsView.onclick = (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const idx = card.dataset.index;
        const item = data.lists[selectedListId].items[idx];

        if (e.target.classList.contains('delete-btn')) {
            data.lists[selectedListId].items.splice(idx, 1);
            renderProducts(); triggerAutoSave();
        } else if (e.target.classList.contains('check-btn')) {
            item.is_purchased = !item.is_purchased;
            renderProducts(); triggerAutoSave();
        } else if (e.target.classList.contains('product-name')) {
            const input = document.createElement('input');
            input.value = item.name; input.className = 'edit-product-input';
            e.target.replaceWith(input); input.focus();
            input.onblur = () => { item.name = input.value || "Nuevo producto"; renderProducts(); triggerAutoSave(); };
            input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); };
        } else if (e.target.classList.contains('product-qty')) {
            const input = document.createElement('input');
            input.type = 'number'; input.value = item.quantity; input.className = 'edit-qty-input';
            e.target.replaceWith(input); input.focus();
            input.onblur = () => { item.quantity = parseInt(input.value) || 1; renderProducts(); triggerAutoSave(); };
            input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); };
        }
    };

    // Double click handler for changing icon to emoji
    productsView.addEventListener('dblclick', (e) => {
        const imgContainer = e.target.closest('.product-img-container');
        if (imgContainer) {
            const card = imgContainer.closest('.product-card');
            const idx = card.dataset.index;
            pickerTargetIdx = idx;
            const rect = imgContainer.getBoundingClientRect();
            pickerContainer.style.display = 'block';
            
            // Adjust position to stay within viewport
            let top = rect.bottom + 5;
            let left = rect.left;
            
            if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
            if (top + 430 > window.innerHeight) top = rect.top - 440;
            
            pickerContainer.style.top = `${top}px`;
            pickerContainer.style.left = `${left}px`;
        }
    });
});
