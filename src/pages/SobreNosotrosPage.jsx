import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import '../components/sobre_nosotros/sobre_nosotros.css';

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.getAttribute('data-dark') === 'true'
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute('data-dark') === 'true')
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dark'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

const FEATURES = [
  { icon: 'bx-calendar-check', title: 'Calendario inteligente', desc: 'Eventos, reuniones y tareas siempre a mano.', color: '#fff0ee', iconColor: 'var(--color-accent)', to: '/calendar', goto: 'Ir al Calendario' },
  { icon: 'bx-conversation',   title: 'Chat con amigos',        desc: 'Mensajes en tiempo real sin salir de la app.', color: '#fff3e0', iconColor: 'var(--color-accent-soft)', to: '/chat',     goto: 'Ir al Chat' },
  { icon: 'bx-group',          title: 'Grupos y eventos',       desc: 'Comparte y sincronízate con tu equipo.', color: '#e8f5e9', iconColor: '#2e7d32', to: '/grupos',   goto: 'Ir a Grupos' },
  { icon: 'bx-cart',           title: 'Lista de la compra',     desc: 'Listas compartidas con un clic.', color: '#fce4e4', iconColor: '#c0392b', to: '/lista-compras',    goto: 'Ir a la Lista' },
];

function SvgCalendarUI({ dark }) {
  const [hovered, setHovered] = useState(null);
  const leaveTimer = useRef(null);
  const now = new Date();
  const today = now.getDate();
  const monthLabel = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(' de ', ' ')
    .replace(/^\w/, c => c.toUpperCase());

  const handleEnter = (date) => {
    clearTimeout(leaveTimer.current);
    setHovered(date);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(null), 300);
  };
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const dates = [
    [null, null, 1,  2,  3,  4,  5 ],
    [6,   7,    8,  9,  10, 11, 12 ],
    [13,  14,   15, 16, 17, 18, 19 ],
    [20,  21,   22, 23, 24, 25, 26 ],
    [27,  28,   29, 30, null,null,null],
  ];
  // dots: { date, color }
  const dots = {
    3:  '#4f46e5', 8:  '#f28c18', 11: '#2e7d32',
    15: '#c0392b', 20: '#f28c18', 24: '#4f46e5', 28: '#7b77d1',
  };

  const W = 300, padX = 14;
  const cellW = (W - padX * 2) / 7;
  const cellH = 26;
  const gridTop = 71;

  return (
    <svg viewBox={`0 0 ${W} 222`} fill="none" xmlns="http://www.w3.org/2000/svg" className="sn-hero-svg">
      {/* Shadow */}
      <rect x="4" y="6" width={W-8} height="214" rx="18" fill={dark ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.07)'}/>
      {/* Body */}
      <rect x="1" y="1" width={W-2} height="214" rx="18" fill={dark ? '#1a2a35' : 'white'} stroke={dark ? '#2a3d4a' : '#e4e2f8'} strokeWidth="1.5"/>

      {/* Header */}
      <rect x="1" y="1" width={W-2} height="48" rx="18" fill="#4f46e5"/>
      <rect x="1" y="32" width={W-2} height="17" fill="#4f46e5"/>

      {/* Month */}
      <text x={W / 2} y="25" fill="white" fontSize="20" fontWeight="800" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central">{monthLabel}</text>

      {/* Day headers */}
      {days.map((d, i) => (
        <text key={d}
          x={padX + i * cellW + cellW / 2} y={65}
          fill={i >= 5 ? '#f28c18' : (dark ? '#6b8a96' : '#aaa')}
          fontSize="8.5" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
          {d}
        </text>
      ))}

      {/* Animated highlight circle */}
      {(() => {
        const activeDate = hovered ?? today;
        let ax = padX + cellW / 2, ay = gridTop + 10;
        dates.forEach((week, r) => week.forEach((date, c) => {
          if (date === activeDate) { ax = padX + c * cellW + cellW / 2; ay = gridTop + r * cellH + 10; }
        }));
        return (
          <circle cx={0} cy={0} r="11" fill="#4f46e5"
            style={{ transform: `translate(${ax}px, ${ay}px)`, transition: 'transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1)' }}
          />
        );
      })()}

      {/* Dates */}
      <g onMouseLeave={handleLeave}>
        {dates.map((week, r) =>
          week.map((date, c) => {
            if (!date) return null;
            const cx = padX + c * cellW + cellW / 2;
            const cy = gridTop + r * cellH + 10;
            const isActive = date === (hovered ?? today);
            const isWeekend = c >= 5;
            return (
              <g key={`${r}-${c}`} style={{ cursor: 'pointer' }}
                onMouseEnter={() => handleEnter(date)}>
                <rect x={padX + c * cellW} y={gridTop + r * cellH} width={cellW} height={cellH} fill="transparent"/>
                <text x={cx} y={cy + 4.5}
                  fill={isActive ? 'white' : isWeekend ? '#f28c18' : (dark ? '#c8d8e3' : '#222')}
                  fontSize="11" fontFamily="sans-serif" textAnchor="middle"
                  fontWeight={isActive ? '700' : '400'}>
                  {date}
                </text>
                {dots[date] && !isActive && (
                  <circle cx={cx} cy={cy + 12} r="2.5" fill={dots[date]}/>
                )}
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
}

const PLANNER_COLORS = ['#4f46e5','#f28c18','#2e7d32','#c0392b','#7b77d1','#0891b2','#d97706','#db2777'];
function randColor() { return PLANNER_COLORS[Math.floor(Math.random() * PLANNER_COLORS.length)]; }

function SvgPlanner({ dark }) {
  const [cells, setCells] = useState({
    '1-0': '#4f46e5',
    '4-1': '#f28c18',
    '2-2': '#2e7d32',
    '5-0': '#c0392b',
    '0-2': '#7b77d1',
    '6-1': '#0891b2',
  });

  const toggle = (key) => {
    setCells(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: randColor() };
    });
  };

  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="sn-about-svg" style={{ cursor: 'pointer' }}>
      {/* Calendar body */}
      <rect x="16" y="24" width="128" height="104" rx="12" fill={dark ? '#1a2a35' : '#fff'} stroke={dark ? '#2a3d4a' : '#d0cef8'} strokeWidth="2"/>
      {/* Header bar */}
      <rect x="16" y="24" width="128" height="32" rx="12" fill="#4f46e5"/>
      <rect x="16" y="44" width="128" height="12" fill="#4f46e5"/>
      {/* Rings */}
      <rect x="48" y="14" width="8" height="20" rx="4" fill="#7b77d1"/>
      <rect x="104" y="14" width="8" height="20" rx="4" fill="#7b77d1"/>
      {/* Header dots */}
      <circle cx="44" cy="40" r="3" fill="white" opacity="0.7"/>
      <circle cx="80" cy="40" r="3" fill="white" opacity="0.7"/>
      <circle cx="116" cy="40" r="3" fill="white" opacity="0.7"/>
      {/* Grid cells */}
      {[0,1,2,3,4,5,6].map(col =>
        [0,1,2].map(row => {
          const key = `${col}-${row}`;
          const x = 26 + col * 17;
          const y = 66 + row * 18;
          const color = cells[key] || (dark ? '#253540' : '#f0efff');
          const isColored = !!cells[key];
          return (
            <g key={key} onClick={() => toggle(key)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width="12" height="12" rx="3" fill={color}
                style={{ transition: 'fill 0.18s ease' }}/>
              {isColored && (
                <polyline
                  points={`${x+2},${y+6} ${x+4.5},${y+9} ${x+10},${y+3}`}
                  stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
                />
              )}
              {/* hitbox */}
              <rect x={x - 3} y={y - 3} width="18" height="18" rx="4" fill="transparent"/>
            </g>
          );
        })
      )}
    </svg>
  );
}

function SvgTeam() {
  const [jumping, setJumping] = useState(null);

  const Person = ({ idx, cx, headY, color, bodyColor }) => (
    <g
      onMouseEnter={() => setJumping(idx)}
      onAnimationEnd={() => setJumping(null)}
      style={{
        animation: jumping === idx ? 'snPersonJump 0.5s ease-in-out' : 'none',
        cursor: 'pointer',
      }}
    >
      <circle cx={cx} cy={headY} r="13" fill={color} />
      <rect x={cx - 16} y={headY + 18} width="32" height="28" rx="10" fill={bodyColor} />
    </g>
  );

  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="sn-about-svg sn-about-svg-bottom">
      <Person idx={0} cx={38}  headY={45} color="#4f46e5" bodyColor="#7b77d1" />
      <Person idx={1} cx={80}  headY={38} color="#7b77d1" bodyColor="#9d99e0" />
      <Person idx={2} cx={122} headY={45} color="#f28c18" bodyColor="#f5aa4a" />
      <rect x="16" y="96" width="128" height="3" rx="1.5" fill="#e0dff8"/>
      <path d="M14 28 L15.5 24 L17 28 L21 29.5 L17 31 L15.5 35 L14 31 L10 29.5 Z" fill="#f28c18" opacity="0.45"/>
      <path d="M140 58 L141 55 L142 58 L145 59 L142 60 L141 63 L140 60 L137 59 Z" fill="#4f46e5" opacity="0.4"/>
      <circle cx="80" cy="116" r="5" fill="#d9d7f2"/>
      <circle cx="58" cy="122" r="3.5" fill="#f28c18" opacity="0.35"/>
      <circle cx="102" cy="122" r="3.5" fill="#4f46e5" opacity="0.35"/>
    </svg>
  );
}

export default function SobreNosotrosPage() {
  const dark = useDarkMode();
  return (
    <Layout contentClass="sn-wrapper">
      <div className="sn-page">

        {/* HERO */}
        <section className="sn-hero">
          <div className="sn-hero-left">
            <p className="sn-hero-eyebrow">Planificador universitario</p>
            <h1 className="sn-hero-title">Todo lo que necesitas,<br />en un solo lugar</h1>
            <p className="sn-hero-sub">
              Uni2Go une calendarios, chats, grupos y listas para que los estudiantes
              organicen su vida académica y social sin esfuerzo.
            </p>
          </div>
          <div className="sn-hero-right">
            <SvgCalendarUI dark={dark} />
          </div>
        </section>

        {/* FEATURES */}
        <section className="sn-features">
          {FEATURES.map(f => (
            <Link key={f.icon} to={f.to} className="sn-feature-card">
              <div className="sn-feature-icon" style={{ background: f.color, color: f.iconColor }}>
                <i className={`bx ${f.icon}`} />
              </div>
              <h3 className="sn-feature-title">{f.title}</h3>
              <p className="sn-feature-desc">{f.desc}</p>
              <span className="sn-feature-goto" style={{ color: f.iconColor }}>{f.goto}</span>
            </Link>
          ))}
        </section>

        {/* ABOUT */}
        <section className="sn-about">
          <div className="sn-about-card sn-about-card-purple">
            <SvgPlanner dark={dark} />
            <div className="sn-about-text">
              <h2>¿Qué es Uni2Go?</h2>
              <p>Una plataforma diseñada para estudiantes que buscan optimizar su tiempo y conectar con su comunidad académica — disponible en web y móvil.</p>
            </div>
          </div>
          <div className="sn-about-card sn-about-card-orange">
            <SvgTeam />
            <div className="sn-about-text">
              <h2>Nuestro equipo</h2>
              <p>Somos estudiantes apasionados por la tecnología y el diseño. Cada función nació de una necesidad real, combinando creatividad y usabilidad.</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="sn-footer">
          <div className="sn-footer-links">
            <a href="https://instagram.com/uni2go" target="_blank" rel="noopener noreferrer" className="sn-footer-link">
              <i className="bx bxl-instagram" /> Instagram
            </a>
            <a href="mailto:contacto@uni2go.com" className="sn-footer-link">
              <i className="bx bx-envelope" /> contacto@uni2go.com
            </a>
          </div>
          <span className="sn-footer-copy">© 2026 Uni2Go</span>
        </footer>

      </div>
    </Layout>
  );
}
