import { useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import '../components/sobre_nosotros/sobre_nosotros.css';

export default function SobreNosotrosPage() {
  useEffect(() => {
    document.body.classList.add('sobre-nosotros-page');
    return () => document.body.classList.remove('sobre-nosotros-page');
  }, []);

  return (
    <Layout contentClass="sobre-nosotros-wrapper">
      <div className="sobre-nosotros-container">
        <div className="quadrants-container">
          <div className="quadrant tl">
            <img src="/images/meeting_sobre_nos.png" alt="Reunión del equipo Uni2Go" className="quadrant-image" />
          </div>
          <div className="quadrant tr">
            <div className="text-content">
              <h2>¿Qué es Uni2Go?</h2>
              <p>
                Uni2Go es un espacio digital que une personas, eventos e ideas en un solo lugar.
                Nuestro objetivo es hacer la organización diaria más fácil y cómoda: planifica
                reuniones, sigue tareas y comparte momentos con amigos y familia.
              </p>
              <p>
                Una plataforma diseñada para estudiantes universitarios que buscan optimizar su
                tiempo y conectar con su comunidad académica.
              </p>
            </div>
          </div>
          <div className="quadrant bl">
            <div className="text-content">
              <h2>Nuestro equipo</h2>
              <p>
                Somos un equipo de estudiantes apasionados por la tecnología, el diseño y la
                innovación. Creemos que incluso las pequeñas soluciones digitales pueden hacer
                la vida más organizada, inspiradora y conectada.
              </p>
              <p>
                Cada miembro aporta una visión única, combinando creatividad, funcionalidad y
                usabilidad en cada característica.
              </p>
            </div>
          </div>
          <div className="quadrant br">
            <img src="/images/conversation_sobre_nos.png" alt="Conversación entre estudiantes" className="quadrant-image" />
          </div>
        </div>

        <footer className="footer">
          <div className="footer-content">
            <div className="social-links">
              <a href="https://instagram.com/uni2go" target="_blank" rel="noopener noreferrer" className="social-link">
                <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="social-text">Instagram</span>
              </a>
              <a href="mailto:contacto@uni2go.com" className="social-link">
                <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span className="social-text">contacto@uni2go.com</span>
              </a>
            </div>
            <div className="footer-copyright">
              <p>2026 Uni2Go</p>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
