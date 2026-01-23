import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table';
import toast from 'react-hot-toast';

interface ExpiringCertificate {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseEditionId: number;
  companyName?: string;
  certificateIssuedAt: string;
  expirationDate: string;
  daysUntilExpiration: number;
  urgency: 'high' | 'medium' | 'low';
}

interface Summary {
  high: number;
  medium: number;
  low: number;
}

export default function CertificateNotifications() {
  const [certificates, setCertificates] = useState<ExpiringCertificate[]>([]);
  const [summary, setSummary] = useState<Summary>({ high: 0, medium: 0, low: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedCerts, setSelectedCerts] = useState<Set<number>>(new Set());
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [notifyCompanies, setNotifyCompanies] = useState(true);

  // Fetch expiring certificates
  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/certificates/expiring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCertificates(data.data || []);
        setSummary(data.summary || { high: 0, medium: 0, low: 0 });
      } else {
        toast.error('Errore nel caricamento dei certificati');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      toast.error('Errore nel caricamento dei certificati');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // Send notifications
  const sendNotifications = async () => {
    if (certificates.length === 0) {
      toast.error('Nessun certificato in scadenza');
      return;
    }

    setIsSending(true);
    try {
      const token = localStorage.getItem('accessToken');
      const registrationIds = selectedCerts.size > 0 
        ? Array.from(selectedCerts) 
        : certificates.map(c => c.id);

      const response = await fetch('/api/certificates/notify-expiring', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registrationIds,
          notifyStudents,
          notifyCompanies
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.emailsSent} notifiche inviate con successo`);
        setSelectedCerts(new Set());
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore nell\'invio delle notifiche');
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
      toast.error('Errore nell\'invio delle notifiche');
    } finally {
      setIsSending(false);
    }
  };

  const toggleCertificate = (id: number) => {
    const newSelected = new Set(selectedCerts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCerts(newSelected);
  };

  const toggleAll = () => {
    if (selectedCerts.size === certificates.length) {
      setSelectedCerts(new Set());
    } else {
      setSelectedCerts(new Set(certificates.map(c => c.id)));
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'Urgente (≤7 giorni)';
      case 'medium':
        return 'Medio (8-14 giorni)';
      case 'low':
        return 'Basso (15-30 giorni)';
      default:
        return '-';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Notifiche Scadenza Certificati</h1>
          <p className="text-gray-600 mt-2">Gestisci le notifiche per i certificati in scadenza</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{summary.high}</div>
                <div className="text-sm text-gray-600 mt-1">Urgenti (≤7 giorni)</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{summary.medium}</div>
                <div className="text-sm text-gray-600 mt-1">Medio (8-14 giorni)</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{summary.low}</div>
                <div className="text-sm text-gray-600 mt-1">Basso (15-30 giorni)</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {summary.high + summary.medium + summary.low}
                </div>
                <div className="text-sm text-gray-600 mt-1">Totale in scadenza</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Options */}
        {certificates.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyStudents}
                      onChange={(e) => setNotifyStudents(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Notifica studenti</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyCompanies}
                      onChange={(e) => setNotifyCompanies(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Notifica aziende</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={sendNotifications}
                    disabled={isSending || (selectedCerts.size === 0 && certificates.length === 0)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? '📤 Invio in corso...' : `📤 Invia notifiche${selectedCerts.size > 0 ? ` (${selectedCerts.size})` : ''}`}
                  </Button>
                  <Button
                    onClick={fetchCertificates}
                    disabled={isLoading}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    🔄 Aggiorna
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificates Table */}
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Caricamento in corso...</p>
              </div>
            ) : certificates.length === 0 ? (
              <EmptyState
                icon="✓"
                title="Nessun certificato in scadenza"
                description="Tutti i certificati sono validi per i prossimi 30 giorni"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedCerts.size === certificates.length}
                          onChange={toggleAll}
                          className="w-4 h-4"
                        />
                      </TableHead>
                      <TableHead>Studente</TableHead>
                      <TableHead>Corso</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead>Giorni</TableHead>
                      <TableHead>Urgenza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCerts.has(cert.id)}
                            onChange={() => toggleCertificate(cert.id)}
                            className="w-4 h-4"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{cert.studentName}</div>
                            <div className="text-gray-500">{cert.studentEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{cert.courseName}</TableCell>
                        <TableCell className="text-sm">{cert.companyName || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(cert.expirationDate).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {cert.daysUntilExpiration} giorni
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(cert.urgency)}`}>
                            {getUrgencyLabel(cert.urgency)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
