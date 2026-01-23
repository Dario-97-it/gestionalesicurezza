import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { editionsApi, coursesApi, instructorsApi, companiesApi } from '../lib/api';
import type { CourseEdition, Course, Instructor, Company } from '../types';
import toast from 'react-hot-toast';

interface Session {
  id: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  location?: string;
  notes?: string;
}

export default function Editions() {
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<CourseEdition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sessioni
  const [expandedEdition, setExpandedEdition] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    sessionDate: '',
    startTime: '09:00',
    endTime: '13:00',
    hours: 4,
    location: '',
    notes: '',
  });

  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    editionType: 'public' as 'public' | 'private' | 'multi',
    dedicatedCompanyId: '',
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: '20',
    price: '',
    status: 'scheduled',
    notes: '',
  });

  const statusOptions = [
    { value: 'scheduled', label: 'Programmata', color: 'bg-blue-100 text-blue-700' },
    { value: 'ongoing', label: 'In Corso', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'completed', label: 'Completata', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Annullata', color: 'bg-red-100 text-red-700' },
  ];

  const typeOptions = [
    { value: 'public', label: 'Pubblica', color: 'bg-green-100 text-green-700' },
    { value: 'private', label: 'Privata', color: 'bg-purple-100 text-purple-700' },
    { value: 'multi', label: 'Multi-azienda', color: 'bg-orange-100 text-orange-700' },
  ];

  // Fetch editions
  const fetchEditions = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await editionsApi.getAll(page, pagination.pageSize, statusFilter || undefined, courseFilter);
      let filteredData = response.data || [];
      if (typeFilter) {
        filteredData = filteredData.filter((e: any) => e.editionType === typeFilter);
      }
      setEditions(filteredData);
      setPagination({
        page: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err: any) {
      console.error('Error fetching editions:', err);
      setError('Errore nel caricamento delle edizioni');
      setEditions([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, statusFilter, courseFilter, typeFilter]);

  // Fetch dropdown data
  const fetchDropdownData = useCallback(async () => {
    try {
      const [coursesRes, instructorsRes, companiesRes] = await Promise.all([
        coursesApi.getAll(1, 100),
        instructorsApi.getAll(1, 100),
        companiesApi.getAll({ pageSize: 100 })
      ]);
      setCourses(coursesRes.data || []);
      setInstructors(instructorsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  }, []);

  // Load sessions for an edition
  const loadSessions = async (editionId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setSessions([]);
    }
  };

  useEffect(() => {
    fetchEditions();
    fetchDropdownData();
  }, [statusFilter, courseFilter, typeFilter]);

  const handlePageChange = (page: number) => {
    fetchEditions(page);
  };

  const toggleExpand = async (editionId: number) => {
    if (expandedEdition === editionId) {
      setExpandedEdition(null);
    } else {
      setExpandedEdition(editionId);
      await loadSessions(editionId);
    }
  };

  const openCreateModal = () => {
    setSelectedEdition(null);
    const defaultCourse = courses.find(c => c.isActive);
    setFormData({
      courseId: '',
      instructorId: '',
      editionType: 'public',
      dedicatedCompanyId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      location: '',
      maxParticipants: '20',
      price: defaultCourse ? String(defaultCourse.defaultPrice / 100) : '0',
      status: 'scheduled',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setFormData({
      courseId: edition.courseId ? String(edition.courseId) : '',
      instructorId: edition.instructorId ? String(edition.instructorId) : '',
      editionType: (edition as any).editionType || 'public',
      dedicatedCompanyId: (edition as any).dedicatedCompanyId ? String((edition as any).dedicatedCompanyId) : '',
      startDate: edition.startDate ? edition.startDate.split('T')[0] : '',
      endDate: edition.endDate ? edition.endDate.split('T')[0] : '',
      location: edition.location || '',
      maxParticipants: edition.maxParticipants ? String(edition.maxParticipants) : '',
      price: (edition as any).price ? String((edition as any).price / 100) : '0',
      status: edition.status || 'scheduled',
      notes: (edition as any).notes || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        courseId: formData.courseId ? Number(formData.courseId) : undefined,
        instructorId: formData.instructorId ? Number(formData.instructorId) : undefined,
        editionType: formData.editionType,
        dedicatedCompanyId: formData.editionType === 'private' && formData.dedicatedCompanyId 
          ? Number(formData.dedicatedCompanyId) 
          : null,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        location: formData.location || undefined,
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : undefined,
        price: formData.price ? Math.round(Number(formData.price) * 100) : 0,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      if (selectedEdition) {
        await editionsApi.update(selectedEdition.id, data);
        toast.success('Edizione aggiornata con successo');
      } else {
        await editionsApi.create(data);
        toast.success('Edizione creata con successo');
      }
      setIsModalOpen(false);
      fetchEditions(pagination.page);
    } catch (err: any) {
      console.error('Error saving edition:', err);
      toast.error(err.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEdition) return;
    setIsSaving(true);
    try {
      await editionsApi.delete(selectedEdition.id);
      toast.success('Edizione eliminata con successo');
      setIsDeleteDialogOpen(false);
      fetchEditions(pagination.page);
    } catch (err: any) {
      console.error('Error deleting edition:', err);
      toast.error(err.response?.data?.error || 'Errore nell\'eliminazione');
    } finally {
      setIsSaving(false);
    }
  };

  // Session handlers
  const openSessionModal = (editionId: number) => {
    setExpandedEdition(editionId);
    setSessionForm({
      sessionDate: '',
      startTime: '09:00',
      endTime: '13:00',
      hours: 4,
      location: '',
      notes: '',
    });
    setIsSessionModalOpen(true);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedEdition) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${expandedEdition}/sessions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionForm),
      });
      
      if (!response.ok) {
        throw new Error('Errore nella creazione della sessione');
      }
      
      toast.success('Sessione aggiunta');
      setIsSessionModalOpen(false);
      await loadSessions(expandedEdition);
      fetchEditions(pagination.page);
    } catch (err) {
      toast.error('Errore nell\'aggiunta della sessione');
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Eliminare questa sessione?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/sessions/${sessionId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Sessione eliminata');
      if (expandedEdition) {
        await loadSessions(expandedEdition);
      }
      fetchEditions(pagination.page);
    } catch (err) {
      toast.error('Errore nella cancellazione');
      console.error(err);
    }
  };

  const sendCalendarInvite = async (editionId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/editions/${editionId}/send-invite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Invito calendario inviato al docente');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Errore nell\'invio');
      }
    } catch (err) {
      toast.error('Errore nell\'invio dell\'invito');
      console.error(err);
    }
  };

  // Calculate hours from times
  const calculateHours = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  useEffect(() => {
    if (sessionForm.startTime && sessionForm.endTime) {
      const hours = calculateHours(sessionForm.startTime, sessionForm.endTime);
      setSessionForm(prev => ({ ...prev, hours }));
    }
  }, [sessionForm.startTime, sessionForm.endTime]);

  const getCourseName = (courseId?: number) => {
    if (!courseId) return '-';
    const course = courses.find(c => c.id === courseId);
    return course?.title || '-';
  };

  const getInstructorName = (instructorId?: number) => {
    if (!instructorId) return 'Non assegnato';
    const instructor = instructors.find(i => i.id === instructorId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : '-';
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return '-';
    const company = companies.find(c => c.id === companyId);
    return company?.name || '-';
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
        {option?.label || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const option = typeOptions.find(o => o.value === type);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
        {option?.label || 'Pubblica'}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return '€ 0,00';
    return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Edizioni Corsi</h1>
            <p className="text-gray-600 mt-1">Gestione delle edizioni con sessioni multiple e inviti calendario</p>
          </div>
          <Button onClick={openCreateModal}>
            + Nuova Edizione
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
            {error}
            <button onClick={() => fetchEditions()} className="ml-4 underline">Riprova</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <select
            value={courseFilter || ''}
            onChange={(e) => setCourseFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti i corsi</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti i tipi</option>
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tutti gli stati</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setCourseFilter(undefined); setStatusFilter(''); setTypeFilter(''); }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Reset filtri
          </button>
        </div>

        {/* Editions List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : editions.length === 0 ? (
              <EmptyState
                title="Nessuna edizione trovata"
                description="Inizia creando una nuova edizione di un corso"
                action={<Button onClick={openCreateModal}>+ Nuova Edizione</Button>}
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {editions.map((edition) => (
                  <div key={edition.id} className="p-4">
                    {/* Edition Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getCourseName(edition.courseId)}
                          </h3>
                          {getTypeBadge((edition as any).editionType || 'public')}
                          {getStatusBadge(edition.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>{formatDate(edition.startDate)} - {formatDate(edition.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{edition.location || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>{(edition as any).registrationsCount || 0} / {edition.maxParticipants} iscritti</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>👨‍🏫</span>
                            <span>{getInstructorName(edition.instructorId)}</span>
                          </div>
                        </div>
                        {(edition as any).editionType === 'private' && (edition as any).dedicatedCompanyId && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                            <span>🏢</span>
                            <span>Riservata a: {getCompanyName((edition as any).dedicatedCompanyId)}</span>
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-500">
                          Prezzo: {formatPrice((edition as any).price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(edition.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Mostra/nascondi sessioni"
                        >
                          {expandedEdition === edition.id ? '🔼' : '🔽'}
                        </button>
                        <button
                          onClick={() => sendCalendarInvite(edition.id)}
                          className="p-2 text-blue-400 hover:text-blue-600"
                          title="Invia invito calendario al docente"
                        >
                          ✉️
                        </button>
                        <button
                          onClick={() => openEditModal(edition)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDeleteDialog(edition)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Sessions Panel */}
                    {expandedEdition === edition.id && (
                      <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 pb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">📆 Sessioni del corso</h4>
                          <Button size="sm" onClick={() => openSessionModal(edition.id)}>
                            + Aggiungi sessione
                          </Button>
                        </div>
                        {sessions.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Nessuna sessione programmata. Aggiungi le giornate del corso.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((session, idx) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between bg-white p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-medium text-gray-500 w-8">
                                    #{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span>📅</span>
                                    <span className="font-medium">{formatDate(session.sessionDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>🕐</span>
                                    <span>{session.startTime} - {session.endTime}</span>
                                    <span className="text-blue-600 font-medium">({session.hours}h)</span>
                                  </div>
                                  {session.location && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span>📍</span>
                                      <span>{session.location}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                            <div className="text-right text-sm font-medium text-gray-700 pt-2">
                              Totale ore: {sessions.reduce((sum, s) => sum + s.hours, 0)}h
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Edition Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEdition ? 'Modifica Edizione' : 'Nuova Edizione'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corso *</label>
            <select
              required
              value={formData.courseId}
              onChange={(e) => {
                const course = courses.find(c => c.id === Number(e.target.value));
                setFormData({ 
                  ...formData, 
                  courseId: e.target.value,
                  price: course ? String(course.defaultPrice / 100) : formData.price
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona un corso</option>
              {courses.filter(c => c.isActive).map(course => (
                <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Edizione *</label>
            <select
              value={formData.editionType}
              onChange={(e) => setFormData({ ...formData, editionType: e.target.value as 'public' | 'private' | 'multi' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="public">Pubblica (aperta a tutti)</option>
              <option value="private">Privata (una sola azienda)</option>
              <option value="multi">Multi-azienda (aziende selezionate)</option>
            </select>
          </div>

          {formData.editionType === 'private' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Azienda Dedicata *</label>
              <select
                required
                value={formData.dedicatedCompanyId}
                onChange={(e) => setFormData({ ...formData, dedicatedCompanyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona azienda</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data Inizio *"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Data Fine"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <Input
            label="Location *"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Es: Sede Catania, Via Roma 123"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docente</label>
              <select
                value={formData.instructorId}
                onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona un docente</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Max Partecipanti"
              type="number"
              min="1"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prezzo (€)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {selectedEdition ? 'Salva Modifiche' : 'Crea Edizione'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Aggiungi Sessione"
      >
        <form onSubmit={handleAddSession} className="space-y-4">
          <Input
            label="Data *"
            type="date"
            required
            value={sessionForm.sessionDate}
            onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ora Inizio *"
              type="time"
              required
              value={sessionForm.startTime}
              onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
            />
            <Input
              label="Ora Fine *"
              type="time"
              required
              value={sessionForm.endTime}
              onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
            />
          </div>

          <Input
            label="Ore (calcolate automaticamente)"
            type="number"
            min="0.5"
            step="0.5"
            value={sessionForm.hours}
            onChange={(e) => setSessionForm({ ...sessionForm, hours: parseFloat(e.target.value) })}
          />

          <Input
            label="Location (se diversa)"
            value={sessionForm.location}
            onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
            placeholder="Lascia vuoto per usare la location dell'edizione"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              rows={2}
              value={sessionForm.notes}
              onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsSessionModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit">
              Aggiungi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Edizione"
        message="Sei sicuro di voler eliminare questa edizione? Questa azione non può essere annullata e rimuoverà anche tutte le sessioni, iscrizioni e presenze associate."
        confirmText="Elimina"
        isLoading={isSaving}
      />
    </Layout>
  );
}
