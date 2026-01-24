/**
 * Pagina Report: Studenti da Recuperare
 * Mostra gli studenti assenti/bocciati che devono essere riproposti
 * per la prossima edizione dello stesso corso
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface StudentToRecover {
  studentId: number;
  studentName: string;
  studentFiscalCode: string | null;
  companyId: number | null;
  companyName: string | null;
  courseId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  lastEditionId: number;
  lastEditionDate: string;
  lastEditionLocation: string;
  reason: 'absent' | 'failed' | 'partial_attendance';
  reasonDescription: string;
  attendancePercent: number | null;
  nextEditionId: number | null;
  nextEditionDate: string | null;
  nextEditionLocation: string | null;
  nextEditionAvailableSpots: number | null;
}

interface Stats {
  totalStudents: number;
  byReason: {
    absent: number;
    failed: number;
    partial_attendance: number;
  };
  withNextEdition: number;
  withoutNextEdition: number;
}

export default function StudentsToRecover() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentToRecover[]>([]);
  const [byCourse, setByCourse] = useState<Record<string, StudentToRecover[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtri
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (courseTypeFilter) params.append('courseType', courseTypeFilter);

      const response = await fetch(`/api/reports/students-to-recover?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento');
      }

      const data = await response.json();
      setStudents(data.students || []);
      setByCourse(data.byCourse || {});
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error fetching students to recover:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [courseTypeFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const getReasonBadge = (reason: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      absent: { label: 'Assente', color: 'bg-red-100 text-red-700' },
      failed: { label: 'Non superato', color: 'bg-orange-100 text-orange-700' },
      partial_attendance: { label: 'Frequenza insufficiente', color: 'bg-yellow-100 text-yellow-700' }
    };
    const badge = badges[reason] || { label: reason, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const handleEnrollStudent = async (studentId: number, editionId: number) => {
    // Naviga alla pagina iscrizioni con i parametri precompilati
    navigate(`/registrations?studentId=${studentId}&editionId=${editionId}&action=create`);
  };

  // Filtra per motivo
  const filteredStudents = reasonFilter 
    ? students.filter(s => s.reason === reasonFilter)
    : students;

  const filteredByCourse: Record<string, StudentToRecover[]> = {};
  Object.entries(byCourse).forEach(([course, courseStudents]) => {
    const filtered = reasonFilter 
      ? courseStudents.filter(s => s.reason === reasonFilter)
      : courseStudents;
    if (filtered.length > 0) {
      filteredByCourse[course] = filtered;
    }
  });

  // Tipi corso unici
  const courseTypes = [...new Set(students.map(s => s.courseType))].filter(Boolean);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔄 Studenti da Recuperare</h1>
            <p className="text-gray-500">
              Studenti assenti o bocciati da iscrivere alla prossima edizione
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchStudents}>
              🔄 Aggiorna
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-sm text-gray-500">Totale da recuperare</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.byReason.absent}</p>
                <p className="text-sm text-gray-500">Assenti</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.byReason.failed}</p>
                <p className="text-sm text-gray-500">Non superato</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.byReason.partial_attendance}</p>
                <p className="text-sm text-gray-500">Frequenza insufficiente</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.withNextEdition}</p>
                <p className="text-sm text-gray-500">Con edizione disponibile</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtri */}
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={courseTypeFilter}
            onChange={(e) => setCourseTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i tipi corso</option>
            {courseTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti i motivi</option>
            <option value="absent">Assenti</option>
            <option value="failed">Non superato</option>
            <option value="partial_attendance">Frequenza insufficiente</option>
          </select>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-2 text-sm ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Per Corso
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchStudents} className="mt-2" size="sm">Riprova</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 text-lg">🎉 Nessuno studente da recuperare!</p>
              <p className="text-gray-400 mt-2">Tutti gli studenti hanno completato i corsi con successo.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grouped' ? (
          /* Vista raggruppata per corso */
          <div className="space-y-6">
            {Object.entries(filteredByCourse).map(([courseName, courseStudents]) => (
              <Card key={courseName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>📚 {courseName}</span>
                    <span className="text-sm font-normal text-gray-500">
                      {courseStudents.length} student{courseStudents.length === 1 ? 'e' : 'i'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courseStudents.map((student) => (
                      <div
                        key={`${student.studentId}-${student.lastEditionId}`}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{student.studentName}</span>
                            {getReasonBadge(student.reason)}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 space-y-1">
                            {student.companyName && (
                              <p>🏢 {student.companyName}</p>
                            )}
                            <p>📅 Ultima edizione: {formatDate(student.lastEditionDate)} - {student.lastEditionLocation}</p>
                            <p className="text-gray-600">{student.reasonDescription}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {student.nextEditionId ? (
                            <div>
                              <p className="text-sm text-green-600 font-medium">
                                ✅ Prossima edizione disponibile
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(student.nextEditionDate)} - {student.nextEditionLocation}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.nextEditionAvailableSpots} posti disponibili
                              </p>
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => handleEnrollStudent(student.studentId, student.nextEditionId!)}
                              >
                                Iscrivi →
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-orange-600 font-medium">
                                ⚠️ Nessuna edizione programmata
                              </p>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="mt-2"
                                onClick={() => navigate('/editions?action=create')}
                              >
                                Crea Edizione
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Vista lista */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Studente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corso</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prossima Edizione</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={`${student.studentId}-${student.lastEditionId}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          {student.studentFiscalCode && (
                            <p className="text-xs text-gray-500">{student.studentFiscalCode}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {student.companyName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{student.courseTitle}</p>
                          <p className="text-xs text-gray-500">{student.courseCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          {getReasonBadge(student.reason)}
                        </td>
                        <td className="px-4 py-3">
                          {student.nextEditionId ? (
                            <div>
                              <p className="text-sm text-green-600">{formatDate(student.nextEditionDate)}</p>
                              <p className="text-xs text-gray-500">{student.nextEditionLocation}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-orange-600">Nessuna</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {student.nextEditionId ? (
                            <Button
                              size="sm"
                              onClick={() => handleEnrollStudent(student.studentId, student.nextEditionId!)}
                            >
                              Iscrivi
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate('/editions?action=create')}
                            >
                              Crea Edizione
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
