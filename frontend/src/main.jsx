import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeFirebaseCollections } from './scripts/initFirebaseCollections';
import CalendarPage from './components/calendar/calendar.jsx'; // ✅ ТОЛЬКО ОДИН РАЗ

console.log('Main.jsx is loading');
console.log('CalendarPage imported');

// Запуск инициализации коллекций
initializeFirebaseCollections()
  .then(() => console.log('Инициализация Firebase завершена'))
  .catch(err => console.error('Ошибка инициализации:', err));

const calendarRoot = document.getElementById('calendar-root');

if (calendarRoot) {
  createRoot(calendarRoot).render(<CalendarPage />);
}