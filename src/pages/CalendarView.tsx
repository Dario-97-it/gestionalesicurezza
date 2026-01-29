import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import itLocale from '@fullcalendar/core/locales/it';
import { editionsApi, coursesApi } from '../lib/api';
import type { CourseEdition, Course } from '../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    editionId: number;
    sessionId?: number;
    courseId: number;
    courseName: string;
    location?: string;
    instructor?: string;
    type: 'session' | 'edition';
  };
}

interface EditionSession {
  id: number;
  editionId: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  location?: string;
  notes?: string;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'dayGridMonth' | 'timeGridWeek' | 'listMonth'>('dayGridMonth');
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [createSessionForm, setCreateSessionForm] = useState({
    editionId: '',
    sessionDate: '',
    startTime: '09:00',
    endTime: '13:00',
    hours: 4,
    location: '',
    notes: ''
  });

  // Colori per i diversi corsi
  const courseColors = [
    { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF' }, // Blue
    { bg: '#10B981', border: '#059669', text: '#FFFFFF' }, // Green
    { bg: '#F59E0B', border: '#D97706', text: '#FFFFFF' }, // Amber
    { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' }, // Red
    { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' }, // Purple
    { bg: '#EC4899', border: '#DB2777', text: '#FFFFFF' }, // Pink
    { bg: '#06B6D4', border: '#0891B2', text: '#FFFFFF' }, // Cyan
    { bg: '#F97316', border: '#EA580C', text: '#FFFFFF' }, // Orange
  ];

  const getColorForCourse = (courseId: number) => {
    const index = courseId % courseColors.length;
    return courseColors[index];
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [editionsRes, coursesRes] = await Promise.all([
        editionsApi.getAll(1, 100),
        coursesApi.getAll(1, 100)
      ]);
      
      const editionsData = editionsRes.data || [];
      const coursesData = coursesRes.data || [];
      
      setEditions(editionsData);
      setCourses(coursesData);

      // Fetch sessions for each edition
      const allEvents: CalendarEvent[] = [];
      
      for (const edition of editionsData) {
        const course = coursesData.find((c: Course) => c.id === edition.courseId);
        const color = getColorForCourse(edition.courseId);
        
        try {
          const token = localStorage.getItem('accessToken');
          const sessionsRes = await fetch(`/api/editions/${edition.id}/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (sessionsRes.ok) {
            const sessionsData = await sessionsRes.json();
            const sessions = sessionsData.sessions || sessionsData.data || [];
            
            sessions.forEach((session: EditionSession) => {
              const startDateTime = `${session.sessionDate}T${session.startTime}:00`;
              const endDateTime = `${session.sessionDate}T${session.endTime}:00`;
              
              allEvents.push({
                id: `session-${session.id}`,
                title: course?.title || 'Corso',
                start: startDateTime,
                end: endDateTime,
                backgroundColor: color.bg,
                borderColor: color.border,
                textColor: color.text,
                extendedProps: {
                  editionId: edition.id,
                  sessionId: session.id,
                  courseId: edition.courseId,
                  courseName: course?.title || 'Corso',
                  location: session.location || edition.location,
                  instructor: edition.instructor?.firstName ? 
                    `${edition.instructor.firstName} ${edition.instructor.lastName}` : undefined,
                  type: 'session'
                }
              });
            });
          }
        } catch (err) {
          console.error(`Error fetching sessions for edition ${edition.id}:`, err);
        }
      }
      
      setEvents(allEvents);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: event.extendedProps
    });
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setCreateSessionForm({
      ...createSessionForm,
      sessionDate: info.dateStr
    });
    setIsCreateSessionModalOpen(true);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
  };

  const closeCreateSessionModal = () => {
    setIsCreateSessionModalOpen(false);
    setCreateSessionForm({
      editionId: '',
      sessionDate: '',
      startTime: '09:00',
      endTime: '13:00',
      hours: 4,
      location: '',
      notes: ''
    });
  };

  const handleCreateSession = async () => {
    if (!createSessionForm.editionId || !createSessionForm.sessionDate) {
      toast.error('Compila i campi obbligatori');
      return;
    }

    setIsSavingSession(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${createSessionForm.editionId}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionDate: createSessionForm.sessionDate,
          startTime: createSessionForm.startTime,
          endTime: createSessionForm.endTime,
          hours: parseInt(createSessionForm.hours.toString()),
          location: createSessionForm.location,
          notes: createSessionForm.notes
        })
      });

      if (response.ok) {
        toast.success('Sessione creata con successo');
        closeCreateSessionModal();
        fetchData(); // Ricarica i dati
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore nella creazione della sessione');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Errore nella creazione della sessione');
    } finally {
      setIsSavingSession(false);
    }
  };

  const goToAttendances = () => {
    if (selectedEvent) {
      navigate('/attendances');
    }
  };

  const goToEdition = () => {
    if (selectedEvent) {
      navigate('/editions');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">📅 Calendario Sessioni</h1>
            <p className="text-gray-600 mt-1">Vista calendario di tutte le sessioni formative</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setViewMode('dayGridMonth')}
              className={viewMode === 'dayGridMonth' ? 'bg-blue-600' : 'bg-gray-500'}
            >
              Mese
            </Button>
            <Button 
              onClick={() => setViewMode('timeGridWeek')}
              className={viewMode === 'timeGridWeek' ? 'bg-blue-600' : 'bg-gray-500'}
            >
              Settimana
            </Button>
            <Button 
              onClick={() => setViewMode('listMonth')}
              className={viewMode === 'listMonth' ? 'bg-blue-600' : 'bg-gray-500'}
            >
              Lista
            </Button>
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <span className="text-sm font-medium text-gray-700">Legenda corsi:</span>
              {courses.slice(0, 8).map((course, index) => {
                const color = getColorForCourse(course.id);
                return (
                  <div key={course.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: color.bg }}
                    />
                    <span className="text-sm text-gray-600">{course.title}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <FullCalendar
                key={viewMode}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                initialView={viewMode}
                locale={itLocale}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="auto"
                aspectRatio={1.8}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                allDaySlot={false}
                weekends={true}
                nowIndicator={true}
                dayMaxEvents={3}
                moreLinkText="altri"
                noEventsText="Nessuna sessione programmata"
              />
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{events.length}</div>
              <div className="text-sm text-gray-600">Sessioni Totali</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{editions.length}</div>
              <div className="text-sm text-gray-600">Edizioni Attive</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{courses.length}</div>
              <div className="text-sm text-gray-600">Corsi</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {events.reduce((sum, e) => {
                  if (e.start && e.end) {
                    const start = new Date(e.start);
                    const end = new Date(e.end);
                    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  }
                  return sum;
                }, 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Ore Totali</div>
            </CardContent>
          </Card>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEvent.extendedProps.courseName}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedEvent.start} - {selectedEvent.end}</p>
                </div>
                
                {selectedEvent.extendedProps.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Luogo</p>
                    <p className="text-gray-900">{selectedEvent.extendedProps.location}</p>
                  </div>
                )}
                
                {selectedEvent.extendedProps.instructor && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Docente</p>
                    <p className="text-gray-900">{selectedEvent.extendedProps.instructor}</p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={goToAttendances} className="flex-1">
                    Presenze
                  </Button>
                  <Button onClick={goToEdition} variant="secondary" className="flex-1">
                    Edizione
                  </Button>
                  <Button onClick={closeEventModal} variant="secondary" className="flex-1">
                    Chiudi
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Session Modal */}
        <Modal
          isOpen={isCreateSessionModalOpen}
          onClose={closeCreateSessionModal}
          title="Crea Nuova Sessione"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edizione Corso *</label>
              <select
                value={createSessionForm.editionId}
                onChange={(e) => setCreateSessionForm({ ...createSessionForm, editionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona un'edizione</option>
                {editions.map((edition) => {
                  const course = courses.find(c => c.id === edition.courseId);
                  return (
                    <option key={edition.id} value={edition.id}>
                      {course?.title} - {edition.startDate}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Sessione *</label>
              <input
                type="date"
                value={createSessionForm.sessionDate}
                onChange={(e) => setCreateSessionForm({ ...createSessionForm, sessionDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ora Inizio *</label>
                <input
                  type="time"
                  value={createSessionForm.startTime}
                  onChange={(e) => setCreateSessionForm({ ...createSessionForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ora Fine *</label>
                <input
                  type="time"
                  value={createSessionForm.endTime}
                  onChange={(e) => setCreateSessionForm({ ...createSessionForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ore *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={createSessionForm.hours}
                onChange={(e) => setCreateSessionForm({ ...createSessionForm, hours: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
              <input
                type="text"
                value={createSessionForm.location}
                onChange={(e) => setCreateSessionForm({ ...createSessionForm, location: e.target.value })}
                placeholder="Es. Aula Magna"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={createSessionForm.notes}
                onChange={(e) => setCreateSessionForm({ ...createSessionForm, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateSession} isLoading={isSavingSession} className="flex-1">
                Crea Sessione
              </Button>
              <Button onClick={closeCreateSessionModal} variant="secondary" className="flex-1">
                Annulla
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
