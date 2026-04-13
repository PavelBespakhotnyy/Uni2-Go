import Navbar from './navbar/Navbar.jsx';
import './preloader/preloader.css';
import './navbar/navbar.css';

/**
 * contentClass — дополнительные классы для div.content-wrapper
 *   Пример: contentClass="chat-page-wrapper" → <div class="content-wrapper chat-page-wrapper">
 * noWrapper — если true, children рендерятся прямо в main-container (нужно для календаря)
 */
export default function Layout({ children, contentClass = '', noWrapper = false }) {
  return (
    <div className="main-container">
      <Navbar />
      {noWrapper ? (
        children
      ) : (
        <div className={`content-wrapper${contentClass ? ` ${contentClass}` : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
