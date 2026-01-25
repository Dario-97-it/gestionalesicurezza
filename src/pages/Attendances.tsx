import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { editionsApi, registrationsApi, coursesApi, studentsApi, companiesApi } from '../lib/api';
import { exportAttendancePDF, exportAttendanceExcel } from '../lib/pdfExport';
	import type { CourseEdition, Registration, Course, Student, Attendance } from '../types';
	import { useLocation } from 'react-router-dom';

interface EditionSession {
  id: number;
  editionId: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  location?: string;
  notes?: string;
}

	interface StudentAttendance {
	  registrationId: number;
	  studentId: number;
	  firstName: string;
	  lastName: string;
	  email: string;
	  companyName: string;
	  present: boolean;
	  hoursAttended: number;
	  sessionHours: number;
	  // Nuovi campi per la firma digitale
	  signInTime?: string;
	  signOutTime?: string;
	  signatureMethod?: 'manual' | 'otp' | 'qr_code';
	  // Stato iscrizione per bocciatura
	  registrationStatus: 'confirmed' | 'completed' | 'failed';
	}

	
	export default function Attendances() {
	  const location = useLocation();
	  const queryParams = new URLSearchParams(location.search);
	  const initialEditionId = queryParams.get('editionId') ? Number(queryParams.get('editionId')) : undefined;
	
	  const [editions, setEditions] = useState<CourseEdition[]>([]);
	  const [courses, setCourses] = useState<Course[]>([]);
	  const [students, setStudents] = useState<Student[]>([]);
	  const [companies, setCompanies] = useState<any[]>([]);
	  const [selectedEdition, setSelectedEdition] = useState<number | undefined>(initialEditionId);
	  const [sessions, setSessions] = useState<EditionSession[]>([]);
	  const [selectedSession, setSelectedSession] = useState<number | undefined>();
	  const [attendances, setAttendances] = useState<StudentAttendance[]>([]);
	  const [isLoading, setIsLoading] = useState(false);
	  const [isSaving, setIsSaving] = useState(false);
	  const [error, setError] = useState<string | null>(null);
	  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	
	  // Fetch editions and courses
	  const fetchDropdownData = useCallback(async () => {
    try {
      const [editionsRes, coursesRes, studentsRes, companiesRes] = await Promise.all([
        editionsApi.getAll(1, 100),
        coursesApi.getAll(1, 100),
        studentsApi.getAll(1, 100),
        companiesApi.getAll(1, 100)
      ]);
      setEditions(editionsRes.data || []);
      setCourses(coursesRes.data || []);
      setStudents(studentsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      setError('Errore nel caricamento dei dati');
    }
  }, []);

  // Fetch sessions for selected edition
  const fetchSessions = useCallback(async (editionId: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Errore nel caricamento delle sessioni');
      const data = await response.json();
      setSessions(data.sessions || data.data || data || []);
      setSelectedSession(undefined);
      setAttendances([]);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setSessions([]);
      setError('Errore nel caricamento delle sessioni');
    } finally {
      setIsLoading(false);
    }
  }, []);

	  // Fetch attendances for selected session
	  const fetchAttendances = useCallback(async (editionId: number, sessionId: number) => {
	    try {
	      setIsLoading(true);
	      setError(null);
	
	      // 1. Get registrations for this edition
	      const regResponse = await registrationsApi.getAll(1, 3000, editionId); // Increased pageSize for bulk
	      const registrations = regResponse.data || [];
	
	      // 2. Get session details
	      const token = localStorage.getItem('accessToken');
	      const headers = {
	        'Authorization': `Bearer ${token}`,
	        'Content-Type': 'application/json'
	      };
	      const sessionResponse = await fetch(`/api/sessions/${sessionId}`, { headers });
	      const sessionData = await sessionResponse.json();
	      const session = sessionData.data || sessionData;
	
	      // 3. Get attendances for this session
	      const attResponse = await fetch(`/api/attendances?editionId=${editionId}&sessionId=${sessionId}`, { headers });
	      const attData = await attResponse.json();
	      const existingAttendances: Attendance[] = attData.data || [];
	
	      // 4. Build student attendance list
	      const studentAttendances: StudentAttendance[] = registrations.map((reg: Registration) => {
	        const student = students.find(s => s.id === reg.studentId);
	        const existing = existingAttendances.find(a => a.registrationId === reg.id);
	        
	        return {
	          registrationId: reg.id,
	          studentId: reg.studentId || 0,
	          firstName: student?.firstName || '-',
	          lastName: student?.lastName || '-',
	          email: student?.email || '-',
	          companyName: student?.companyId ? (companies.find(c => c.id === student.companyId)?.name || '-') : '-',
	          present: existing?.present || false,
	          hoursAttended: existing?.hoursAttended || 0,
	          sessionHours: session.hours || 0,
	          signInTime: existing?.signInTime,
	          signOutTime: existing?.signOutTime,
	          signatureMethod: existing?.signatureMethod as 'manual' | 'otp' | 'qr_code',
	          registrationStatus: reg.status as 'confirmed' | 'completed' | 'failed',
	        };
	      });
	
	      setAttendances(studentAttendances);
	    } catch (err: any) {
	      console.error('Error fetching attendances:', err);
	      setError('Errore nel caricamento delle presenze');
	      setAttendances([]);
	    } finally {
	      setIsLoading(false);
	    }
	  }, [students, companies]);

	  // Load data on mount
	  useEffect(() => {
	    fetchDropdownData();
	  }, [fetchDropdownData]);
	
	  // Load sessions when edition changes
	  useEffect(() => {
	    if (selectedEdition) {
	      fetchSessions(selectedEdition);
	    } else {
	      setSessions([]);
	      setSelectedSession(undefined);
	      setAttendances([]);
	    }
	  }, [selectedEdition, fetchSessions]);
	
	  // Load attendances when session changes
	  useEffect(() => {
	    if (selectedEdition && selectedSession) {
	      fetchAttendances(selectedEdition, selectedSession);
	    } else {
	      setAttendances([]);
	    }
	  }, [selectedSession, selectedEdition, fetchAttendances]);
	
	  // Auto-select first session if edition is pre-selected
	  useEffect(() => {
	    if (initialEditionId && sessions.length > 0 && !selectedSession) {
	      setSelectedSession(sessions[0].id);
	    }
	  }, [initialEditionId, sessions, selectedSession]);

  const handleEditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedEdition(value ? Number(value) : undefined);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSession(value ? Number(value) : undefined);
  };

	  const toggleAttendance = async (studentId: number, registrationId: number, sessionHours: number) => {
	    if (!selectedEdition || !selectedSession) return;
	
	    setIsSaving(true);
	    try {
	      const existing = attendances.find(a => a.studentId === studentId);
	      const newPresent = !existing?.present;
	      const now = new Date().toISOString();
	      const newHours = newPresent ? sessionHours : 0;
	
	      const token = localStorage.getItem('accessToken');
	      const response = await fetch('/api/attendances/upsert', {
	        method: 'POST',
	        headers: { 
	          'Content-Type': 'application/json',
	          'Authorization': `Bearer ${token}`
	        },
	        body: JSON.stringify({
	          courseEditionId: selectedEdition,
	          studentId,
	          registrationId,
	          sessionId: selectedSession,
	          present: newPresent,
	          hoursAttended: newHours,
	          // Simulazione firma digitale (manuale per ora)
	          signInTime: newPresent ? now : null,
	          signOutTime: newPresent ? now : null,
	          signatureMethod: 'manual',
	        })
	      });
	
	      if (!response.ok) throw new Error('Errore nel salvataggio');
	
	      // Update local state
	      setAttendances(prev => {
	        const index = prev.findIndex(a => a.studentId === studentId);
	        if (index >= 0) {
	          const updated = [...prev];
	          updated[index] = {
	            ...updated[index],
	            present: newPresent,
	            hoursAttended: newHours,
	            signInTime: newPresent ? now : undefined,
	            signOutTime: newPresent ? now : undefined,
	            signatureMethod: 'manual',
	          };
	          return updated;
	        }
	        return prev;
	      });
	
	      setMessage({ type: 'success', text: newPresent ? 'Presenza registrata' : 'Assenza registrata' });
	      setTimeout(() => setMessage(null), 2000);
	    } catch (err: any) {
	      console.error('Error toggling attendance:', err);
	      setMessage({ type: 'error', text: 'Errore nel salvataggio della presenza' });
	    } finally {
	      setIsSaving(false);
	    }
	  };

  const markAllPresent = async () => {
    if (!selectedEdition || !selectedSession || attendances.length === 0) return;

    setIsSaving(true);
    try {
      const sessionHours = attendances[0]?.sessionHours || 0;

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/attendances/mark-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          editionId: selectedEdition,
          sessionId: selectedSession,
          present: true,
          hoursAttended: sessionHours
        })
      });

      if (!response.ok) throw new Error('Errore nel salvataggio');

      setAttendances(prev => prev.map(a => ({
        ...a,
        present: true,
        hoursAttended: a.sessionHours
      })));

      setMessage({ type: 'success', text: 'Tutti presenti registrati' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      console.error('Error marking all present:', err);
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

	  const markAllAbsent = async () => {
	    if (!selectedEdition || !selectedSession || attendances.length === 0) return;
	
	    setIsSaving(true);
	    try {
	      const token = localStorage.getItem('accessToken');
	      const response = await fetch('/api/attendances/mark-all', {
	        method: 'POST',
	        headers: { 
	          'Content-Type': 'application/json',
	          'Authorization': `Bearer ${token}`
	        },
	        body: JSON.stringify({
	          editionId: selectedEdition,
	          sessionId: selectedSession,
	          present: false,
	          hoursAttended: 0,
	          signInTime: null,
	          signOutTime: null,
	        })
	      });
	
	      if (!response.ok) throw new Error('Errore nel salvataggio');
	
	      setAttendances(prev => prev.map(a => ({
	        ...a,
	        present: false,
	        hoursAttended: 0,
	        signInTime: undefined,
	        signOutTime: undefined,
	      })));
	
	      setMessage({ type: 'success', text: 'Tutti assenti registrati' });
	      setTimeout(() => setMessage(null), 2000);
	    } catch (err: any) {
	      console.error('Error marking all absent:', err);
	      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
	    } finally {
	      setIsSaving(false);
	    }
	  };
	
	  const handleFailStudent = async (registrationId: number) => {
	    if (!selectedEdition) return;
	
	    setIsSaving(true);
	    try {
	      // 1. Aggiorna lo stato dell'iscrizione a 'failed'
	      await registrationsApi.update(registrationId, { status: 'failed' });
	
	      // 2. Aggiorna lo stato locale
	      setAttendances(prev => prev.map(a => 
	        a.registrationId === registrationId ? { ...a, registrationStatus: 'failed' as const } : a
	      ));
	
	      // 3. Trova il corso e l'edizione per la raccomandazione
	      const edition = editions.find(e => e.id === selectedEdition);
	      const course = courses.find(c => c.id === edition?.courseId);
	
	      // 4. Invia notifica all'operatore (o implementa la logica di raccomandazione)
	      // Per ora, solo un messaggio di successo
	      setMessage({ type: 'success', text: `Studente bocciato. Raccomandato per il prossimo corso ${course?.title || ''}.` });
	      setTimeout(() => setMessage(null), 5000);
	
	    } catch (err: any) {
	      console.error('Error failing student:', err);
	      setMessage({ type: 'error', text: 'Errore nella bocciatura dello studente' });
	    } finally {
	      setIsSaving(false);
	    }
	  };

  const getEditionInfo = (editionId: number) => {
    const edition = editions.find(e => e.id === editionId);
    if (!edition) return 'Edizione';
    const course = courses.find(c => c.id === edition.courseId);
    return course?.title || 'Corso';
  };

  const getSessionInfo = (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return 'Sessione';
    const date = new Date(session.date).toLocaleDateString('it-IT');
    return `${date} • ${session.startTime}-${session.endTime}`;
  };

  const handleExportPDF = () => {
    if (!selectedEdition || !selectedSession) return;
    const edition = editions.find(e => e.id === selectedEdition);
    const course = courses.find(c => c.id === edition?.courseId);
    const session = sessions.find(s => s.id === selectedSession);
    if (!edition || !course || !session) return;
    const editionDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
    const sessionDate = new Date(session.date).toLocaleDateString('it-IT');
    const sessionInfo = `${sessionDate} ${session.startTime}-${session.endTime}`;
    exportAttendancePDF({
      courseName: course.title,
      editionDate,
      sessionInfo,
      instructor: 'Da compilare',
      location: session.location || edition.location || 'Da compilare',
      students: attendances,
      totalHours,
      totalSessionHours
    });
  };

  const handleExportExcel = async () => {
    if (!selectedEdition || !selectedSession) return;
    const edition = editions.find(e => e.id === selectedEdition);
    const course = courses.find(c => c.id === edition?.courseId);
    const session = sessions.find(s => s.id === selectedSession);
    if (!edition || !course || !session) return;
    const editionDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
    const sessionDate = new Date(session.date).toLocaleDateString('it-IT');
    const sessionInfo = `${sessionDate} ${session.startTime}-${session.endTime}`;
    await exportAttendanceExcel({
      courseName: course.title,
      editionDate,
      sessionInfo,
      instructor: 'Da compilare',
      location: session.location || edition.location || 'Da compilare',
      students: attendances,
      totalHours,
      totalSessionHours
    });
  };

  const presentCount = attendances.filter(a => a.present).length;
  const totalCount = attendances.length;
  const totalHours = attendances.reduce((sum, a) => sum + a.hoursAttended, 0);
  const totalSessionHours = attendances.length > 0 ? attendances[0].sessionHours * attendances.length : 0;
  const frequencyPercent = totalSessionHours > 0 ? Math.round((totalHours / totalSessionHours) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Registro Presenze</h1>
            <p className="text-gray-600 mt-1">Gestione delle presenze ai corsi di formazione</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Seleziona Edizione e Sessione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edizione Corso</label>
                <select
                  value={selectedEdition || ''}
                  onChange={handleEditionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleziona un'edizione</option>
                  {editions.map(edition => {
                    const course = courses.find(c => c.id === edition.courseId);
                    const startDate = edition.startDate ? new Date(edition.startDate).toLocaleDateString('it-IT') : '';
                    return (
                      <option key={edition.id} value={edition.id}>
                        {course?.title || 'Corso'} - {startDate}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sessione</label>
                <select
                  value={selectedSession || ''}
                  onChange={handleSessionChange}
                  disabled={!selectedEdition || sessions.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Seleziona una sessione</option>
                  {sessions.map(session => {
                    const date = new Date(session.date).toLocaleDateString('it-IT');
                    return (
                      <option key={session.id} value={session.id}>
                        {date} • {session.startTime}-{session.endTime} ({session.hours}h)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        {selectedEdition && selectedSession && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>{getEditionInfo(selectedEdition)}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Sessione: {getSessionInfo(selectedSession)}
                  </p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>Presenti: <strong>{presentCount}/{totalCount}</strong></span>
                    <span>Ore: <strong>{totalHours}/{totalSessionHours}</strong></span>
                    <span className={`font-bold ${frequencyPercent >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                      Frequenza: {frequencyPercent}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={markAllPresent} variant="secondary" disabled={isSaving || attendances.length === 0}>
                    ✅ Tutti Presenti
                  </Button>
                  <Button onClick={markAllAbsent} variant="secondary" disabled={isSaving || attendances.length === 0}>
                    ❌ Tutti Assenti
                  </Button>
                  <Button onClick={handleExportPDF} variant="secondary" disabled={attendances.length === 0}>
                    📄 Esporta PDF
                  </Button>
                  <Button onClick={handleExportExcel} variant="secondary" disabled={attendances.length === 0}>
                    📊 Esporta Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : attendances.length === 0 ? (
                <EmptyState title="Nessuno studente iscritto" description="Non ci sono studenti iscritti a questa edizione" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Studente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead className="text-center">Presente</TableHead>
	                      <TableHead className="text-center">Ore</TableHead>
	                      <TableHead className="text-center">Stato Finale</TableHead>
	                      <TableHead className="text-center">Azione</TableHead>
	                    </TableRow>
	                  </TableHeader>
	                  <TableBody>
	                    {attendances.map(att => (
	                      <TableRow key={att.studentId} className={att.present ? 'bg-green-50' : ''}>
	                        <TableCell className="font-medium">{att.firstName} {att.lastName}</TableCell>
	                        <TableCell>{att.email}</TableCell>
	                        <TableCell>{att.companyName}</TableCell>
	                        <TableCell className="text-center">
	                          {att.present ? (
	                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
	                              ✓ Presente
	                            </span>
	                          ) : (
	                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
	                              ✗ Assente
	                            </span>
	                          )}
	                          {att.signInTime && <div className="text-xs text-gray-500 mt-1">Entrata: {new Date(att.signInTime).toLocaleTimeString('it-IT')}</div>}
	                          {att.signOutTime && <div className="text-xs text-gray-500">Uscita: {new Date(att.signOutTime).toLocaleTimeString('it-IT')}</div>}
	                        </TableCell>
	                        <TableCell className="text-center">
	                          {att.hoursAttended} / {att.sessionHours}h
	                        </TableCell>
	                        <TableCell className="text-center">
	                          {att.registrationStatus === 'failed' ? (
	                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
	                              Bocciato
	                            </span>
	                          ) : att.registrationStatus === 'completed' ? (
	                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
	                              Completato
	                            </span>
	                          ) : (
	                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
	                              In Corso
	                            </span>
	                          )}
	                        </TableCell>
	                        <TableCell className="text-center">
	                          <Button
	                            onClick={() => toggleAttendance(att.studentId, att.registrationId, att.sessionHours)}
	                            variant={att.present ? 'danger' : 'primary'}
	                            size="sm"
	                            disabled={isSaving}
	                          >
	                            {att.present ? 'Segna Assente' : 'Segna Presente'}
	                          </Button>
	                          {att.registrationStatus !== 'failed' && (
	                            <Button
	                              onClick={() => handleFailStudent(att.registrationId)}
	                              variant="danger"
	                              size="sm"
	                              className="mt-2"
	                              disabled={isSaving}
	                            >
	                              Boccia
	                            </Button>
	                          )}
	                        </TableCell>
	                      </TableRow>
	                    ))}
	                  </TableBody>
	                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!selectedEdition && (
          <Card>
            <CardContent className="pt-12 pb-12">
              <EmptyState 
                title="Seleziona un'edizione" 
                description="Scegli un'edizione e una sessione per visualizzare il registro presenze"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
