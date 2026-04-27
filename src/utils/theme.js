/**
 * theme.js — Uni2-Go theme system
 * Single light palette (Sereno) + dark mode toggle (Noche).
 */

const DARK_TOKENS = {
  '--color-accent':         '#60a5fa',
  '--color-accent-soft':    '#93c5fd',
  '--color-accent-muted':   'rgba(96,165,250,0.12)',
  '--color-accent-shadow':  'rgba(96,165,250,0.25)',
  '--color-sidebar-bg':     '#162028',
  '--color-sidebar-hover':  '#1e2e38',
  '--color-sidebar-active': '#203040',
  '--color-msg-sent':       '#1e3a5f',
  '--color-msg-received':   '#2a3d4a',
  '--color-bg':             '#0f1a20',
  '--color-surface':        '#162028',
  '--color-surface-2':      '#1e2e38',
  '--color-surface-3':      '#2a3d4a',
  '--color-text':           '#e2eef5',
  '--color-muted':          '#6b8a96',
  '--color-border':         '#2a3d4a',
};

const LIGHT_TOKENS = {
  '--color-accent':         '#3b82f6',
  '--color-accent-soft':    '#60a5fa',
  '--color-accent-muted':   'rgba(59,130,246,0.09)',
  '--color-accent-shadow':  'rgba(59,130,246,0.22)',
  '--color-sidebar-bg':     '#dde8ef',
  '--color-sidebar-hover':  '#c8d8e3',
  '--color-sidebar-active': '#eaf1f6',
  '--color-msg-sent':       '#c3dff0',
  '--color-msg-received':   '#c8d8e3',
  '--color-bg':             '#f5f9fc',
  '--color-surface':        '#eef3f7',
  '--color-surface-2':      '#dde8ef',
  '--color-surface-3':      '#c8d8e3',
  '--color-text':           '#0c1a24',
  '--color-muted':          '#6b8a96',
  '--color-border':         '#9ab5c3',
};

const DARKMODE_KEY = 'uni2go-dark';

function applyTokens(tokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

export function isDarkMode() {
  return localStorage.getItem(DARKMODE_KEY) === '1';
}

export function toggleDarkMode() {
  const next = !isDarkMode();
  localStorage.setItem(DARKMODE_KEY, next ? '1' : '0');
  applyTokens(next ? DARK_TOKENS : LIGHT_TOKENS);
  document.documentElement.setAttribute('data-dark', next ? 'true' : 'false');
  return next;
}

/** Call once on app boot */
export function loadPalette() {
  const dark = isDarkMode();
  applyTokens(dark ? DARK_TOKENS : LIGHT_TOKENS);
  document.documentElement.setAttribute('data-dark', dark ? 'true' : 'false');
}
