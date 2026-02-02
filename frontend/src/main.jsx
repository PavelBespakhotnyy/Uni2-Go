console.log('MAIN JS LOADED');

import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

import CalendarPage from './components/calendar/calendar.jsx';

const calendarRoot = document.getElementById('calendar-root');

if (calendarRoot) {
  createRoot(calendarRoot).render(<CalendarPage />);
}
