/**
 * Servicio para la gestión de eventos del calendario utilizando localStorage.
 * Este archivo permite que los eventos se guarden de forma persistente en el navegador,
 * eliminando la dependencia previa de Firebase Firestore para la gestión de eventos.
 */

const STORAGE_KEY = "calendar_events";
let listeners = [];

/**
 * Notifica a todos los suscriptores en la pestaña actual.
 */
function notifyListeners() {
  const events = getEventsFromStorage();
  listeners.forEach(callback => callback(events));
}

function getEventsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    const events = JSON.parse(data);
    return events.map(event => {
      // Intentar convertir start y end a objetos Date de forma segura
      let start = event.start;
      let end = event.end;
      
      // Si es un objeto de Firebase (seconds/nanoseconds) o una cadena ISO
      if (start && typeof start === 'object' && start.seconds) {
        start = new Date(start.seconds * 1000);
      } else if (start) {
        start = new Date(start);
      }

      if (end && typeof end === 'object' && end.seconds) {
        end = new Date(end.seconds * 1000);
      } else if (end) {
        end = new Date(end);
      }

      return {
        ...event,
        start: start instanceof Date && !isNaN(start) ? start : new Date(),
        end: end instanceof Date && !isNaN(end) ? end : new Date()
      };
    });
  } catch (e) {
    console.error("Error parsing events from localStorage", e);
    return [];
  }
}

function saveEventsToStorage(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/**
 * Suscribirse a los cambios en los eventos.
 */
export function subscribeToEvents(callback) {
  // Enviar datos iniciales
  const events = getEventsFromStorage();
  callback(events);

  // Agregar a la lista de escuchadores locales
  listeners.push(callback);

  // Escuchar cambios desde otras pestañas
  const handleStorageChange = (e) => {
    if (e.key === STORAGE_KEY) {
      callback(getEventsFromStorage());
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    listeners = listeners.filter(l => l !== callback);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export async function addEvent(event) {
  const events = getEventsFromStorage();
  const newEvent = {
    ...event,
    id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    createdAt: new Date().toISOString()
  };
  
  const updatedEvents = [...events, newEvent];
  saveEventsToStorage(updatedEvents);
  notifyListeners();
  
  return newEvent.id;
}

export async function updateEvent(id, updatedData) {
  const events = getEventsFromStorage();
  const updatedEvents = events.map(event => 
    event.id === id 
      ? { ...event, ...updatedData, updatedAt: new Date().toISOString() } 
      : event
  );
  
  saveEventsToStorage(updatedEvents);
  notifyListeners();
}

export async function deleteEvent(id) {
  const events = getEventsFromStorage();
  const updatedEvents = events.filter(event => event.id !== id);
  
  saveEventsToStorage(updatedEvents);
  notifyListeners();
}
