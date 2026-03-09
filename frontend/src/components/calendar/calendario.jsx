import React, { useState, useEffect } from 'react';
import { useDayFlow } from '@dayflow/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, db } from '../../firebase/firebase.js';
import { collection, query, where, onSnapshot } from "firebase/firestore";

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { month, dayNames } = useDayFlow({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear(),
  });

  const [events, setEvents] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, where("userId", "==", user.uid));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userEvents = [];
        querySnapshot.forEach((doc) => {
          userEvents.push({ id: doc.id, ...doc.data() });
        });
        setEvents(userEvents);
      });

      return () => unsubscribe();
    }
  }, [auth.currentUser]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = event.date.toDate();
      return (
        eventDate.getDate() === day.day &&
        eventDate.getMonth() === day.month &&
        eventDate.getFullYear() === day.year
      );
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">
          {new Date(currentDate.getFullYear(), currentDate.getMonth()).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center font-semibold text-gray-600">
            {day}
          </div>
        ))}
        {month.map((week, i) => (
          <React.Fragment key={i}>
            {week.map((day, j) => (
              <div
                key={j}
                className={`p-2 border rounded-md ${day.isSameMonth ? 'bg-white' : 'bg-gray-100'}`}
              >
                <div className="text-right">{day.day}</div>
                <div>
                  {getEventsForDay(day).map(event => (
                    <div key={event.id} className="bg-blue-500 text-white rounded-md p-1 text-sm mb-1">
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CalendarPage;
