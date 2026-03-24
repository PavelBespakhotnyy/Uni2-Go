import { auth } from '../../firebase/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { friendsService } from '../../services/friendsService.js';
import { chatService } from '../../services/chatService.js';

const searchInput  = document.getElementById('username-search-input');
const searchBtn    = document.getElementById('username-search-btn');
const searchResult = document.getElementById('search-result');
const requestsList = document.getElementById('requests-list');
const friendsList  = document.getElementById('friends-list');
const requestsBadge = document.getElementById('requests-badge');

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) return;
        currentUser = user;

        friendsService.listenMyFriends(user.uid, renderFriends);
        friendsService.listenIncomingRequests(user.uid, renderRequests);
    });

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

async function handleSearch() {
    const raw = searchInput.value.trim().replace(/^@/, '');
    if (!raw) return;

    searchResult.className = 'search-result';
    searchResult.textContent = 'Buscando...';

    try {
        const user = await friendsService.searchByUsername(raw);

        if (user.id === currentUser.uid) {
            searchResult.innerHTML = '<span class="sr-error">Ese eres tú 😄</span>';
            return;
        }

        searchResult.innerHTML = `
            <div class="sr-user">
                <div class="sr-info">
                    <span class="sr-name">${user.name} ${user.surname}</span>
                    <span class="sr-username">@${user.username}</span>
                </div>
                <button class="btn-send-request" data-uid="${user.id}">Enviar solicitud</button>
            </div>
        `;

        searchResult.querySelector('.btn-send-request').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            try {
                await friendsService.sendFriendRequest(currentUser.uid, user.id);
                btn.textContent = 'Solicitud enviada ✓';
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Enviar solicitud';
                showError(err.message);
            }
        });

    } catch (err) {
        searchResult.innerHTML = `<span class="sr-error">${err.message}</span>`;
    }
}

function renderRequests(requests) {
    if (requests.length === 0) {
        requestsList.innerHTML = '<li class="friends-empty">No tienes solicitudes pendientes</li>';
        requestsBadge.classList.add('hidden');
        return;
    }

    requestsBadge.textContent = requests.length;
    requestsBadge.classList.remove('hidden');

    requestsList.innerHTML = '';
    requests.forEach(req => {
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${req.name} ${req.surname}</span>
                <span class="friend-username">@${req.username}</span>
            </div>
            <div class="friend-actions">
                <button class="btn-accept" data-doc="${req.contactDocId}" data-from="${req.requested_by}" data-to="${currentUser.uid}">Aceptar</button>
                <button class="btn-decline" data-doc="${req.contactDocId}">Rechazar</button>
            </div>
        `;

        li.querySelector('.btn-accept').addEventListener('click', async (e) => {
            const { doc, from, to } = e.currentTarget.dataset;
            try {
                await friendsService.acceptFriendRequest(doc, from, to);
            } catch (err) {
                showError(err.message);
            }
        });

        li.querySelector('.btn-decline').addEventListener('click', async (e) => {
            try {
                await friendsService.declineFriendRequest(e.currentTarget.dataset.doc);
            } catch (err) {
                showError(err.message);
            }
        });

        requestsList.appendChild(li);
    });
}

function renderFriends(friends) {
    if (friends.length === 0) {
        friendsList.innerHTML = '<li class="friends-empty">No tienes amigos aún</li>';
        return;
    }

    friendsList.innerHTML = '';
    friends.forEach(f => {
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${f.name} ${f.surname}</span>
                <span class="friend-username">@${f.username}</span>
            </div>
            <div class="friend-actions">
                <button class="btn-chat" data-uid="${f.uid}" title="Abrir chat">
                    <i class="bx bx-chat"></i>
                </button>
                <button class="btn-remove" data-uid="${f.uid}" title="Eliminar amigo">
                    <i class="bx bx-user-minus"></i>
                </button>
            </div>
        `;

        li.querySelector('.btn-chat').addEventListener('click', async (e) => {
            const uid = e.currentTarget.dataset.uid;
            try {
                const chatId = await chatService.createChatWithUser(uid, currentUser);
                window.location.href = `./chat.html?chatId=${chatId}`;
            } catch (err) {
                showError(err.message);
            }
        });

        li.querySelector('.btn-remove').addEventListener('click', async (e) => {
            if (!confirm(`¿Eliminar a ${f.name} de tus amigos?`)) return;
            try {
                await friendsService.removeFriend(currentUser.uid, e.currentTarget.dataset.uid);
            } catch (err) {
                showError(err.message);
            }
        });

        friendsList.appendChild(li);
    });
}

function showError(msg) {
    alert(msg);
}
