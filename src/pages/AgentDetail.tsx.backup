import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CurrencyEuroIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Agent, Student, CourseEdition } from '../types';

interface AgentStats {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  totalHours: number;
  studentsByStatus: Record<string, number>;
}

interface AgentCourse {
  id: number;
  courseTitle: string;
  editionId: number;
  startDate: string;
  endDate: string;
  studentsCount: number;
  revenue: number;
  status: string;
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [courses, setCourses] = useState<AgentCourse[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [studentFormData, setStudentFormData] = useState({
    firstName: '',
    lastName: '',
    fiscalCode: '',
    email: '',
    phone: '',
    birthDate: '',
    birthPlace: '',
    jobTitle: '',
    jobRole: 'altro',
  });

  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    vatNumber: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    cap: '',
    contactPerson: '',
    atecoCode: '',
    riskCategory: 'low',
  });

  const fetchAgentData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      
      // Fetch agent details
      const agentResponse = await fetch(`/api/agents/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!agentResponse.ok) throw new Error('Errore nel caricamento agente');
      const agentData = await agentResponse.json();
      setAgent(agentData.data);
      
      // Fetch agent's students
      const studentsResponse = await fetch(`/api/agents/${id}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.students || []);
      }
      
      // Fetch agent's companies
      const companiesResponse = await fetch(`/api/agents/${id}/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData.companies || []);
      }
      
      // Fetch agent's courses
      const coursesResponse = await fetch(`/api/agents/${id}/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.courses || []);
      }
      
      // Calculate stats
      calculateStats(studentsData?.students || [], coursesData?.courses || []);
      
    } catch (err: any) {
      console.error('Error fetching agent data:', err);
      setError('Errore nel caricamento dei dati dell\'agente');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const calculateStats = (studentsList: Student[], coursesList: AgentCourse[]) => {
    const totalRevenue = coursesList.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalHours = coursesList.reduce((sum, c) => sum + 8, 0); // Placeholder
    
    setStats({
      totalStudents: studentsList.length,
      totalCourses: coursesList.length,
      totalRevenue,
      totalHours,
      studentsByStatus: {}
    });
  };

  useEffect(() => {
    fetchAgentData();
  }, [fetchAgentData]);

  const handleEditAgent = () => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        notes: agent.notes || ''
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const updatedAgent = await response.json();
        setAgent(updatedAgent.data);
        setIsEditModalOpen(false);
        toast.success('Agente aggiornato con successo');
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (err) {
      toast.error('Errore nel salvataggio dell\'agente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentFormData.fiscalCode) {
      toast.error('Codice Fiscale è obbligatorio');
      return;
    }

    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...studentFormData,
          agentId: parseInt(id || '0')
        })
      });
      
      if (response.ok) {
        await fetchAgentData();
        setIsAddStudentModalOpen(false);
        setStudentFormData({
          firstName: '',
          lastName: '',
          fiscalCode: '',
          email: '',
          phone: '',
          birthDate: '',
          birthPlace: '',
          jobTitle: '',
          jobRole: 'altro',
        });
        toast.success('Studente aggiunto con successo');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell\'aggiunta');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore nell\'aggiunta dello studente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyFormData.vatNumber) {
      toast.error('P.IVA è obbligatoria');
      return;
    }

    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...companyFormData,
          agentId: parseInt(id || '0')
        })
      });
      
      if (response.ok) {
        setIsAddCompanyModalOpen(false);
        setCompanyFormData({
          name: '',
          vatNumber: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          cap: '',
          contactPerson: '',
          atecoCode: '',
          riskCategory: 'low',
        });
        toast.success('Azienda aggiunta con successo');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell\'aggiunta');
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore nell\'aggiunta dell\'azienda');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questo studente?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await fetchAgentData();
        toast.success('Studente rimosso con successo');
      } else {
        throw new Error('Errore nella rimozione');
      }
    } catch (err) {
      toast.error('Errore nella rimozione dello studente');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Agente non trovato</p>
          <Button onClick={() => navigate('/agents')} className="mt-4">
            Torna agli Agenti
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/agents')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600">Gestione Agente Commerciale</p>
          </div>
          <Button onClick={handleEditAgent} className="flex items-center gap-2">
            <PencilIcon className="w-4 h-4" />
            Modifica
          </Button>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Studenti Totali</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
                  </div>
                  <UserGroupIcon className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Corsi Gestiti</p>
                    <p className="text-3xl font-bold text-green-600">{stats.totalCourses}</p>
                  </div>
                  <AcademicCapIcon className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Fatturato Totale</p>
                    <p className="text-3xl font-bold text-purple-600">€ {(stats.totalRevenue / 100).toLocaleString('it-IT')}</p>
                  </div>
                  <CurrencyEuroIcon className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ore Totali</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.totalHours}h</p>
                  </div>
                  <CalendarDaysIcon className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Agente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="text-gray-900">{agent.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 flex items-center gap-2">
                  {agent.email ? (
                    <>
                      <EnvelopeIcon className="w-4 h-4" />
                      {agent.email}
                    </>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Telefono</label>
                <p className="text-gray-900 flex items-center gap-2">
                  {agent.phone ? (
                    <>
                      <PhoneIcon className="w-4 h-4" />
                      {agent.phone}
                    </>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data Creazione</label>
                <p className="text-gray-900">{new Date(agent.createdAt).toLocaleDateString('it-IT')}</p>
              </div>
            </div>
            {agent.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Note</label>
                <p className="text-gray-900">{agent.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Studenti Portati */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Studenti Portati ({students.length})</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddStudentModalOpen(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <PlusIcon className="w-4 h-4" />
                Aggiungi Studente
              </Button>
              <Button onClick={() => setIsAddCompanyModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="w-4 h-4" />
                Aggiungi Azienda
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <EmptyState
                title="Nessuno studente"
                description="Aggiungi i primi studenti portati da questo agente"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Codice Fiscale</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell>{student.fiscalCode || '-'}</TableCell>
                      <TableCell>{student.email || '-'}</TableCell>
                      <TableCell>{student.phone || '-'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Corsi Gestiti */}
        <Card>
          <CardHeader>
            <CardTitle>Corsi Gestiti ({courses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <EmptyState
                title="Nessun corso"
                description="I corsi appariranno qui quando gli studenti dell'agente verranno iscritti"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Data Inizio</TableHead>
                    <TableHead>Data Fine</TableHead>
                    <TableHead>Studenti</TableHead>
                    <TableHead>Fatturato</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.courseTitle}</TableCell>
                      <TableCell>{new Date(course.startDate).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{new Date(course.endDate).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{course.studentsCount}</TableCell>
                      <TableCell>€ {(course.revenue / 100).toLocaleString('it-IT')}</TableCell>
                      <TableCell>
                        <Badge variant={course.status === 'completed' ? 'success' : 'info'}>
                          {course.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Aziende Portate */}
        <Card>
          <CardHeader>
            <CardTitle>Aziende Portate ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <EmptyState
                title="Nessuna azienda"
                description="Le aziende appariranno qui quando ne aggiungerai dalla pagina agente"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>P.IVA</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Categoria Rischio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.vatNumber || '-'}</TableCell>
                      <TableCell>{company.email || '-'}</TableCell>
                      <TableCell>{company.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={company.riskCategory === 'high' ? 'destructive' : company.riskCategory === 'medium' ? 'warning' : 'success'}>
                          {company.riskCategory}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Modifica Agente */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Agente"
        size="md"
      >
        <form onSubmit={handleSaveAgent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Salva
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Aggiungi Studente */}
      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title="Aggiungi Studente"
        size="lg"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <Input
                required
                value={studentFormData.firstName}
                onChange={(e) => setStudentFormData({ ...studentFormData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
              <Input
                required
                value={studentFormData.lastName}
                onChange={(e) => setStudentFormData({ ...studentFormData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale *</label>
            <Input
              required
              value={studentFormData.fiscalCode}
              onChange={(e) => setStudentFormData({ ...studentFormData, fiscalCode: e.target.value.toUpperCase() })}
              placeholder="XXXXXX00X00X000X"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={studentFormData.email}
                onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <Input
                value={studentFormData.phone}
                onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
              <Input
                type="date"
                value={studentFormData.birthDate}
                onChange={(e) => setStudentFormData({ ...studentFormData, birthDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo di Nascita</label>
              <Input
                value={studentFormData.birthPlace}
                onChange={(e) => setStudentFormData({ ...studentFormData, birthPlace: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mansione</label>
              <Input
                value={studentFormData.jobTitle}
                onChange={(e) => setStudentFormData({ ...studentFormData, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
              <select
                value={studentFormData.jobRole}
                onChange={(e) => setStudentFormData({ ...studentFormData, jobRole: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="operaio">Operaio</option>
                <option value="impiegato">Impiegato</option>
                <option value="dirigente">Dirigente</option>
                <option value="preposto">Preposto</option>
                <option value="altro">Altro</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddStudentModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Aggiungi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Aggiungi Azienda */}
      <Modal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        title="Aggiungi Azienda"
        size="lg"
      >
        <form onSubmit={handleAddCompany} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Azienda *</label>
            <Input
              required
              value={companyFormData.name}
              onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA *</label>
            <Input
              required
              value={companyFormData.vatNumber}
              onChange={(e) => setCompanyFormData({ ...companyFormData, vatNumber: e.target.value })}
              placeholder="00000000000"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={companyFormData.email}
                onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <Input
                value={companyFormData.phone}
                onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
            <Input
              value={companyFormData.address}
              onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
              <Input
                value={companyFormData.city}
                onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
              <Input
                value={companyFormData.cap}
                onChange={(e) => setCompanyFormData({ ...companyFormData, cap: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice ATECO</label>
              <Input
                value={companyFormData.atecoCode}
                onChange={(e) => setCompanyFormData({ ...companyFormData, atecoCode: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona di Contatto</label>
              <Input
                value={companyFormData.contactPerson}
                onChange={(e) => setCompanyFormData({ ...companyFormData, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria Rischio</label>
              <select
                value={companyFormData.riskCategory}
                onChange={(e) => setCompanyFormData({ ...companyFormData, riskCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Basso</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddCompanyModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Aggiungi
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
