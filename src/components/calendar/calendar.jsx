import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './index.module.css';
const css = styles; // alias for use in sub-components
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays as diffInDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Users, 
  Layers, 
  Clock, 
  Trash2, 
  Edit2, 
  Calendar as CalendarIcon, 
  AlignLeft, 
  CalendarDays,
  AlertCircle,
  LucideWavesArrowDown
} from 'lucide-react';
import { addEvent, updateEvent, deleteEvent, getUserById } from '../../services/calendarService';
import { friendsService } from '../../services/friendsService';
import { gruposService } from '../../services/gruposService';

const VIEWS = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
};
import { auth, db } from '../../firebase/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from "firebase/firestore";

const EVENT_COLORS = [
  { bg: 'bg-[#e2f2e3]', border: 'border-[#4caf50]', text: 'text-[#1b5e20]' },
  { bg: 'bg-[#fff4e5]', border: 'border-[#ff9800]', text: 'text-[#e65100]' },
  { bg: 'bg-[#e3f2fd]', border: 'border-[#2196f3]', text: 'text-[#0d47a1]' },
  { bg: 'bg-[#f3e5f5]', border: 'border-[#9c27b0]', text: 'text-[#4a148c]' },
  { bg: 'bg-[#fffde7]', border: 'border-[#fbc02d]', text: 'text-[#f57f17]' },
  { bg: 'bg-[#ffebee]', border: 'border-[#f44336]', text: 'text-[#b71c1c]' },
  { bg: 'bg-[#e0f7fa]', border: 'border-[#00bcd4]', text: 'text-[#006064]' },
];

