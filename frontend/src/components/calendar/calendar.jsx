import React from 'react';
import {
  useCalendarApp,
  DayFlowCalendar,
  createDayView,
  createWeekView,
  createMonthView,
  createEvent,
  createAllDayEvent,
  createYearView,
  createDragPlugin,
  ViewType,
} from '@dayflow/core';

export default function CalendarPage() {
  const dragPlugin = createDragPlugin();

  const events = [
    createEvent({
      id: '1',
      title: 'Meeting',
      start: new Date(),
      end: new Date(),
    }),
  ];

  const calendar = useCalendarApp({
    views: [
      createDayView(),
      createWeekView(),
      createMonthView(),
      createYearView({
        mode: 'fixed-week', // default is year-canvas
        showTimedEventsInYearView: true // Enable dots for timed events
      })
    ],
    defaultView: ViewType.MONTH,
    useSidebar: {
      enabled: true,
      width: 280,
      initialCollapsed: true,
    },
    plugins: [dragPlugin],
    events,
    locale: 'es',
  });


  return (
    <div className="rounded-b-none overflow-auto md:w-auto">
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
}
