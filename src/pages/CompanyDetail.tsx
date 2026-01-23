import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { companiesApi, studentsApi } from '../lib/api';
import { validaPIVA } from '../lib/partitaIva';
import type { Company, Student } from '../types';

interface CompanyStats {
  totalStudents: number;
  totalCourses: number;
  completedCourses: number;
  activeCertificates: number;
  expiringCertificates: number;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<CompanyStats>({
    totalStudents: 0,
    totalCourses: 0,
    completedCourses: 0,
    activeCertificates: 0,
    expiringCertificates: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // P.IVA validation
  const [pivaValidation, setPivaValidation] = useState<{
    isValid: boolean;
    isChecksumValid: boolean;
  } | null>(null);

  const fetchCompanyData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch company details
      const companyData = await companiesApi.getById(parseInt(id));
      setCompany(companyData);

      // Validate P.IVA if present
      if (companyData.vatNumber) {
        const validation = validaPIVA(companyData.vatNumber);
        setPivaValidation({
          isValid: validation.isValid,
          isChecksumValid: validation.isChecksumValid
        });
      }

      // Fetch students of this company
      const studentsResponse = await studentsApi.getAll(1, 100, '', parseInt(id));
      setStudents(studentsResponse.data || []);

      // Fetch company stats
      try {
        const response = await fetch(`/api/companies/${id}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const statsData = await response.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Error fetching company stats:', err);
        // Set basic stats from students count
        setStats(prev => ({
          ...prev,
          totalStudents: studentsResponse.data?.length || 0
        }));
      }

    } catch (err: any) {
      console.error('Error fetching company:', err);
      setError('Errore nel caricamento dei dati dell\'azienda');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const viewStudentDetail = (student: Student) => {
    navigate(`/students/${student.id}`);
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

  if (error || !company) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Azienda non trovata'}
          </h2>
          <Button onClick={() => navigate('/companies')}>
            ← Torna alla lista
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
              onClick={() => navigate('/companies')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            >
              ← Torna alla lista aziende
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              {company.name}
            </h1>
            <p className="text-gray-600 mt-1">Scheda azienda completa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/companies/${id}/edit`)}>
              ✏️ Modifica
            </Button>
            <Button onClick={() => navigate(`/students?company=${id}`)}>
              + Aggiungi Studente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
              <div className="text-sm text-gray-500">Dipendenti</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalCourses}</div>
              <div className="text-sm text-gray-500">Corsi Totali</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedCourses}</div>
              <div className="text-sm text-gray-500">Completati</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">{stats.activeCertificates}</div>
              <div className="text-sm text-gray-500">Attestati Attivi</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.expiringCertificates}</div>
              <div className="text-sm text-gray-500">In Scadenza</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle>Dati Azienda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Ragione Sociale</label>
                  <p className="text-gray-900 font-medium">{company.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Partita IVA</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-mono">{company.vatNumber || '-'}</p>
                    {pivaValidation && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        pivaValidation.isChecksumValid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {pivaValidation.isChecksumValid ? '✓ Valida' : '⚠️ Checksum'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">
                    {company.email ? (
                      <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                        {company.email}
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefono</label>
                  <p className="text-gray-900">
                    {company.phone ? (
                      <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">
                        {company.phone}
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Indirizzo</label>
                  <p className="text-gray-900">{company.address || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Persona di Contatto</label>
                  <p className="text-gray-900">{company.contactPerson || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dipendenti ({students.length})</CardTitle>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => navigate(`/students?company=${id}`)}
              >
                Vedi tutti →
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <EmptyState
                  title="Nessun dipendente"
                  description="Non ci sono ancora dipendenti associati a questa azienda"
                  action={
                    <Button onClick={() => navigate('/students')}>
                      + Aggiungi Studente
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cognome</TableHead>
                      <TableHead>Codice Fiscale</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.slice(0, 10).map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.firstName}</TableCell>
                        <TableCell>{student.lastName}</TableCell>
                        <TableCell className="font-mono text-sm">{student.fiscalCode || '-'}</TableCell>
                        <TableCell>{student.email || '-'}</TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => viewStudentDetail(student)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Visualizza dettaglio"
                          >
                            👁️
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {students.length > 10 && (
                <div className="p-4 text-center border-t">
                  <button
                    onClick={() => navigate(`/students?company=${id}`)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Mostra tutti i {students.length} dipendenti →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate(`/registrations?company=${id}`)}>
                📋 Iscrizioni Azienda
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/reports?company=${id}`)}>
                📊 Report Formazione
              </Button>
              <Button variant="secondary" onClick={() => {
                // Export students to CSV
                const headers = ['Nome', 'Cognome', 'Codice Fiscale', 'Email', 'Telefono'];
                const rows = students.map(s => [
                  s.firstName || '',
                  s.lastName || '',
                  s.fiscalCode || '',
                  s.email || '',
                  s.phone || ''
                ]);
                const csvContent = [
                  headers.join(','),
                  ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `dipendenti_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}>
                📥 Esporta Dipendenti
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
