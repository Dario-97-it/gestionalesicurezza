import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Checkbox } from '../components/ui/Checkbox';
import { editionsApi, studentsApi, companiesApi, registrationsApi, agentsApi } from '../lib/api';
import type { CourseEdition, Student, Company } from '../types';
import toast from 'react-hot-toast';

interface Registration {
  id: number;
  studentId: number;
  student: Student;
  companyId: number | null;
  company?: Company;
  status: 'pending' | 'confirmed' | 'completed' | 'failed' | 'cancelled';
  priceApplied: number;
  certificateDate?: string;
  attendancePercent?: number;
}

interface EditionInfo extends CourseEdition {
  course?: { title: string; code: string; durationHours: number; certificateValidityMonths?: number };
  instructor?: { firstName: string; lastName: string };
  registrations?: Registration[];
}

export default function EditionRegister() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<EditionInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal per aggiungere studenti
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<number | ''>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<number | ''>('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  
  // Statistiche
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalPresent: 0,
    totalPassed: 0,
    totalFailed: 0,
    byCompany: {} as Record<number, { name: string; count: number; passed: number; failed: number }>
  });

  // Fetch edition data
  const fetchEditionData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch edition details
      const editionData = await editionsApi.getById(parseInt(id));
      setEdition(editionData);
      
      // Fetch registrations for this edition
      const token = localStorage.getItem('accessToken');
      const regResponse = await fetch(`/api/editions/${id}/registrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (regResponse.ok) {
        const regData = await regResponse.json();
        setRegistrations(regData.registrations || []);
        calculateStats(regData.registrations || []);
      }
      
      // Fetch companies, agents and students for the add modal
      const [companiesRes, studentsRes, agentsRes] = await Promise.all([
        companiesApi.getAll({ pageSize: 500 }),
        studentsApi.getAll(1, 500),
        agentsApi.getAll(1, 500)
      ]);
      // Filter companies based on edition type
      let filteredCompanies = companiesRes.data || [];
      if (editionData.editionType === 'private' && editionData.dedicatedCompanyId) {
        filteredCompanies = filteredCompanies.filter((c: any) => c.id === editionData.dedicatedCompanyId);
      }
      
      setCompanies(filteredCompanies);
      setStudents(studentsRes.data || []);
      setAgents(agentsRes.data || []);
      
    } catch (err: any) {
      console.error('Error fetching edition data:', err);
      setError('Errore nel caricamento dei dati dell\'edizione');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEditionData();
  }, [fetchEditionData]);

  // Filter students by company or agent
  useEffect(() => {
    let filtered = students;
    
    if (selectedCompanyFilter !== '') {
      filtered = filtered.filter(s => s.companyId === selectedCompanyFilter);
    }
    
    if (selectedAgentFilter !== '') {
      filtered = filtered.filter(s => s.agentId === selectedAgentFilter);
    }
    
    setFilteredStudents(filtered);
  }, [selectedCompanyFilter, selectedAgentFilter, students]);

  const calculateStats = (regs: Registration[]) => {
    const byCompany: Record<number, { name: string; count: number; passed: number; failed: number }> = {};
    
    regs.forEach(reg => {
      const companyId = reg.companyId || 0;
      if (!byCompany[companyId]) {
        byCompany[companyId] = {
          name: reg.company?.name || 'Privato',
          count: 0,
          passed: 0,
          failed: 0
        };
      }
      byCompany[companyId].count++;
      if (reg.status === 'completed') byCompany[companyId].passed++;
      if (reg.status === 'failed') byCompany[companyId].failed++;
    });

    setStats({
      totalRegistered: regs.length,
      totalPresent: regs.filter(r => r.status !== 'cancelled').length,
      totalPassed: regs.filter(r => r.status === 'completed').length,
      totalFailed: regs.filter(r => r.status === 'failed').length,
      byCompany
    });
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Seleziona almeno uno studente');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      // Bulk create registrations
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseEditionId: parseInt(id!),
          studentIds: selectedStudents,
          priceApplied: edition?.price || 0
        })
      });

      if (!response.ok) {
        throw new Error('Errore nell\'iscrizione');
      }

      const result = await response.json();
      toast.success(`${result.created} studenti iscritti con successo`);
      setIsAddModalOpen(false);
      setSelectedStudents([]);
      fetchEditionData();
    } catch (err) {
      toast.error('Errore nell\'iscrizione degli studenti');
    }
  };

  const handleUpdateStatus = async (registrationId: number, newStatus: string, certificateDate?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          certificateDate: certificateDate || null,
          // Se bocciato, suggerisci la prossima edizione
          recommendedNextEditionId: newStatus === 'failed' ? null : undefined // TODO: trovare prossima edizione
        })
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento');
      }

      toast.success('Stato aggiornato');
      fetchEditionData();
    } catch (err) {
      toast.error('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleBulkPass = async () => {
    const pendingRegs = registrations.filter(r => r.status === 'confirmed' || r.status === 'pending');
    if (pendingRegs.length === 0) {
      toast.error('Nessuno studente da promuovere');
      return;
    }

    const certificateDate = new Date().toISOString().split('T')[0];
    
    try {
      await Promise.all(pendingRegs.map(reg => 
        handleUpdateStatus(reg.id, 'completed', certificateDate)
      ));
      toast.success(`${pendingRegs.length} studenti promossi`);
    } catch (err) {
      toast.error('Errore nella promozione massiva');
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllFiltered = () => {
    const alreadyRegistered = registrations.map(r => r.studentId);
    const available = filteredStudents.filter(s => !alreadyRegistered.includes(s.id));
    setSelectedStudents(available.map(s => s.id));
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'In Attesa',
      'confirmed': 'Confermato',
      'completed': 'Promosso ✓',
      'failed': 'Bocciato ✗',
      'cancelled': 'Annullato',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !edition) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Edizione non trovata'}
          </h2>
          <Button onClick={() => navigate('/editions')}>
            ← Torna alle edizioni
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/editions')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            >
              ← Torna alle edizioni
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              📋 Registro Edizione
            </h1>
            <p className="text-gray-600 mt-1">
              {(edition as any).courseTitle} ({(edition as any).courseCode}) - {formatDate(edition.startDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
              + Aggiungi Studenti
            </Button>
            <Button onClick={handleBulkPass}>
              ✓ Promuovi Tutti
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalRegistered}</div>
              <div className="text-sm text-gray-500">Iscritti</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.totalPresent}</div>
              <div className="text-sm text-gray-500">Presenti</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.totalPassed}</div>
              <div className="text-sm text-gray-500">Promossi</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.totalFailed}</div>
              <div className="text-sm text-gray-500">Bocciati</div>
            </CardContent>
          </Card>
        </div>

        {/* Riepilogo per Azienda */}
        {Object.keys(stats.byCompany).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo per Azienda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Iscritti</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Promossi</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bocciati</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(stats.byCompany).map(([companyId, data]) => (
                      <tr key={companyId}>
                        <td className="px-4 py-3 font-medium text-gray-900">{data.name}</td>
                        <td className="px-4 py-3 text-center">{data.count}</td>
                        <td className="px-4 py-3 text-center text-green-600">{data.passed}</td>
                        <td className="px-4 py-3 text-center text-red-600">{data.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registro Studenti (Excel-like) */}
        <Card>
          <CardHeader>
            <CardTitle>Registro Presenze e Esiti</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice Fiscale</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stato</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Data Attestato</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Nessuno studente iscritto. Clicca "Aggiungi Studenti" per iniziare.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((reg, index) => (
                      <tr key={reg.id} className={reg.status === 'failed' ? 'bg-red-50' : reg.status === 'completed' ? 'bg-green-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {reg.company?.name || 'Privato'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {reg.student?.firstName} {reg.student?.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {reg.student?.fiscalCode || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(reg.status)}`}>
                            {getStatusLabel(reg.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {reg.status === 'completed' ? (
                            <input
                              type="date"
                              value={reg.certificateDate || ''}
                              onChange={(e) => handleUpdateStatus(reg.id, 'completed', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {reg.status !== 'completed' && reg.status !== 'cancelled' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'completed', new Date().toISOString().split('T')[0])}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Promuovi"
                              >
                                ✓
                              </button>
                            )}
                            {reg.status !== 'failed' && reg.status !== 'cancelled' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'failed')}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Boccia"
                              >
                                ✗
                              </button>
                            )}
                            {reg.status === 'failed' && (
                              <span className="text-xs text-orange-600" title="Consigliato per prossima edizione">
                                ⚠️ Da recuperare
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Aggiungi Studenti */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Aggiungi Studenti all'Edizione"
        size="lg"
      >
        <div className="space-y-4">
          {/* Filtro per Azienda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtra per Azienda</label>
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutte le aziende</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtra per Agente</label>
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti gli agenti</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={selectAllFiltered}>
              Seleziona Tutti ({filteredStudents.filter(s => !registrations.map(r => r.studentId).includes(s.id)).length})
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedStudents([])}>
              Deseleziona Tutti
            </Button>
          </div>

          {/* Lista Studenti */}
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {filteredStudents.length === 0 ? (
              <p className="p-4 text-center text-gray-500">Nessuno studente trovato</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Sel.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Azienda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map(student => {
                    const isAlreadyRegistered = registrations.some(r => r.studentId === student.id);
                    return (
                      <tr 
                        key={student.id} 
                        className={isAlreadyRegistered ? 'bg-gray-100 opacity-50' : 'hover:bg-blue-50 cursor-pointer'}
                        onClick={() => !isAlreadyRegistered && toggleStudentSelection(student.id)}
                      >
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            disabled={isAlreadyRegistered}
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {student.firstName} {student.lastName}
                          {isAlreadyRegistered && <span className="ml-2 text-xs text-gray-500">(già iscritto)</span>}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {companies.find(c => c.id === student.companyId)?.name || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-600">
              {selectedStudents.length} studenti selezionati
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleAddStudents} disabled={selectedStudents.length === 0}>
                Iscrivi Selezionati
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
