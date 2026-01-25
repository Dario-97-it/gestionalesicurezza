import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { studentsApi, companiesApi } from '../lib/api';
import { validaCF, reverseCF, formattaDataNascita } from '../lib/codiceFiscale';
import type { Student, Company } from '../types';

interface CourseHistory {
  id: number;
  courseName: string;
  courseCode: string;
  editionDate: string;
  location: string;
  status: string;
  attendancePercentage: number;
  certificateIssued: boolean;
  certificateExpiry?: string;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [courseHistory, setCourseHistory] = useState<CourseHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CF reverse engineering data
  const [cfData, setCfData] = useState<{
    dataNascita: string | null;
    luogoNascita: string | null;
    sesso: 'M' | 'F' | null;
    isValid: boolean;
    isChecksumValid: boolean;
  } | null>(null);

  const fetchStudentData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch student details
      const studentData = await studentsApi.getById(parseInt(id));
      setStudent(studentData);

      // Reverse engineer CF if present
      if (studentData.fiscalCode) {
        const validation = validaCF(studentData.fiscalCode);
        const reversed = reverseCF(studentData.fiscalCode);
        setCfData({
          dataNascita: reversed.dataNascita,
          luogoNascita: reversed.luogoNascita ? 
            (reversed.provinciaNascita ? `${reversed.luogoNascita} (${reversed.provinciaNascita})` : reversed.luogoNascita) 
            : null,
          sesso: reversed.sesso,
          isValid: validation.isValid,
          isChecksumValid: validation.isChecksumValid
        });
      }

      // Fetch company if assigned
      if (studentData.companyId) {
        try {
          const companyData = await companiesApi.getById(studentData.companyId);
          setCompany(companyData);
        } catch (err) {
          console.error('Error fetching company:', err);
        }
      }

      // Fetch course history
      try {
        const response = await fetch(`/api/students/${id}/courses`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCourseHistory(data.courses || []);
        }
      } catch (err) {
        console.error('Error fetching course history:', err);
      }

    } catch (err: any) {
      console.error('Error fetching student:', err);
      setError('Errore nel caricamento dei dati dello studente');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  };

	  const getStatusBadge = (status: string) => {
	    const statusColors: Record<string, string> = {
	      'completed': 'bg-green-100 text-green-800',
	      'confirmed': 'bg-blue-100 text-blue-800',
	      'pending': 'bg-yellow-100 text-yellow-800',
	      'cancelled': 'bg-red-100 text-red-800',
	      'failed': 'bg-red-100 text-red-800',
	    };
	    return statusColors[status] || 'bg-gray-100 text-gray-800';
	  };
	
	  const getStatusLabel = (status: string) => {
	    const labels: Record<string, string> = {
	      'completed': 'Completato',
	      'confirmed': 'Confermato',
	      'pending': 'In Attesa',
	      'cancelled': 'Annullato',
	      'failed': 'Bocciato',
	    };
	    return labels[status] || status;
	  };

  // Calculate statistics
  const stats = {
    totalCourses: courseHistory.length,
    completedCourses: courseHistory.filter(c => c.status === 'completato').length,
    certificatesIssued: courseHistory.filter(c => c.certificateIssued).length,
    expiringCertificates: courseHistory.filter(c => {
      if (!c.certificateExpiry) return false;
      const expiry = new Date(c.certificateExpiry);
      const now = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return expiry > now && expiry <= threeMonths;
    }).length,
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

  if (error || !student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Studente non trovato'}
          </h2>
          <Button onClick={() => navigate('/students')}>
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
              onClick={() => navigate('/students')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            >
              ← Torna alla lista studenti
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-600 mt-1">Scheda anagrafica completa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/students/${id}/edit`)}>
              ✏️ Modifica
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCourses}</div>
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
              <div className="text-2xl font-bold text-purple-600">{stats.certificatesIssued}</div>
              <div className="text-sm text-gray-500">Attestati</div>
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
          {/* Anagrafica */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dati Anagrafici</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-gray-900">{student.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cognome</label>
                  <p className="text-gray-900">{student.lastName}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Codice Fiscale</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-mono">{student.fiscalCode || '-'}</p>
                    {cfData && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        cfData.isChecksumValid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {cfData.isChecksumValid ? '✓ Valido' : '⚠️ Checksum'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data di Nascita</label>
                  <p className="text-gray-900">
                    {student.birthDate ? formatDate(student.birthDate) : 
                      (cfData?.dataNascita ? (
                        <span className="text-blue-600">
                          {formattaDataNascita(cfData.dataNascita)} 
                          <span className="text-xs ml-1">(da CF)</span>
                        </span>
                      ) : '-')
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Luogo di Nascita</label>
                  <p className="text-gray-900">
                    {student.birthPlace || 
                      (cfData?.luogoNascita ? (
                        <span className="text-blue-600">
                          {cfData.luogoNascita}
                          <span className="text-xs ml-1">(da CF)</span>
                        </span>
                      ) : '-')
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sesso</label>
                  <p className="text-gray-900">
                    {cfData?.sesso ? (cfData.sesso === 'M' ? 'Maschio' : 'Femmina') : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">
                    {student.email ? (
                      <a href={`mailto:${student.email}`} className="text-blue-600 hover:underline">
                        {student.email}
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefono</label>
                  <p className="text-gray-900">
                    {student.phone ? (
                      <a href={`tel:${student.phone}`} className="text-blue-600 hover:underline">
                        {student.phone}
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Indirizzo</label>
                  <p className="text-gray-900">{student.address || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Azienda */}
          <Card>
            <CardHeader>
              <CardTitle>Azienda</CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ragione Sociale</label>
                    <p className="text-gray-900 font-medium">{company.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">P.IVA</label>
                    <p className="text-gray-900 font-mono text-sm">{company.vatNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referente</label>
                    <p className="text-gray-900">{company.contactPerson || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">
                      {company.email ? (
                        <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline text-sm">
                          {company.email}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefono</label>
                    <p className="text-gray-900">{company.phone || '-'}</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="w-full mt-4"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    Vai all'azienda →
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Nessuna azienda associata
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course History */}
        <Card>
          <CardHeader>
            <CardTitle>Storico Corsi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {courseHistory.length === 0 ? (
              <EmptyState
                title="Nessun corso frequentato"
                description="Lo studente non ha ancora partecipato a nessun corso"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Luogo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Presenze</TableHead>
                    <TableHead>Attestato</TableHead>
                    <TableHead>Scadenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseHistory.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.courseName}</div>
                          <div className="text-sm text-gray-500">{course.courseCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(course.editionDate)}</TableCell>
                      <TableCell>{course.location || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(course.status)}`}>
                          {getStatusLabel(course.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${course.attendancePercentage}%` }}
                            />
                          </div>
                          <span className="text-sm">{course.attendancePercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.certificateIssued ? (
                          <span className="text-green-600">✓ Rilasciato</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {course.certificateExpiry ? (
                          <span className={
                            new Date(course.certificateExpiry) < new Date() ? 'text-red-600 font-medium' :
                            new Date(course.certificateExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? 'text-orange-600' :
                            'text-gray-900'
                          }>
                            {formatDate(course.certificateExpiry)}
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
