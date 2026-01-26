import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { editionsApi, coursesApi, instructorsApi, companiesApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import type { CourseEdition, Course, Instructor, Company } from '../types';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  UserIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface Session {
  id: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  location?: string;
  notes?: string;
}

export default function EditionsImproved() {
  const navigate = useNavigate();
  const [editions, setEditions] = useState<CourseEdition[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<number | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<CourseEdition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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

  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [companyPrices, setCompanyPrices] = useState<Record<number, string>>({});

  const statusOptions = [
    { value: 'scheduled', label: 'Programmata', color: 'bg-blue-100 text-blue-700', icon: '📅' },
    { value: 'ongoing', label: 'In Corso', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    { value: 'completed', label: 'Completata', color: 'bg-green-100 text-green-700', icon: '✅' },
    { value: 'cancelled', label: 'Annullata', color: 'bg-red-100 text-red-700', icon: '❌' },
  ];

  const typeOptions = [
    { value: 'public', label: 'Pubblica', color: 'bg-green-100 text-green-700', icon: '🌍' },
    { value: 'private', label: 'Privata', color: 'bg-purple-100 text-purple-700', icon: '🔒' },
    { value: 'multi', label: 'Multi-azienda', color: 'bg-orange-100 text-orange-700', icon: '🏢' },
  ];

  const fetchEditions = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await editionsApi.getAll(page, pagination.pageSize, statusFilter || undefined, courseFilter);
      let filteredData = response.data || [];
      if (typeFilter) {
        filteredData = filteredData.filter((e: any) => e.editionType === typeFilter);
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((e: any) => 
          getCourseName(e.courseId).toLowerCase().includes(searchLower) ||
          e.location?.toLowerCase().includes(searchLower)
        );
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
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, statusFilter, courseFilter, typeFilter, searchTerm]);

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesRes, instructorsRes, companiesRes] = await Promise.all([
          coursesApi.getAll(1, 100),
          instructorsApi.getAll(1, 100),
          companiesApi.getAll(1, 100),
        ]);
        setCourses(coursesRes.data || []);
        setInstructors(instructorsRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadData();
  }, []);

  const openCreateModal = () => {
    setSelectedEdition(null);
    setFormData({
      courseId: '',
      instructorId: '',
      editionType: 'public',
      dedicatedCompanyId: '',
      startDate: '',
      endDate: '',
      location: '',
      maxParticipants: '20',
      price: '',
      status: 'scheduled',
      notes: '',
    });
    setSelectedCompanies([]);
    setCompanyPrices({});
    setIsModalOpen(true);
  };

  const openEditModal = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setFormData({
      courseId: String(edition.courseId || ''),
      instructorId: String(edition.instructorId || ''),
      editionType: (edition as any).editionType || 'public',
      dedicatedCompanyId: String((edition as any).dedicatedCompanyId || ''),
      startDate: edition.startDate || '',
      endDate: edition.endDate || '',
      location: edition.location || '',
      maxParticipants: String(edition.maxParticipants || 20),
      price: String((edition.price || 0) / 100),
      status: edition.status || 'scheduled',
      notes: edition.notes || '',
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
        courseId: parseInt(formData.courseId),
        instructorId: formData.instructorId ? parseInt(formData.instructorId) : undefined,
        editionType: formData.editionType,
        dedicatedCompanyId: formData.editionType === 'private' ? parseInt(formData.dedicatedCompanyId) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        maxParticipants: parseInt(formData.maxParticipants),
        price: Math.round(parseFloat(formData.price) * 100),
        status: formData.status,
        notes: formData.notes,
      };

      if (selectedEdition) {
        await editionsApi.update(selectedEdition.id, data);
        toast.success('Edizione aggiornata');
      } else {
        await editionsApi.create(data);
        toast.success('Edizione creata');
      }
      setIsModalOpen(false);
      fetchEditions(pagination.page);
    } catch (err: any) {
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
      toast.success('Edizione eliminata');
      setIsDeleteDialogOpen(false);
      fetchEditions(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Errore nell\'eliminazione');
    } finally {
      setIsSaving(false);
    }
  };

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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
        <span>{option?.icon}</span>
        {option?.label || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const option = typeOptions.find(o => o.value === type);
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
        <span>{option?.icon}</span>
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
        {/* Header con CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">📚 Edizioni Corsi</h1>
            <p className="text-gray-600 mt-1">Gestisci le edizioni, sessioni e registrazioni dei corsi</p>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <SparklesIcon className="w-4 h-4" />
            Nuova Edizione
          </Button>
        </div>

        {/* Errori */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchEditions()} className="underline text-sm">Riprova</button>
          </div>
        )}

        {/* Filtri e Ricerca */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Barra di ricerca */}
              <div className="relative">
                <Input
                  placeholder="🔍 Cerca per corso o location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={courseFilter || ''}
                  onChange={(e) => setCourseFilter(e.target.value ? Number(e.target.value) : undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">📖 Tutti i corsi</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">🎯 Tutti i tipi</option>
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">📊 Tutti gli stati</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => { 
                    setSearchTerm('');
                    setCourseFilter(undefined); 
                    setStatusFilter(''); 
                    setTypeFilter(''); 
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista Edizioni */}
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
                  <div key={edition.id} className="hover:bg-gray-50 transition-colors">
                    {/* Edition Card */}
                    <div className="p-4 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Informazioni Principali */}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {getCourseName(edition.courseId)}
                            </h3>
                            {getTypeBadge((edition as any).editionType || 'public')}
                            {getStatusBadge(edition.status)}
                          </div>

                          {/* Dettagli in Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <CalendarIcon className="w-4 h-4 text-blue-500" />
                              <span>{formatDate(edition.startDate)} → {formatDate(edition.endDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPinIcon className="w-4 h-4 text-red-500" />
                              <span>{edition.location || 'Non specificato'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <UserGroupIcon className="w-4 h-4 text-green-500" />
                              <span>{(edition as any).registrationsCount || 0}/{edition.maxParticipants} iscritti</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <UserIcon className="w-4 h-4 text-purple-500" />
                              <span>{getInstructorName(edition.instructorId)}</span>
                            </div>
                          </div>

                          {/* Prezzo e Azienda */}
                          <div className="flex flex-wrap items-center gap-4 text-sm pt-2">
                            <span className="font-semibold text-gray-900">💰 {formatPrice((edition as any).price)}</span>
                            {(edition as any).editionType === 'private' && (edition as any).dedicatedCompanyId && (
                              <span className="text-purple-600">🏢 Privata: {getCompanyName((edition as any).dedicatedCompanyId)}</span>
                            )}
                          </div>
                        </div>

                        {/* Azioni */}
                        <div className="flex flex-wrap lg:flex-col gap-2 lg:gap-1">
                          <button
                            onClick={() => navigate(`/editions/${edition.id}/register`)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                            title="Apri Registro Edizione"
                          >
                            <EyeIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Registro</span>
                          </button>
                          <button
                            onClick={() => openEditModal(edition)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                            title="Modifica"
                          >
                            <PencilIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Modifica</span>
                          </button>
                          <button
                            onClick={() => openDeleteDialog(edition)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                            title="Elimina"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Elimina</span>
                          </button>
                          <button
                            onClick={() => setExpandedEdition(expandedEdition === edition.id ? null : edition.id)}
                            className="flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Mostra/nascondi sessioni"
                          >
                            {expandedEdition === edition.id ? (
                              <ChevronUpIcon className="w-4 h-4" />
                            ) : (
                              <ChevronDownIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Sessioni Espandibili */}
                      {expandedEdition === edition.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-sm font-medium text-gray-900 mb-3">📆 Sessioni ({sessions.length})</div>
                          {sessions.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-3">Nessuna sessione programmata</p>
                          ) : (
                            <div className="space-y-2">
                              {sessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm">
                                  <div className="flex-1">
                                    <span className="font-medium">{formatDate(session.sessionDate)}</span>
                                    <span className="text-gray-600 ml-2">{session.startTime} - {session.endTime} ({session.hours}h)</span>
                                  </div>
                                  <button
                                    onClick={() => {/* delete session */}}
                                    className="text-red-600 hover:text-red-700 text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginazione */}
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => fetchEditions(page)}
          />
        )}
      </div>

      {/* Modal Creazione/Modifica */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEdition ? 'Modifica Edizione' : 'Nuova Edizione'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corso *</label>
              <select
                required
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona un corso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docente</label>
              <select
                value={formData.instructorId}
                onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Non assegnato</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio *</label>
              <Input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine *</label>
              <Input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Edizione *</label>
              <select
                required
                value={formData.editionType}
                onChange={(e) => setFormData({ ...formData, editionType: e.target.value as 'public' | 'private' | 'multi' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">🌍 Pubblica</option>
                <option value="private">🔒 Privata (Azienda Singola)</option>
                <option value="multi">🏢 Multi-azienda</option>
              </select>
            </div>
            {formData.editionType === 'private' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azienda *</label>
                <select
                  required
                  value={formData.dedicatedCompanyId}
                  onChange={(e) => setFormData({ ...formData, dedicatedCompanyId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona azienda</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.editionType === 'multi' && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Aziende Partecipanti *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {companies.map(company => (
                  <div key={company.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`company-${company.id}`}
                      checked={selectedCompanies.includes(company.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCompanies([...selectedCompanies, company.id]);
                        } else {
                          setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`company-${company.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{company.name}</span>
                    </label>
                    {selectedCompanies.includes(company.id) && (
                      <input
                        type="number"
                        placeholder="Prezzo €"
                        value={companyPrices[company.id] || ''}
                        onChange={(e) => setCompanyPrices({ ...companyPrices, [company.id]: e.target.value })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Es: Aula 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Partecipanti</label>
              <Input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                min="1"
              />
            </div>
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

      {/* Dialog Eliminazione */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Elimina Edizione"
        description={`Sei sicuro di voler eliminare l'edizione "${getCourseName(selectedEdition?.courseId)}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        cancelText="Annulla"
        isLoading={isSaving}
      />
    </Layout>
  );
}
