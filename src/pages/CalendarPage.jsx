import { useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import CalendarComponent from '../components/calendar/calendar.jsx';

export default function CalendarPage() {
  useEffect(() => {
    document.body.classList.add('calendar-page');
    return () => document.body.classList.remove('calendar-page');
  }, []);

  return (
    <Layout noWrapper>
      <div id="calendar-root">
        <CalendarComponent />
      </div>
    </Layout>
  );
}
