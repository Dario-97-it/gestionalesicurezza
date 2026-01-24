/**
 * Pagina Report: Incarichi Docenti
 * Mostra tutti gli incarichi assegnati ai docenti con dettagli
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportToExcel } from '../lib/excel';

interface Session {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  location: string | null;
}

interface Assignment {
  editionId: number;
  courseTitle: string;
  courseCode: string;
  courseType: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  totalHours: number;
  totalStudents: number;
  editionType: string;
  sessions: Session[];
}

interface InstructorReport {
  instructorId: number;
  instructorName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  hourlyRate: number | null;
  totalAssignments: number;
  totalHours: number;
  totalStudents: number;
  totalEarnings: number | null;
  assignmentsByStatus: {
    scheduled: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  assignments: Assignment[];
}

interface Stats {
  totalInstructors: number;
  totalAssignments: number;
  totalHours: number;
  totalStudents: number;
  byStatus: {
    scheduled: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
}

export default function InstructorAssignments() {
  const [instructors, setInstructors] = useState<InstructorReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedInstructor, setExpandedInstructor] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      params.append('year', String(selectedYear));
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/reports/instructor-assignments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento');
      }

      const data = await response.json();
      setInstructors(data.instructors || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error fetching instructor assignments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, statusFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      scheduled: { label: 'Programmata', color: 'bg-blue-100 text-blue-700' },
      ongoing: { label: 'In Corso', color: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completata', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annullata', color: 'bg-red-100 text-red-700' }
    };
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const handleExport = () => {
    const exportData: any[] = [];
    
    instructors.forEach(instructor => {
      instructor.assignments.forEach(assignment => {
        exportData.push({
          'Docente': instructor.instructorName,
          'Email': instructor.email || '',
          'Telefono': instructor.phone || '',
          'Corso': assignment.courseTitle,
          'Codice': assignment.courseCode,
          'Tipo': assignment.courseType,
          'Data Inizio': formatDate(assignment.startDate),
          'Data Fine': formatDate(assignment.endDate),
          'Location': assignment.location,
          'Stato': assignment.status,
          'Ore': assignment.totalHours,
          'Studenti': assignment.totalStudents
        });
      });
    });

    if (exportData.length === 0) {
      exportData.push({
        'Docente': 'Nessun incarico',
        'Email': '',
        'Telefono': '',
        'Corso': '',
        'Codice': '',
        'Tipo': '',
        'Data Inizio': '',
        'Data Fine': '',
        'Location': '',
        'Stato': '',
        'Ore': '',
        'Studenti': ''
      });
    }

    exportToExcel(exportData, `incarichi_docenti_${selectedYear}`);
  };

  // Anni disponibili
  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👨‍🏫 Incarichi Docenti</h1>
            <p className="text-gray-500">
              Tracciamento degli incarichi assegnati ai docenti
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleExport}>
              📥 Esporta Excel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totalInstructors}</p>
                <p className="text-sm text-gray-500">Docenti attivi</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.totalAssignments}</p>
                <p className="text-sm text-gray-500">Incarichi totali</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.totalHours}</p>
                <p className="text-sm text-gray-500">Ore totali</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.totalStudents}</p>
                <p className="text-sm text-gray-500">Studenti formati</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.byStatus.completed}</p>
                <p className="text-sm text-gray-500">Corsi completati</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtri */}
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti gli stati</option>
            <option value="scheduled">Programmati</option>
            <option value="ongoing">In corso</option>
            <option value="completed">Completati</option>
            <option value="cancelled">Annullati</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchData} className="mt-2" size="sm">Riprova</Button>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : instructors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 text-lg">Nessun incarico trovato per {selectedYear}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {instructors.map((instructor) => (
              <Card key={instructor.instructorId}>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedInstructor(
                    expandedInstructor === instructor.instructorId ? null : instructor.instructorId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-lg">
                          {instructor.instructorName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{instructor.instructorName}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {instructor.email && <span>📧 {instructor.email}</span>}
                          {instructor.phone && <span>📱 {instructor.phone}</span>}
                          {instructor.specialization && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {instructor.specialization}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{instructor.totalAssignments}</p>
                        <p className="text-xs text-gray-500">Incarichi</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{instructor.totalHours}h</p>
                        <p className="text-xs text-gray-500">Ore</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{instructor.totalStudents}</p>
                        <p className="text-xs text-gray-500">Studenti</p>
                      </div>
                      {instructor.totalEarnings !== null && (
                        <div>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(instructor.totalEarnings)}
                          </p>
                          <p className="text-xs text-gray-500">Compenso</p>
                        </div>
                      )}
                      <span className="text-gray-400">
                        {expandedInstructor === instructor.instructorId ? '🔼' : '🔽'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {expandedInstructor === instructor.instructorId && (
                  <CardContent className="border-t">
                    {/* Riepilogo per stato */}
                    <div className="flex gap-4 mb-4 text-sm">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {instructor.assignmentsByStatus.scheduled} programmati
                      </span>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        {instructor.assignmentsByStatus.ongoing} in corso
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        {instructor.assignmentsByStatus.completed} completati
                      </span>
                      {instructor.assignmentsByStatus.cancelled > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                          {instructor.assignmentsByStatus.cancelled} annullati
                        </span>
                      )}
                    </div>

                    {/* Lista incarichi */}
                    <div className="space-y-3">
                      {instructor.assignments.map((assignment) => (
                        <div
                          key={assignment.editionId}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {assignment.courseTitle}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ({assignment.courseCode})
                                </span>
                                {getStatusBadge(assignment.status)}
                              </div>
                              <div className="mt-1 text-sm text-gray-500 space-y-1">
                                <p>📅 {formatDate(assignment.startDate)} - {formatDate(assignment.endDate)}</p>
                                <p>📍 {assignment.location}</p>
                                <p>👥 {assignment.totalStudents} studenti • ⏱️ {assignment.totalHours} ore</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-1 rounded ${
                                assignment.editionType === 'public' ? 'bg-green-100 text-green-700' :
                                assignment.editionType === 'private' ? 'bg-purple-100 text-purple-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {assignment.editionType === 'public' ? 'Pubblica' :
                                 assignment.editionType === 'private' ? 'Privata' : 'Multi-azienda'}
                              </span>
                            </div>
                          </div>

                          {/* Sessioni */}
                          {assignment.sessions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-2">SESSIONI:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {assignment.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="text-xs bg-white p-2 rounded border"
                                  >
                                    <p className="font-medium">{formatDate(session.date)}</p>
                                    <p className="text-gray-500">
                                      {session.startTime} - {session.endTime} ({session.hours}h)
                                    </p>
                                    {session.location && (
                                      <p className="text-gray-400 truncate">{session.location}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
