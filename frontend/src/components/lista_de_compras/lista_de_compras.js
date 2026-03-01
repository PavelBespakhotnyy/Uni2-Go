document.addEventListener('DOMContentLoaded', () => {
    const listsContainer = document.getElementById('sidebar-lists-container');
    const addListBtn = document.getElementById('add-list-btn');
    const productsList = document.getElementById('products-list');
    const addProductBtn = document.getElementById('add-product-btn');

    // Helper: Create product element
    function createProductElement(name, qty) {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="../public/images/logo_Uni2_Go.svg" class="product-img" alt="Product">
            <div class="product-info">
                <span class="product-name">${name}</span>
            </div>
            <span class="product-qty">${qty}</span>
        `;
        return div;
    }

    // Helper: Clear current products
    function clearProducts() {
        const cards = productsList.querySelectorAll('.product-card');
        cards.forEach(card => card.remove());
    }

    // Rename logic for lists
    function bindRenameEvent(container) {
        const editBtn = container.querySelector('.edit-title-btn');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = container.querySelector('h2');
            const currentText = title.innerText;
            const textarea = document.createElement('textarea');
            textarea.value = currentText;
            textarea.className = 'edit-title-area';
            textarea.maxLength = 50;
            
            title.replaceWith(textarea);
            textarea.focus();

            const saveTitle = () => {
                const newTitle = document.createElement('h2');
                const val = textarea.value.trim() || 'Lista de la compra';
                newTitle.innerText = val;
                container.title = val; // Set full tooltip on hover
                textarea.replaceWith(newTitle);
            };

            textarea.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    saveTitle();
                }
            });
            textarea.addEventListener('blur', saveTitle);
        });
    }

    // List selection logic
    function selectList(container) {
        document.querySelectorAll('.lists-header').forEach(l => l.classList.remove('active-list'));
        container.classList.add('active-list');
        clearProducts();
    }

    // Initial setup for the first list
    const initialList = document.querySelector('.lists-header');
    if (initialList) {
        bindRenameEvent(initialList);
        initialList.addEventListener('click', () => selectList(initialList));
        
        // Initial tooltip setup
        const initialTitleText = initialList.querySelector('h2').innerText;
        initialList.title = initialTitleText;
        
        const defaultItems = [
            { name: 'Tomate', qty: '2 uds.' },
            { name: 'Leche', qty: '1 uds.' }
        ];
        defaultItems.forEach(item => {
            addProductBtn.before(createProductElement(item.name, item.qty));
        });
    }

    // Create new list logic
    addListBtn.addEventListener('click', () => {
        if (document.querySelector('.new-list-input')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'new-list-input';
        input.placeholder = 'Nombre de la lista...';
        listsContainer.appendChild(input);
        input.focus();

        const createNewList = () => {
            const name = input.value.trim();
            if (name) {
                const newList = document.createElement('div');
                newList.className = 'lists-header';
                newList.title = name; // Tooltip for new list
                newList.innerHTML = `
                    <h2>${name}</h2>
                    <i class='bx bx-pencil bx-sm edit-title-btn' style="pointer: cursor;"></i>
                `;
                listsContainer.appendChild(newList);
                bindRenameEvent(newList);
                newList.addEventListener('click', () => selectList(newList));
                selectList(newList);
            }
            input.remove();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') createNewList();
            if (e.key === 'Escape') input.remove();
        });
        input.addEventListener('blur', (e) => {
            if (e.relatedTarget !== addListBtn) createNewList();
        });
    });

    // Product cards editing logic (delegation)
    productsList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('product-name')) {
            const currentText = target.innerText;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'edit-product-input';
            input.value = currentText;
            target.replaceWith(input);
            input.focus();
            const saveName = () => {
                const newSpan = document.createElement('span');
                newSpan.className = 'product-name';
                newSpan.innerText = input.value.trim() || 'Nuevo producto';
                input.replaceWith(newSpan);
            };
            input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') saveName(); });
            input.addEventListener('blur', saveName);
        }
        if (target.classList.contains('product-qty')) {
            const currentText = target.innerText.split(' ')[0];
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'edit-qty-input';
            input.value = currentText;
            input.min = 1;
            target.replaceWith(input);
            input.focus();
            const saveQty = () => {
                const newSpan = document.createElement('span');
                newSpan.className = 'product-qty';
                newSpan.innerText = `${input.value || 1} uds.`;
                input.replaceWith(newSpan);
            };
            input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') saveQty(); });
            input.addEventListener('blur', saveQty);
        }
    });

    // Add product logic
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            const newProduct = createProductElement('Nuevo producto', '1 uds.');
            addProductBtn.before(newProduct);
            newProduct.querySelector('.product-name').click();
        });
    }

    // Search logic
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                const name = card.querySelector('.product-name')?.innerText.toLowerCase() || '';
                card.style.display = name.includes(term) ? 'flex' : 'none';
            });
            if (addProductBtn) addProductBtn.style.display = term.length > 0 ? 'none' : 'flex';
        });
    }
});
