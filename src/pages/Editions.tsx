import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState, Pagination } from '../components/ui/Table';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { editionsApi, coursesApi, instructorsApi, companiesApi, agentsApi } from '../lib/api';
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
  MagnifyingGlassIcon,
  CheckIcon,
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
  const [sortBy, setSortBy] = useState<string>('startDate-desc');
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
    editionType: 'private' as 'private' | 'multi',
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
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [agentPrices, setAgentPrices] = useState<Record<number, string>>({});
  const [showAgentSelection, setShowAgentSelection] = useState(false);
  const [typeChangeError, setTypeChangeError] = useState<string | null>(null);
  
  // Nuovi stati per ricerca e filtri
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [agentSearchTerm, setAgentSearchTerm] = useState('');

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

  // Filtra aziende in base alla ricerca
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // Filtra agenti in base alla ricerca
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(agentSearchTerm.toLowerCase())
  );

  // Seleziona/deseleziona tutte le aziende filtrate
  const toggleAllCompanies = () => {
    const filteredIds = filteredCompanies.map(c => c.id);
    if (selectedCompanies.length === filteredCompanies.length && filteredCompanies.every(c => selectedCompanies.includes(c.id))) {
      // Deseleziona tutte
      setSelectedCompanies(selectedCompanies.filter(id => !filteredIds.includes(id)));
    } else {
      // Seleziona tutte
      const newSelected = new Set(selectedCompanies);
      filteredIds.forEach(id => newSelected.add(id));
      setSelectedCompanies(Array.from(newSelected));
    }
  };

  // Seleziona/deseleziona tutti gli agenti filtrati
  const toggleAllAgents = () => {
    const filteredIds = filteredAgents.map(a => a.id);
    if (selectedAgents.length === filteredAgents.length && filteredAgents.every(a => selectedAgents.includes(a.id))) {
      // Deseleziona tutte
      setSelectedAgents(selectedAgents.filter(id => !filteredIds.includes(id)));
    } else {
      // Seleziona tutte
      const newSelected = new Set(selectedAgents);
      filteredIds.forEach(id => newSelected.add(id));
      setSelectedAgents(Array.from(newSelected));
    }
  };

  const allCompaniesSelected = filteredCompanies.length > 0 && 
    filteredCompanies.every(c => selectedCompanies.includes(c.id));

  const allAgentsSelected = filteredAgents.length > 0 && 
    filteredAgents.every(a => selectedAgents.includes(a.id));

  useEffect(() => {
    fetchEditions();
    fetchCourses();
    fetchInstructors();
    fetchCompanies();
    fetchAgents();
  }, []);

  const fetchEditions = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await editionsApi.list({
        page,
        pageSize: pagination.pageSize,
        courseId: courseFilter,
        status: statusFilter,
        startDateFrom: undefined,
        startDateTo: undefined,
        sortBy,
      });
      setEditions(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
      setError(null);
    } catch (err: any) {
      setError('Errore nel caricamento delle edizioni');
      console.error('Fetch editions error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await coursesApi.list();
      setCourses(response.data || []);
    } catch (err) {
      console.error('Fetch courses error:', err);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await instructorsApi.list();
      setInstructors(response.data || []);
    } catch (err) {
      console.error('Fetch instructors error:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.list();
      setCompanies(response.data || []);
    } catch (err) {
      console.error('Fetch companies error:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await agentsApi.list();
      setAgents(response.data || []);
    } catch (err) {
      console.error('Fetch agents error:', err);
    }
  };

  const openCreateModal = () => {
    setSelectedEdition(null);
    setFormData({
      courseId: '',
      instructorId: '',
      editionType: 'private',
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
    setCompanySearchTerm('');
    setAgentSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (edition: CourseEdition) => {
    setSelectedEdition(edition);
    setFormData({
      courseId: String(edition.courseId || ''),
      instructorId: String(edition.instructorId || ''),
      editionType: (edition as any).editionType || 'private',
      dedicatedCompanyId: String((edition as any).dedicatedCompanyId || ''),
      startDate: edition.startDate || '',
      endDate: edition.endDate || '',
      location: edition.location || '',
      maxParticipants: String(edition.maxParticipants || 20),
      price: String((edition.price || 0) / 100),
      status: edition.status || 'scheduled',
      notes: edition.notes || '',
    });
    setTypeChangeError(null);
    setCompanySearchTerm('');
    setAgentSearchTerm('');
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
      // Validazioni client-side
      if (!formData.courseId) {
        toast.error('Seleziona un corso');
        setIsSaving(false);
        return;
      }
      if (!formData.startDate || !formData.endDate) {
        toast.error('Le date di inizio e fine sono obbligatorie');
        setIsSaving(false);
        return;
      }
      if (formData.startDate >= formData.endDate) {
        toast.error('La data di inizio deve essere prima della data di fine');
        setIsSaving(false);
        return;
      }
      if (!formData.maxParticipants || parseInt(formData.maxParticipants) <= 0) {
        toast.error('Il numero massimo di partecipanti deve essere > 0');
        setIsSaving(false);
        return;
      }
      if (formData.editionType === 'private' && !formData.dedicatedCompanyId) {
        toast.error('Un edizione privata deve avere un azienda dedicata');
        setIsSaving(false);
        return;
      }
      
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
        selectedCompanies: selectedCompanies,
        companyPrices: companyPrices,
        selectedAgents: selectedAgents,
        agentPrices: agentPrices,
      };

      if (selectedEdition) {
        console.log('Updating edition with data:', data);
        await editionsApi.update(selectedEdition.id, data);
        toast.success('Edizione aggiornata');
      } else {
        console.log('Creating edition with data:', data);
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={courseFilter || ''}
                  onChange={(e) => setCourseFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti i corsi</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti gli stati</option>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="startDate-desc">Data inizio (più recente)</option>
                  <option value="startDate-asc">Data inizio (più vecchia)</option>
                  <option value="createdAt-desc">Creazione (più recente)</option>
                  <option value="createdAt-asc">Creazione (più vecchia)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabella Edizioni */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Caricamento...</div>
            ) : editions.length === 0 ? (
              <EmptyState
                icon="📚"
                title="Nessuna edizione trovata"
                description="Crea la tua prima edizione per iniziare"
                action={<Button onClick={openCreateModal}>Nuova Edizione</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corso</TableHead>
                      <TableHead>Data Inizio</TableHead>
                      <TableHead>Docente</TableHead>
                      <TableHead>Partecipanti</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editions.map((edition) => (
                      <TableRow key={edition.id}>
                        <TableCell className="font-medium">{getCourseName(edition.courseId)}</TableCell>
                        <TableCell>{formatDate(edition.startDate)}</TableCell>
                        <TableCell>{getInstructorName(edition.instructorId)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            <UserGroupIcon className="w-3 h-3" />
                            {(edition as any).registrationsCount || 0} / {edition.maxParticipants}
                          </span>
                        </TableCell>
                        <TableCell>{formatPrice(edition.price)}</TableCell>
                        <TableCell>{getStatusBadge(edition.status)}</TableCell>
                        <TableCell>{getTypeBadge((edition as any).editionType || 'private')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/editions/${edition.id}/register`)}
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title="Gestisci registrazioni"
                            >
                              <UserIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(edition)}
                              className="text-gray-600 hover:text-gray-700 p-1"
                              title="Modifica"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(edition)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Elimina"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
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
                onChange={(e) => {
                  const newType = e.target.value as 'private' | 'multi';
                  const currentType = selectedEdition ? ((selectedEdition as any).editionType || 'private') : 'private';
                  const registrationsCount = (selectedEdition as any)?.registrationsCount || 0;
                  
                  // Verifica se si sta cercando di cambiare da Multi-azienda a Privata con registrazioni
                  if (currentType === 'multi' && newType === 'private' && registrationsCount > 0) {
                    setTypeChangeError(
                      `Non puoi cambiare il tipo da "Multi-azienda" a "Privata" perché questa edizione ha ${registrationsCount} iscritti. ` +
                      `Puoi solo passare da "Privata" a "Multi-azienda" o modificare un'edizione "Multi-azienda" senza iscritti.`
                    );
                    return;
                  }
                  
                  setTypeChangeError(null);
                  setFormData({ ...formData, editionType: newType });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">🔒 Privata (Azienda Singola)</option>
                <option value="multi">🏢 Multi-azienda</option>
              </select>
              {typeChangeError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">⚠️ Operazione non consentita:</span> {typeChangeError}
                  </p>
                </div>
              )}
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">🏢 Aziende Partecipanti *</label>
                
                {/* Barra di ricerca */}
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cerca azienda..."
                    value={companySearchTerm}
                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Pulsante Seleziona Tutti */}
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAllCompanies}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      allCompaniesSelected
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CheckIcon className="w-4 h-4" />
                    {allCompaniesSelected ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedCompanies.length} di {companies.length} selezionate
                  </span>
                </div>

                {/* Lista aziende con checkbox */}
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {filteredCompanies.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessuna azienda trovata</p>
                  ) : (
                    filteredCompanies.map(company => (
                      <div key={company.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
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
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`company-${company.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium text-gray-900">{company.name}</span>
                          {company.vatNumber && (
                            <span className="text-xs text-gray-500 ml-2">P.IVA: {company.vatNumber}</span>
                          )}
                        </label>
                        {selectedCompanies.includes(company.id) && (
                          <input
                            type="number"
                            placeholder="Prezzo €"
                            value={companyPrices[company.id] || ''}
                            onChange={(e) => setCompanyPrices({ ...companyPrices, [company.id]: e.target.value })}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {formData.editionType === 'multi' && agents.length > 0 && (
            <div className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">👤 Agenti Partecipanti</label>
                
                {/* Barra di ricerca */}
                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cerca agente..."
                    value={agentSearchTerm}
                    onChange={(e) => setAgentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Pulsante Seleziona Tutti */}
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAllAgents}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      allAgentsSelected
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CheckIcon className="w-4 h-4" />
                    {allAgentsSelected ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedAgents.length} di {agents.length} selezionati
                  </span>
                </div>

                {/* Lista agenti con checkbox */}
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {filteredAgents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessun agente trovato</p>
                  ) : (
                    filteredAgents.map(agent => (
                      <div key={agent.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          id={`agent-${agent.id}`}
                          checked={selectedAgents.includes(agent.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAgents([...selectedAgents, agent.id]);
                            } else {
                              setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor={`agent-${agent.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium text-gray-900">{agent.name}</span>
                          {agent.email && (
                            <span className="text-xs text-gray-500 ml-2">{agent.email}</span>
                          )}
                        </label>
                        {selectedAgents.includes(agent.id) && (
                          <input
                            type="number"
                            placeholder="Prezzo €"
                            value={agentPrices[agent.id] || ''}
                            onChange={(e) => setAgentPrices({ ...agentPrices, [agent.id]: e.target.value })}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo Base (€)</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