const getEventColor = (id) => {
  if (!id) return EVENT_COLORS[0];
  const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % EVENT_COLORS.length;
  return EVENT_COLORS[index];
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(VIEWS.MONTH);
  const [events, setEvents] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [selectedFriendUid, setSelectedFriendUid] = useState('');
  const [codeSearchError, setCodeSearchError] = useState('');
  const [formData, setFormData] = useState({
    title: '', start: '', end: '', allDay: false, sharedWith: [], groupIds: [], description: ''
  });

  const ownEventsMapRef = useRef(new Map());
  const groupEventsMapRef = useRef(new Map());

  const mergeAndSet = useCallback(() => {
    const merged = new Map([...ownEventsMapRef.current, ...groupEventsMapRef.current]);
    setEvents(Array.from(merged.values()));
  }, []);

  const parseEvent = useCallback((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      start: data.start?.toDate ? data.start.toDate() : new Date(data.start),
      end: data.end?.toDate ? data.end.toDate() : new Date(data.end)
    };
  }, []);

  // Cargar grupos del usuario, eventos propios y eventos compartidos con el usuario
  useEffect(() => {
    let unsubGroups = null;
    let unsubOwnEvents = null;
    let unsubSharedEvents = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      unsubGroups = gruposService.listenMyGroups(user.uid, (groups) => {
        setMyGroups(groups);
      });

      const qOwn = query(collection(db, "events"), where("userId", "==", user.uid));
      unsubOwnEvents = onSnapshot(qOwn, (snapshot) => {
        snapshot.docChanges().forEach(({ type, doc }) => {
          if (type === 'removed') ownEventsMapRef.current.delete(doc.id);
          else ownEventsMapRef.current.set(doc.id, parseEvent(doc));
        });
        mergeAndSet();
      });

      const qShared = query(collection(db, "events"), where("sharedWith", "array-contains", user.uid));
      unsubSharedEvents = onSnapshot(qShared, (snapshot) => {
        snapshot.docChanges().forEach(({ type, doc }) => {
          if (type === 'removed') groupEventsMapRef.current.delete(doc.id);
          else groupEventsMapRef.current.set(doc.id, { ...parseEvent(doc), isSharedEvent: true });
        });
        mergeAndSet();
      });
    });

    return () => {
      unsubAuth();
      unsubGroups?.();
      unsubOwnEvents?.();
      unsubSharedEvents?.();
    };
  }, [mergeAndSet, parseEvent]);

  // Suscribirse a eventos de grupos del usuario
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || myGroups.length === 0) {
      groupEventsMapRef.current.clear();
      mergeAndSet();
      return;
    }

    const groupIds = myGroups.map(g => g.id);
    groupEventsMapRef.current.clear();

    // Firestore array-contains-any soporta hasta 30 valores
    const q = query(
      collection(db, "events"),
      where("groupIds", "array-contains-any", groupIds.slice(0, 30))
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(({ type, doc }) => {
        if (type === 'removed') {
          groupEventsMapRef.current.delete(doc.id);
        } else if (doc.data().userId !== user.uid) {
          groupEventsMapRef.current.set(doc.id, { ...parseEvent(doc), isGroupEvent: true });
        }
      });
      mergeAndSet();
    });

    return () => unsub();
  }, [myGroups, mergeAndSet, parseEvent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isModalOpen || showDeleteConfirm) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, currentDate, isModalOpen, showDeleteConfirm]);

  const handlePrev = () => {
    if (view === VIEWS.MONTH) setCurrentDate(subMonths(currentDate, 1));
    else if (view === VIEWS.WEEK) setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (view === VIEWS.MONTH) setCurrentDate(addMonths(currentDate, 1));
    else if (view === VIEWS.WEEK) setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const goToDay = (date) => {
    setCurrentDate(date);
    setView(VIEWS.DAY);
  };

  const openAddModal = (date = new Date()) => {
    const start = startOfDay(date);
    setFormData({
      title: '', start: format(start, "yyyy-MM-dd'T'09:00"), end: format(start, "yyyy-MM-dd'T'10:00"),
      allDay: false, sharedWith: [], groupIds: [], description: ''
    });
    setSelectedEvent(null);
    setErrorMsg('');
    setSelectedFriendUid('');
    setCodeSearchError('');
    setShowGroupDropdown(false);
    loadFriendsList();
    setIsModalOpen(true);
  };

  const openEditModal = async (event) => {
    setSelectedEvent(event);
    setErrorMsg('');
    setSelectedFriendUid('');
    setCodeSearchError('');
    setShowGroupDropdown(false);

    // Resolver IDs de sharedWith a objetos con nombre
    let sharedWithUsers = [];
    const rawSharedWith = event.sharedWith || [];
    if (rawSharedWith.length > 0) {
      // Si ya son objetos (añadidos en sesión actual), usarlos directamente
      if (typeof rawSharedWith[0] === 'object') {
        sharedWithUsers = rawSharedWith;
      } else {
        // Son IDs (cargados de Firebase) — resolver nombres
        const details = await gruposService.getMemberDetails(rawSharedWith);
        sharedWithUsers = details.map(u => ({ id: u.id, name: u.name, surname: u.surname }));
      }
    }

    setFormData({
      title: event.title,
      start: format(event.start, "yyyy-MM-dd'T'HH:mm"),
      end: format(event.end, "yyyy-MM-dd'T'HH:mm"),
      allDay: event.allDay || false,
      sharedWith: sharedWithUsers,
      groupIds: event.groupIds || [],
      description: event.description || ''
    });
    loadFriendsList();
    setIsModalOpen(true);
  };

  const loadFriendsList = async () => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;
    try {
      const friends = await friendsService.getFriends(currentUserId);
      setFriendsList(friends);
    } catch (e) {
      console.error('Error loading friends:', e);
    }
  };

  const handleAddFriend = () => {
    if (!selectedFriendUid) return;
    setCodeSearchError('');
    const friend = friendsList.find(f => f.uid === selectedFriendUid);
    if (!friend) return;
    if (formData.sharedWith.some(u => u.id === friend.uid)) {
      setCodeSearchError('Esta persona ya fue añadida');
      return;
    }
    setFormData(prev => ({ ...prev, sharedWith: [...prev.sharedWith, { id: friend.uid, name: friend.name, surname: friend.surname }] }));
    setSelectedFriendUid('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    let finalStart, finalEnd;
    if (formData.allDay) {
      const datePart = formData.start.split('T')[0];
      finalStart = startOfDay(new Date(datePart + 'T00:00:00'));
      finalEnd = endOfDay(new Date(datePart + 'T23:59:59'));
    } else {
      finalStart = new Date(formData.start);
      finalEnd = new Date(formData.end);
    }

    if (finalEnd < finalStart) {
      setErrorMsg("La fecha de finalización no puede ser anterior a la fecha de inicio.");
      return;
    }

    const eventData = {
      ...formData,
      start: finalStart,
      end: finalEnd,
      sharedWith: formData.sharedWith.map(u => u.id),
    };
    try {
      if (selectedEvent) await updateEvent(selectedEvent.id, eventData);
      else await addEvent(eventData);
      setIsModalOpen(false);
    } catch (error) { console.error("Error saving event:", error); }
  };

  const handleDelete = async () => {
    if (selectedEvent) {
      try { 
        await deleteEvent(selectedEvent.id); 
        setShowDeleteConfirm(false);
        setIsModalOpen(false); 
      }
      catch (error) { console.error("Error deleting event:", error); }
    }
  };

  const handleDateChange = (type, value) => {
    const timePart = formData[type].split('T')[1] || '09:00';
    const newDateTime = `${value}T${timePart}`;
    if (type === 'start') {
      const oldStartDate = formData.start.split('T')[0];
      if (oldStartDate === formData.end.split('T')[0]) {
        setFormData({ ...formData, start: newDateTime, end: `${value}T${formData.end.split('T')[1] || '10:00'}` });
        return;
      }
    }
    setFormData({ ...formData, [type]: newDateTime });
  };

  const handleTimeChange = (type, value) => {
    const datePart = formData[type].split('T')[0];
    setFormData({ ...formData, [type]: `${datePart}T${value}` });
  };

  return (
    <div className={styles.calendarContainer}>
      <header className={styles.calendarHeader}>
        <h1 className={styles.headerTitle}>
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h1>

        <div className={styles.navGroup}>
          <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={handleToday} className="px-4 py-1.5 text-xs font-black hover:bg-white rounded-md transition-colors uppercase tracking-wider">Hoy</button>
          <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-md transition-colors"><ChevronRight size={20} /></button>
        </div>

        <div className={styles.viewGroup}>
          {Object.values(VIEWS).map((v) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              className={`px-6 py-2 text-xs font-black rounded-md transition-all uppercase tracking-widest ${view === v ? 'bg-white text-[#1a1a1a] shadow-sm border border-gray-200' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
            >
              {v === VIEWS.MONTH ? 'Mes' : v === VIEWS.WEEK ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>

        <button onClick={() => openAddModal(currentDate)} className={styles.actionButton}>
          <span>Nuevo</span>
        </button>
      </header>

      <main className="flex-1 overflow-hidden min-h-0">
        <div className="h-full bg-white overflow-hidden flex flex-col min-h-0">
          {view === VIEWS.MONTH && (
            <MonthView 
              currentDate={currentDate} 
              events={events} 
              onEventClick={openEditModal} 
              onDayClick={openAddModal} 
              onMoreClick={goToDay}
            />
          )}
          {view === VIEWS.WEEK && <WeekView currentDate={currentDate} events={events} onEventClick={openEditModal} />}
          {view === VIEWS.DAY && <DayView currentDate={currentDate} events={events} onEventClick={openEditModal} />}
        </div>
      </main>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-sm font-black flex items-center gap-3 text-[#1a1a1a] uppercase tracking-widest">
                <div className="bg-[#1a1a1a] text-white p-1.5 rounded">
                  {selectedEvent ? <Edit2 size={14}/> : <Plus size={14}/>}
                </div>
                {selectedEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-black/10 rounded transition-colors text-[#1a1a1a]">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.modalForm}>
              {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={18} />
                    <p className="text-xs font-black text-red-700 uppercase">{errorMsg}</p>
                  </div>
                </div>
              )}
              
              <div className={styles.formSection}>
                <div className="relative">
                  <label className="block text-[10px] font-black mb-1.5 text-gray-400 uppercase tracking-widest">Título</label>
                  <input type="text" required className={styles.inputField} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="¿Qué vas a hacer?" />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black mb-1.5 text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <AlignLeft size={12}/> Descripción
                  </label>
                  <textarea rows="2" className="w-full border border-gray-200 rounded p-3 focus:border-[#1a1a1a] outline-none transition-all text-sm resize-none bg-gray-50" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              
              <div className={styles.formTimeSection}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Tiempo</span>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={formData.allDay} onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })} className="w-4 h-4 cursor-pointer accent-[#1a1a1a]" />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-[#1a1a1a]">Todo el día</span>
                  </label>
                </div>
                {formData.allDay ? (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Fecha</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="date" required className="w-full bg-white border border-gray-300 rounded px-10 py-2.5 focus:border-[#1a1a1a] outline-none font-bold text-sm" value={formData.start.split('T')[0]} onChange={(e) => handleDateChange('start', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={styles.formGrid}>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Inicio</label>
                        <input type="date" required className="w-full bg-white border border-gray-300 rounded px-3 py-2.5 focus:border-[#1a1a1a] outline-none font-bold text-sm" value={formData.start.split('T')[0]} onChange={(e) => handleDateChange('start', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Hora</label>
                        <input type="time" required className="w-full bg-white border border-gray-300 rounded px-3 py-2.5 focus:border-[#1a1a1a] outline-none font-bold text-sm" value={formData.start.split('T')[1] || '09:00'} onChange={(e) => handleTimeChange('start', e.target.value)} />
                      </div>
                    </div>
                    <div className={styles.formGrid}>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Fin</label>
                        <input type="date" required className="w-full bg-white border border-gray-300 rounded px-3 py-2.5 focus:border-[#1a1a1a] outline-none font-bold text-sm" value={formData.end.split('T')[0]} onChange={(e) => handleDateChange('end', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase">Hora</label>
                        <input type="time" required className="w-full bg-white border border-gray-300 rounded px-3 py-2.5 focus:border-[#1a1a1a] outline-none font-bold text-sm" value={formData.end.split('T')[1] || '10:00'} onChange={(e) => handleTimeChange('end', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black mb-1.5 text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> Personas</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border border-gray-300 rounded px-3 py-2 focus:border-[#1a1a1a] outline-none text-xs bg-gray-50"
                      value={selectedFriendUid}
                      onChange={(e) => { setSelectedFriendUid(e.target.value); setCodeSearchError(''); }}
                    >
                      <option value="">
                        {friendsList.length === 0 ? 'Sin amigos aún...' : 'Selecciona un amigo...'}
                      </option>
                      {friendsList
                        .filter(f => !formData.sharedWith.some(u => u.id === f.uid))
                        .map(f => (
                          <option key={f.uid} value={f.uid}>
                            {f.name} {f.surname} @{f.username}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddFriend}
                      disabled={!selectedFriendUid}
                      className="px-3 py-2 bg-[#1a1a1a] text-white text-xs font-black rounded hover:bg-black disabled:opacity-40 transition-all uppercase tracking-wider"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {codeSearchError && <p className="text-[10px] text-red-500 font-bold mt-1">{codeSearchError}</p>}
                  {formData.sharedWith.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {formData.sharedWith.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 bg-[#1a1a1a] text-white text-[9px] font-bold px-2 py-0.5 rounded">
                          {u.name} {u.surname}{u.username ? ` @${u.username}` : ''}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, sharedWith: prev.sharedWith.filter(x => x.id !== u.id) }))} className="hover:opacity-70"><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                  <label className="block text-[10px] font-black mb-1.5 text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Layers size={12} /> Grupos</label>
                  <button
                    type="button"
                    onClick={() => setShowGroupDropdown(v => !v)}
                    className="w-full border border-gray-300 rounded px-3 py-2.5 text-left text-xs bg-gray-50 focus:border-[#1a1a1a] outline-none flex items-center justify-between"
                  >
                    <span className="truncate text-gray-500">
                      {formData.groupIds.length === 0
                        ? 'Seleccionar...'
                        : `${formData.groupIds.length} grupo${formData.groupIds.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronRight size={12} className={`shrink-0 transition-transform ${showGroupDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  {showGroupDropdown && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border-2 border-[#1a1a1a] rounded shadow-xl max-h-48 overflow-y-auto">
                      {myGroups.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">No perteneces a ningún grupo</div>
                      ) : (
                        myGroups.map(group => {
                          const checked = formData.groupIds.includes(group.id);
                          return (
                            <label key={group.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? formData.groupIds.filter(id => id !== group.id)
                                    : [...formData.groupIds, group.id];
                                  setFormData({ ...formData, groupIds: next });
                                }}
                                className="w-3.5 h-3.5 accent-[#1a1a1a] cursor-pointer"
                              />
                              <span className="text-xs font-bold text-[#1a1a1a] truncate">{group.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                  {formData.groupIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {formData.groupIds.map(id => {
                        const g = myGroups.find(gr => gr.id === id);
                        return g ? (
                          <span key={id} className="inline-flex items-center gap-1 bg-[#1a1a1a] text-white text-[9px] font-bold px-2 py-0.5 rounded">
                            {g.name}
                            <button type="button" onClick={() => setFormData({ ...formData, groupIds: formData.groupIds.filter(x => x !== id) })} className="hover:opacity-70"><X size={9} /></button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                {selectedEvent && (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-5 bg-white text-red-500 font-bold py-3 rounded border-2 border-red-100 flex items-center justify-center hover:bg-red-50 transition-colors"><Trash2 size={20} /></button>
                )}
                <button type="submit" className="flex-1 bg-[#1a1a1a] text-white font-black py-4 rounded hover:bg-black transition-all uppercase text-xs tracking-[0.2em] shadow-lg">{selectedEvent ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-sm overflow-hidden border-2 border-[#1a1a1a] animate-in zoom-in duration-150">
            <div className="p-8 text-center space-y-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight text-[#1a1a1a]">¿Eliminar evento?</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-md hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 bg-red-600 text-white font-black py-4 rounded-md hover:bg-red-700 transition-all uppercase text-[10px] tracking-widest shadow-lg shadow-red-200">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({ currentDate, events, onEventClick, onDayClick, onMoreClick }) {
  const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks = []; for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex flex-col h-full bg-[#c0c8cf] gap-px overflow-hidden">
      <div className="grid grid-cols-7 bg-[#f8f9fa] shrink-0">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (<div key={d} className="p-2 text-center text-[10px] font-bold text-gray-500 border-r border-[#c0c8cf] last:border-r-0 uppercase">{d}</div>))}</div>
      <div className="flex-1 flex flex-col min-h-0 bg-[#c0c8cf] gap-px">
        {weeks.map((weekDays, weekIdx) => (
          <div key={weekIdx} className="flex-1 grid grid-cols-7 relative bg-white gap-px min-h-0">
            {weekDays.map((day, dIdx) => (
              <div key={dIdx} className={`relative p-2 transition-all cursor-pointer ${!isSameMonth(day, monthStart) ? 'bg-[#fafafa] opacity-50' : 'bg-white hover:bg-[#f0f4f8]'}`} onClick={() => onDayClick(day)}>
                <div className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${isSameDay(day, new Date()) ? 'bg-[#1a1a1a] text-white shadow-sm' : 'text-gray-400'}`}>{format(day, 'd')}</div>
              </div>
            ))}
            <div className="absolute top-8 left-0 right-0 bottom-0 pointer-events-none px-1">{renderHorizontalEvents(weekDays, events, onEventClick, true, onMoreClick)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, onEventClick }) {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="grid grid-cols-[60px_1fr] bg-[#f8f9fa] border-b border-[#c0c8cf] shrink-0">
        <div className="border-r border-[#c0c8cf]"></div>
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <div key={day.toString()} className="p-3 text-center border-r border-[#c0c8cf] last:border-0">
              <div className="text-[10px] font-bold text-gray-500 uppercase">{format(day, 'EEE', { locale: es })}</div>
              <div className={`text-base font-bold mt-1 ${isSameDay(day, new Date()) ? 'text-[#1a1a1a] underline decoration-2' : ''}`}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-[60px_1fr] border-b border-[#c0c8cf] bg-white shrink-0 min-h-[30px]">
        <div className="border-r border-[#c0c8cf] bg-gray-50 flex items-center justify-center"><CalendarIcon size={12} className="text-gray-400" /></div>
        <div className="relative py-1 bg-white">{renderHorizontalEvents(days, events, onEventClick)}</div>
      </div>

      <div className={`flex-1 ${css.calendarGridScrollable} relative bg-white min-h-0`}>
        <div className="grid grid-cols-[60px_1fr] relative">
          <div className="bg-[#f8f9fa] border-r border-[#c0c8cf] shrink-0">
            {hours.map(h => (<div key={h} className="h-20 p-2 text-right text-[10px] font-bold text-gray-400 border-b border-[#f0f0f0]">{h.toString().padStart(2, '0')}:00</div>))}
          </div>
          <div className="grid grid-cols-7 relative divide-x divide-[#f0f0f0] flex-1">
            {days.map((day) => {
              const dayStart = startOfDay(day);
              const dayEnd = endOfDay(day);
              const dayEvents = events.filter(e => {
                if (e.allDay) return false;
                const s = new Date(e.start);
                const f = new Date(e.end);
                return s <= dayEnd && f >= dayStart;
              });
              const layout = computeTimedLayout(dayEvents, 80, day);
              return (
                <div key={day.toString()} className="relative h-full">
                  {hours.map(h => <div key={h} className="h-20 border-b border-[#f0f0f0]"></div>)}
                  {layout.map(({ event, style }, i) => {
                    const colors = getEventColor(event.id);
                    return (
                      <div 
                        key={`${event.id}-${i}`} 
                        onClick={() => onEventClick(event)} 
                        style={{...style, borderLeftWidth: '5px'}} 
                        className={`absolute px-1 py-1 text-[10px] font-bold rounded shadow-sm hover:brightness-95 hover:!z-[100] hover:scale-[1.01] cursor-pointer z-10 overflow-hidden leading-tight transition-all ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        <div className="truncate">{event.title}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayView({ currentDate, events, onEventClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);
  const timedEvents = events.filter(e => {
    if (e.allDay) return false;
    const s = new Date(e.start);
    const f = new Date(e.end);
    return s <= dayEnd && f >= dayStart;
  });

  const hourWidth = 150; 
  const layout = computeHorizontalLayout(timedEvents, hourWidth, currentDate);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {format(currentDate, 'EEEE, d MMMM', { locale: es })}
        </span>
      </div>

      <div className="flex flex-col border-b border-[#c0c8cf] bg-white shrink-0">
        <div className="flex min-w-max p-1 bg-gray-50 border-b border-gray-100">
           <span className="text-[9px] font-bold text-gray-400 uppercase px-2 flex items-center gap-1"><CalendarIcon size={10}/> Todo el día</span>
        </div>
        <div className="relative py-1 bg-white min-h-[30px]">
           {renderHorizontalEvents([currentDate], events, onEventClick)}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto relative">
        <div className="sticky top-0 z-30 flex bg-[#f8f9fa] border-b border-[#c0c8cf] min-w-max">
          {hours.map(h => (
            <div key={h} style={{ width: `${hourWidth}px` }} className="shrink-0 p-3 text-center border-r border-[#f0f0f0] last:border-r-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase">{h.toString().padStart(2, '0')}:00</div>
            </div>
          ))}
        </div>

        <div className="relative min-w-max p-6" style={{ height: `${Math.max(400, layout.totalHeight + 100)}px` }}>
          <div className="absolute inset-0 flex pointer-events-none px-6">
            {hours.map(h => (
              <div key={h} style={{ width: `${hourWidth}px` }} className="h-full border-r border-[#f0f0f0] last:border-r-0 shrink-0"></div>
            ))}
          </div>

          <div className="relative">
            {layout.items.map(({ event, style }, i) => {
              const colors = getEventColor(event.id);
              return (
                <div 
                  key={`${event.id}-${i}`} 
                  onClick={() => onEventClick(event)} 
                  style={style} 
                  className={`absolute px-4 py-3 rounded border-l-4 shadow-sm hover:brightness-95 cursor-pointer z-10 flex flex-col group overflow-hidden transition-all ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  <div className="font-bold text-[11px] truncate">{event.title}</div>
                  <div className="text-[9px] font-bold opacity-70 mt-1 flex items-center gap-1 uppercase tracking-tight">
                    <Clock size={10}/> {format(new Date(event.start), 'HH:mm')} — {format(new Date(event.end), 'HH:mm')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function computeHorizontalLayout(dayEvents, hourWidth, day) {
  if (!dayEvents.length) return { items: [], totalHeight: 0 };
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  
  const sorted = [...dayEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
  const lanes = []; 
  const results = [];
  const laneHeight = 80;
  const laneGap = 15;
  
  sorted.forEach(event => {
    const s = new Date(event.start);
    const f = new Date(event.end);
    const effectiveStart = s < dayStart ? dayStart : s;
    const effectiveEnd = f > dayEnd ? dayEnd : f;
    
    let laneIdx = lanes.findIndex(lane => {
      const lastEventInLane = lane[lane.length - 1];
      return new Date(lastEventInLane.end) <= s;
    });
    
    if (laneIdx === -1) {
      lanes.push([event]);
      laneIdx = lanes.length - 1;
    } else {
      lanes[laneIdx].push(event);
    }
    
    const left = ((effectiveStart - dayStart) / (1000 * 60 * 60)) * hourWidth;
    const width = Math.max(120, ((effectiveEnd - effectiveStart) / (1000 * 60 * 60)) * hourWidth);
    const top = laneIdx * (laneHeight + laneGap);
    
    results.push({
      event,
      style: {
        left: `${left}px`,
        width: `${width}px`,
        top: `${top}px`,
        height: `${laneHeight}px`
      }
    });
  });
  
  return {
    items: results,
    totalHeight: lanes.length * (laneHeight + laneGap)
  };
}

function computeTimedLayout(dayEvents, hourHeight, day) {
  if (!dayEvents.length) return [];
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  
  const sorted = [...dayEvents].sort((a, b) => 
    new Date(a.start) - new Date(b.start) || 
    (new Date(b.end) - new Date(b.start)) - (new Date(a.end) - new Date(a.start))
  );
  
  const columns = [];
  sorted.forEach(event => {
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const lastEventInColumn = columns[i][columns[i].length - 1];
      if (new Date(lastEventInColumn.end) <= new Date(event.start)) {
        columns[i].push(event);
        event.colIdx = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      event.colIdx = columns.length - 1;
    }
  });

  const results = [];
  sorted.forEach(e => {
    const s = new Date(e.start);
    const f = new Date(e.end);
    const effectiveStart = s < dayStart ? dayStart : s;
    const effectiveEnd = f > dayEnd ? dayEnd : f;
    
    const top = (effectiveStart.getHours() * hourHeight) + (effectiveStart.getMinutes() / 60 * hourHeight);
    const durationHours = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
    const height = Math.max(22, durationHours * hourHeight);
    
    const offset = e.colIdx * 12;
    
    results.push({
      event: e,
      style: {
        top: `${top}px`,
        height: `${height}px`,
        left: `${offset}px`,
        width: `calc(100% - ${offset + 8}px)`,
        zIndex: 10 + e.colIdx,
        boxShadow: e.colIdx > 0 ? 'rgba(0, 0, 0, 0.15) -4px 0px 10px' : 'none',
        borderLeftWidth: '5px',
        paddingLeft: '10px',
        opacity: 0.9
      }
    });
  });
  return results;
}

function renderHorizontalEvents(days, events, onEventClick, showAll = false, onMoreClick = null) {
  const rangeStart = startOfDay(days[0]); const rangeEnd = endOfDay(days[days.length - 1]);
  const rangeEvents = events.filter(e => {
    const s = new Date(e.start); const f = new Date(e.end);
    if (showAll) return s <= rangeEnd && f >= rangeStart;
    return (e.allDay || diffInDays(f, s) >= 1) && s <= rangeEnd && f >= rangeStart;
  });
  
  rangeEvents.sort((a, b) => (new Date(b.end) - new Date(b.start)) - (new Date(a.end) - new Date(a.start)));
  
  const levels = []; const eventPositions = [];
  const MAX_VISIBLE_LEVELS = 3;
  const hiddenCounts = new Array(days.length).fill(0);

  rangeEvents.forEach(event => {
    let startIdx = 0; while(startIdx < days.length && !isSameDay(days[startIdx], new Date(event.start)) && days[startIdx] < new Date(event.start)) startIdx++;
    let endIdx = days.length - 1; while(endIdx >= 0 && !isSameDay(days[endIdx], new Date(event.end)) && days[endIdx] > new Date(event.end)) endIdx--;
    
    if (startIdx > days.length - 1 || endIdx < 0) return;
    
    let level = 0;
    while (true) {
      if (!levels[level]) levels[level] = new Array(days.length).fill(false);
      let conflict = false; 
      for (let i = startIdx; i <= endIdx; i++) {
        if (levels[level][i]) { conflict = true; break; }
      }
      if (!conflict) { 
        for (let i = startIdx; i <= endIdx; i++) levels[level][i] = true; 
        
        if (showAll && level >= MAX_VISIBLE_LEVELS) {
          for (let i = startIdx; i <= endIdx; i++) hiddenCounts[i]++;
        } else {
          eventPositions.push({ event, level, startIdx, span: endIdx - startIdx + 1 }); 
        }
        break; 
      }
      level++; if (level > 30) break;
    }
  });

  return (
    <div className={`grid grid-cols-${days.length} grid-flow-row-dense gap-y-0.5 px-0.5 relative`}>
      {eventPositions.map(({ event, level, startIdx, span }, i) => {
        const colors = getEventColor(event.id);
        return (
          <div 
            key={i} 
            onClick={(ev) => { ev.stopPropagation(); onEventClick(event); }} 
            style={{ gridColumn: `${startIdx + 1} / span ${span}`, gridRow: level + 1, pointerEvents: 'auto' }} 
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border-l-2 shadow-sm hover:opacity-90 cursor-pointer truncate transition-all ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {event.title}
          </div>
        );
      })}
      {showAll && hiddenCounts.map((count, idx) => count > 0 && (
        <div 
          key={`more-${idx}`}
          onClick={(ev) => { ev.stopPropagation(); if (onMoreClick) onMoreClick(days[idx]); }}
          style={{ gridColumn: idx + 1, gridRow: MAX_VISIBLE_LEVELS + 1 }}
          className="text-[9px] font-black text-gray-400 px-1.5 py-0.5 mt-0.5 pointer-events-auto cursor-pointer hover:text-[#1a1a1a] hover:bg-gray-100 rounded transition-colors"
        >
          +{count} más
        </div>
      ))}
    </div>
  );
}
