import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { ArrowLeftIcon, CalendarIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Instructor } from '../types';

interface CourseSession {
  id: number;
  courseTitle: string;
  courseCode: string;
  editionId: number;
  startDate: string;
  endDate: string;
  location: string;
  duration: number;
  status: 'completed' | 'ongoing' | 'scheduled' | 'cancelled';
  studentsCount: number;
}

export default function InstructorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchInstructor();
  }, [id]);

  const fetchInstructor = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Fetch instructor
      const instructorResponse = await fetch(`/api/instructors/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const instructorData = await instructorResponse.json();
      setInstructor(instructorData);

      // Fetch instructor's course sessions
      const sessionsResponse = await fetch(`/api/instructors/${id}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sessionsData = await sessionsResponse.json();
      setSessions(sessionsData.data || []);
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

  const handleSyncGoogleCalendar = async () => {
    if (!instructor?.email) {
      toast.error('Email del docente non disponibile');
      return;
    }

    setIsSyncing(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/instructors/${id}/sync-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: instructor.email })
      });

      if (response.ok) {
        toast.success('Sessioni sincronizzate con Google Calendar');
      } else {
        throw new Error('Errore sincronizzazione');
      }
    } catch (error) {
      toast.error('Errore nella sincronizzazione con Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadICS = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/instructors/${id}/calendar.ics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${instructor?.firstName}_${instructor?.lastName}_sessions.ics`;
        link.click();
        toast.success('File .ics scaricato');
      } else {
        throw new Error('Errore download');
      }
    } catch (error) {
      toast.error('Errore nel download del file');
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
                <label className="text-sm font-medium text-gray-500">Stato</label>
                <p className="text-gray-900">
                  {instructor.isActive ? (
                    <Badge variant="success">Attivo</Badge>
                  ) : (
                    <Badge variant="secondary">Inattivo</Badge>
                  )}
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

        {/* Sync Google Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronizzazione Calendario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Sincronizza le sessioni di questo docente con Google Calendar o scarica il file .ics.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSyncGoogleCalendar}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <CalendarIcon className="w-4 h-4" />
                Sincronizza Google Calendar
              </Button>
              <Button
                onClick={handleDownloadICS}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <EnvelopeIcon className="w-4 h-4" />
                Scarica .ics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Course Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Storico Corsi Tenuti</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                title="Nessuna sessione trovata"
                description="Questo docente non ha ancora tenuto alcuna sessione"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corso</TableHead>
                    <TableHead>Data Inizio</TableHead>
                    <TableHead>Data Fine</TableHead>
                    <TableHead>Luogo</TableHead>
                    <TableHead>Ore</TableHead>
                    <TableHead>Studenti</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.courseTitle}</TableCell>
                      <TableCell>{new Date(session.startDate).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{new Date(session.endDate).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{session.location || '-'}</TableCell>
                      <TableCell>{session.duration}h</TableCell>
                      <TableCell>{session.studentsCount}</TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{sessions.length}</p>
                  <p className="text-sm text-gray-600">Sessioni Totali</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {sessions.filter(s => s.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-600">Completate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {sessions.reduce((sum, s) => sum + s.studentsCount, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Studenti Totali</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
