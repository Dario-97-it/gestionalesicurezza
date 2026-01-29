import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Instructor } from '../types';

interface CourseHistory {
  editionId: number;
  courseName: string;
  durationHours: number;
  startDate: string;
  endDate: string;
  location: string;
  price: number;
  status: 'completed' | 'ongoing' | 'scheduled' | 'cancelled';
  totalStudents: number;
  byCompany: Array<{
    companyId: number;
    companyName: string;
    studentCount: number;
    totalPrice: number;
  }>;
  totalRevenue: number;
}

interface InstructorWithHistory extends Instructor {
  courseHistory?: CourseHistory[];
  statistics?: {
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    totalHours: number;
  };
}

export default function InstructorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState<InstructorWithHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructor();
  }, [id]);

  const fetchInstructor = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const instructorResponse = await fetch(`/api/instructors/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!instructorResponse.ok) {
        throw new Error('Errore nel caricamento del docente');
      }
      
      const instructorData = await instructorResponse.json();
      setInstructor(instructorData);
    } catch (error) {
      console.error('Error fetching instructor:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completato</Badge>;
      case 'ongoing':
        return <Badge variant="warning">In Corso</Badge>;
      case 'scheduled':
        return <Badge variant="info">Programmato</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Annullato</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value / 100);
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

  if (!instructor) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Docente non trovato</p>
          <Button onClick={() => navigate('/instructors')} className="mt-4">
            Torna ai Docenti
          </Button>
        </div>
      </Layout>
    );
  }

  const courseHistory = instructor.courseHistory || [];
  const stats = instructor.statistics || { totalCourses: 0, totalStudents: 0, totalRevenue: 0, totalHours: 0 };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instructors')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {instructor.firstName} {instructor.lastName}
            </h1>
            <p className="text-gray-600">{instructor.specialization || 'Docente'}</p>
          </div>
        </div>

        {/* Instructor Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Docente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{instructor.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Telefono</label>
                <p className="text-gray-900">{instructor.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Specializzazione</label>
                <p className="text-gray-900">{instructor.specialization || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tariffa Oraria</label>
                <p className="text-gray-900">
                  {instructor.hourlyRate ? formatCurrency(instructor.hourlyRate) : '-'}
                </p>
              </div>
            </div>
            {instructor.bio && (
              <div>
                <label className="text-sm font-medium text-gray-500">Biografia</label>
                <p className="text-gray-900">{instructor.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats.totalCourses > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.totalCourses}</p>
                  <p className="text-sm text-gray-600">Corsi Tenuti</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-600">Studenti Totali</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.totalHours}h</p>
                  <p className="text-sm text-gray-600">Ore Insegnate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-sm text-gray-600">Incasso Totale</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Course History */}
        <Card>
          <CardHeader>
            <CardTitle>Storico Corsi Tenuti</CardTitle>
          </CardHeader>
          <CardContent>
            {courseHistory.length === 0 ? (
              <EmptyState
                title="Nessun corso trovato"
                description="Questo docente non ha ancora tenuto alcun corso"
              />
            ) : (
              <div className="space-y-6">
                {courseHistory.map((course) => (
                  <div key={course.editionId} className="border rounded-lg p-4 space-y-4">
                    {/* Course Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseName}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(course.startDate).toLocaleDateString('it-IT')} - {new Date(course.endDate).toLocaleDateString('it-IT')} • {course.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(course.status)}
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Ore</p>
                        <p className="font-semibold text-gray-900">{course.durationHours}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Studenti</p>
                        <p className="font-semibold text-gray-900">{course.totalStudents}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Prezzo Unitario</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(course.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Incasso Totale</p>
                        <p className="font-semibold text-green-600">{formatCurrency(course.totalRevenue)}</p>
                      </div>
                    </div>

                    {/* By Company Table */}
                    {course.byCompany.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Dettaglio per Azienda</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Azienda</TableHead>
                              <TableHead className="text-right">Studenti</TableHead>
                              <TableHead className="text-right">Importo Totale</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {course.byCompany.map((company) => (
                              <TableRow key={company.companyId}>
                                <TableCell className="font-medium">{company.companyName}</TableCell>
                                <TableCell className="text-right">{company.studentCount}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {formatCurrency(company.totalPrice)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
