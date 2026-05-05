import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../components/index/index.module.css';
import { toggleDarkMode, isDarkMode } from '../utils/theme.js';

export default function HomePage() {
  const [dark, setDark] = useState(isDarkMode);

  const handleDarkToggle = () => {
    const next = toggleDarkMode();
    setDark(next);
  };

  return (
    <div className={styles.page}>
      <button
        className={`${styles.themeToggle}${dark ? ` ${styles.themeToggleActive}` : ''}`}
        onClick={handleDarkToggle}
        title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <i className={`bx bx-sm ${dark ? 'bx-sun' : 'bx-moon'}`} />
      </button>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <img src="/images/logo_Uni2_Go.svg" alt="Logo Uni2Go" />
          <br />
          <h3>Un práctico planificador en línea que te ayudará a mantener tu agenda bajo control</h3>
          <div className={styles.heroActions}>
            <Link to="/registration" className={styles.btnRegister}>REGISTRARTE</Link>
            <Link to="/login" className={styles.btnLogin}>INICIAR SESIÓN</Link>
          </div>
        </div>
        <img src="/images/Calendar Logo.png" alt="Calendario Hero" />
      </div>

      {/* Gestione su tiempo */}
      <div className={`${styles.featureRow} ${styles.featureRowLeft}`}>
        <img src="/images/time-management-3d-icon-png-download-11754183 1.png" alt="Gestión de tiempo" />
        <div className={styles.textBlock}>
          <h2>Gestione su tiempo</h2>
          <h3>Guarda todos tus eventos, reuniones y tareas en un único calendario: siempre a mano en tu ordenador, smartphone o tablet</h3>
        </div>
      </div>

      {/* Comparte tus eventos */}
      <div className={`${styles.featureRow} ${styles.featureRowRight}`}>
        <div className={styles.textBlock}>
          <h2>Comparte tus eventos</h2>
          <h3>Planifica tus actividades, comparte tus eventos y mantente conectado con tus amigos para no olvidar nada y disfrutar juntos de cada momento</h3>
        </div>
        <img src="/images/calendar-share-3d-icon-png-download-11770844 1(1).png" alt="Compartir" />
      </div>

      {/* Grid 3 columns */}
      <div className={styles.gridSection}>
        <div><h3>Chatea con tus amigos</h3><img src="/images/message-icon-3d-icon-png-download-8263688 1.png" alt="Chat" /></div>
        <div><h3>Haga una lista de la compra</h3><img src="/images/shopping-list-3d-icon-png-download-10394121 1.png" alt="Compra" /></div>
        <div><h3>Haga listas de eventos</h3><img src="/images/folder-calendar-3d-icon-png-download-10598805 1.png" alt="Listas" /></div>
      </div>

      {/* FAQ */}
      <div className={styles.faqContainer}>
        <h2>Preguntas y respuestas</h2>
        <div><details><summary><h3>¿Cómo crear un evento?</h3></summary><p>Haz clic en el botón "+" en el menú principal y rellena los datos.</p></details></div>
        <div><details><summary><h3>¿Cómo añadir a alguien a un grupo de amigos?</h3></summary><p>Entra en el grupo, pulsa en "Editar" y selecciona "Añadir miembros".</p></details></div>
        <div><details><summary><h3>¿Cómo compartir un evento?</h3></summary><p>Usa el icono de compartir que aparece en la esquina superior derecha del evento.</p></details></div>
        <div><details><summary><h3>¿Cómo añadir amigos?</h3></summary><p>Busca el perfil de tu amigo y pulsa el botón "Enviar solicitud".</p></details></div>
      </div>
    </div>
  );
}
