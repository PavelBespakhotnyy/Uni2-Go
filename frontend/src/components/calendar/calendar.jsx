import React from 'react';
import {
  useCalendarApp,
  DayFlowCalendar,
  createDayView,
  createWeekView,
  createMonthView,
  createEvent,
  createAllDayEvent,
  createDragPlugin,
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
    ],
    useSidebar: {
      enabled: true,
      width: 280,
    },
    plugins: [dragPlugin],
    events,
    locale: 'es',
  });

  return (
    <div className="p-4">
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
}
