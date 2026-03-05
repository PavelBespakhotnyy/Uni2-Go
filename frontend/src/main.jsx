import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('Main.jsx is loading');

import CalendarPage from './components/calendar/calendar.jsx';

console.log('CalendarPage imported');

const calendarRoot = document.getElementById('calendar-root');

if (calendarRoot) {
  createRoot(calendarRoot).render(<CalendarPage />);
}
