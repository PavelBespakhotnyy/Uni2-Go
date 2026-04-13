/**
 * user.js — Uni2Go · Página de perfil de usuario
 */
import { initPanelLateral, loadUserAvatar } from './panel-lateral.js';
import { auth } from '../../firebase/firebase.js';
import { getUserProfile } from '../../services/userService.js';
import { onAuthStateChanged } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
    initPanelLateral();

    // Cargar avatar con iniciales desde Firestore
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        try {
            const data = await getUserProfile(user.uid);
            if (data) {
                loadUserAvatar(data.name || '', data.surname || '');
            }
        } catch (err) {
            console.error('Error al cargar avatar:', err);
        }
    });
});
