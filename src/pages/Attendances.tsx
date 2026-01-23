import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { attendancesApi, editionsApi, registrationsApi, coursesApi, studentsApi } from '../lib/api';
import type { Attendance, CourseEdition, Registration, Course, Student } from '../types';

export default function Attendances() {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch editions and courses
  const fetchDropdownData = useCallback(async () => {
    try {
      const [editionsRes, coursesRes, studentsRes] = await Promise.all([
        editionsApi.getAll(1, 100, 'in_progress'),
        coursesApi.getAll(1, 100),
        studentsApi.getAll(1, 100)
      ]);
      setEditions(editionsRes.data || []);
      setCourses(coursesRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  }, []);

  // Fetch registrations for selected edition
  const fetchRegistrations = useCallback(async (editionId: number) => {
    try {
      const response = await registrationsApi.getAll(1, 100, editionId);
      setRegistrations(response.data || []);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setRegistrations([]);
    }
  }, []);

  // Fetch attendances for selected edition and date
  const fetchAttendances = useCallback(async (editionId: number, date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await attendancesApi.getByEdition(editionId, date);
      setAttendances(response || []);
    } catch (err: any) {
      console.error('Error fetching attendances:', err);
      setError('Errore nel caricamento delle presenze');
      setAttendances([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Load registrations and attendances when edition changes
  useEffect(() => {
    if (selectedEdition) {
      fetchRegistrations(selectedEdition);
      fetchAttendances(selectedEdition, selectedDate);
    } else {
      setRegistrations([]);
      setAttendances([]);
    }
  }, [selectedEdition, selectedDate]);

  const handleEditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedEdition(value ? Number(value) : undefined);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const toggleAttendance = async (studentId: number, registrationId: number) => {
    if (!selectedEdition) return;
    
    setIsSaving(true);
    try {
      // Find existing attendance
      const existing = attendances.find(
        a => a.studentId === studentId && a.courseEditionId === selectedEdition
      );
      
      const newPresent = !existing?.present;
      
      await attendancesApi.upsert({
        courseEditionId: selectedEdition,
        studentId,
        registrationId,
        date: selectedDate,
        present: newPresent,
      });

      // Update local state
      setAttendances(prev => {
        const index = prev.findIndex(a => a.studentId === studentId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], present: newPresent };
          return updated;
        } else {
          return [...prev, { 
            id: Date.now(), 
            courseEditionId: selectedEdition, 
            studentId, 
            registrationId,
            date: selectedDate, 
            present: newPresent 
          } as Attendance];
        }
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
    if (!selectedEdition || registrations.length === 0) return;
    
    setIsSaving(true);
    try {
      await attendancesApi.markAll(selectedEdition, selectedDate, true);
      
      // Update local state
      setAttendances(registrations.map(r => ({
        id: Date.now() + r.id,
        courseEditionId: selectedEdition,
        studentId: r.studentId!,
        registrationId: r.id,
        date: selectedDate,
        present: true,
      } as Attendance)));

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
    if (!selectedEdition || registrations.length === 0) return;
    
    setIsSaving(true);
    try {
      await attendancesApi.markAll(selectedEdition, selectedDate, false);
      
      // Update local state
      setAttendances(registrations.map(r => ({
        id: Date.now() + r.id,
        courseEditionId: selectedEdition,
        studentId: r.studentId!,
        registrationId: r.id,
        date: selectedDate,
        present: false,
      } as Attendance)));

      setMessage({ type: 'success', text: 'Tutti assenti registrati' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      console.error('Error marking all absent:', err);
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStudentName = (studentId?: number) => {
    if (!studentId) return '-';
    const student = students.find(s => s.id === studentId);
    return student ? `${student.firstName} ${student.lastName}` : '-';
  };

  const getEditionInfo = (editionId: number) => {
    const edition = editions.find(e => e.id === editionId);
    if (!edition) return 'Edizione';
    const course = courses.find(c => c.id === edition.courseId);
    return course?.title || 'Corso';
  };

  const isPresent = (studentId: number) => {
    const attendance = attendances.find(a => a.studentId === studentId);
    return attendance?.present || false;
  };

  const presentCount = attendances.filter(a => a.present).length;
  const totalCount = registrations.length;

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
            <CardTitle>Seleziona Edizione e Data</CardTitle>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        {selectedEdition && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>{getEditionInfo(selectedEdition)}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Presenti: {presentCount} / {totalCount}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={markAllPresent} variant="secondary" disabled={isSaving || registrations.length === 0}>
                    ✅ Tutti Presenti
                  </Button>
                  <Button onClick={markAllAbsent} variant="secondary" disabled={isSaving || registrations.length === 0}>
                    ❌ Tutti Assenti
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : registrations.length === 0 ? (
                <EmptyState
                  title="Nessun iscritto"
                  description="Non ci sono studenti iscritti a questa edizione"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Studente</TableHead>
                      <TableHead className="text-center">Presenza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {getStudentName(registration.studentId)}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleAttendance(registration.studentId!, registration.id)}
                            disabled={isSaving}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              isPresent(registration.studentId!)
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {isPresent(registration.studentId!) ? '✅ Presente' : '❌ Assente'}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedEdition && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <p className="text-lg">Seleziona un'edizione del corso per registrare le presenze</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
