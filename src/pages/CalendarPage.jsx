import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import CalendarComponent from '../components/calendar/calendar.jsx';

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  useEffect(() => {
    document.body.classList.add('calendar-page');
    return () => document.body.classList.remove('calendar-page');
  }, []);

  return (
    <Layout noWrapper>
      <div id="calendar-root">
        <CalendarComponent initialDate={dateParam} />
      </div>
    </Layout>
  );
}
