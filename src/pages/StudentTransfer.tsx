import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  companyId: number | null;
  companyName?: string;
}

interface Company {
  id: number;
  name: string;
}

export default function StudentTransfer() {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newCompanyId, setNewCompanyId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Carica studenti e aziende
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');

      // Carica studenti
      const studentsRes = await fetch('/api/students', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!studentsRes.ok) throw new Error('Errore nel caricamento studenti');
      const studentsData = await studentsRes.json();
      setStudents(studentsData);

      // Carica aziende
      const companiesRes = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!companiesRes.ok) throw new Error('Errore nel caricamento aziende');
      const companiesData = await companiesRes.json();
      setCompanies(companiesData);
    } catch (err: any) {
      toast.error(err.message || 'Errore nel caricamento dati');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           (s.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleTransferClick = (student: Student) => {
    setSelectedStudent(student);
    setNewCompanyId(null);
    setShowConfirmModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedStudent || !newCompanyId) {
      toast.error('Seleziona un\'azienda di destinazione');
      return;
    }

    // Verifica che non sia la stessa azienda
    if (selectedStudent.companyId === newCompanyId) {
      toast.error('Lo studente è già associato a questa azienda');
      return;
    }

    setIsTransferring(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/students/${selectedStudent.id}/transfer-company`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newCompanyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il trasferimento');
      }

      const result = await response.json();
      toast.success(result.message);
      setShowConfirmModal(false);
      setSelectedStudent(null);
      setNewCompanyId(null);
      loadData(); // Ricarica i dati
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il trasferimento');
    } finally {
      setIsTransferring(false);
    }
  };

  const getCompanyName = (companyId: number | null) => {
    if (!companyId) return 'Nessuna azienda';
    return companies.find(c => c.id === companyId)?.name || `Azienda ${companyId}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">👥 Trasferimento Studenti</h1>
          <p className="text-gray-600 mt-1">Sposta studenti da un'azienda a un'altra</p>
        </div>

        {/* Ricerca */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca per nome, cognome o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={loadData} variant="secondary">
                🔄 Aggiorna
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista studenti */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Caricamento...</p>
            </CardContent>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Nessuno studente trovato</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map(student => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{student.email || 'Email non disponibile'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-500">Azienda attuale:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.companyId
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getCompanyName(student.companyId)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleTransferClick(student)}
                      className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    >
                      🔄 Trasferisci
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal di conferma trasferimento */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="🔄 Trasferisci Studente"
        >
          {selectedStudent && (
            <div className="space-y-6">
              {/* Dati studente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Studente</h4>
                <p className="text-lg font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p className="text-sm text-gray-600">{selectedStudent.email}</p>
              </div>

              {/* Azienda attuale */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Azienda Attuale</h4>
                <p className="text-lg font-medium">{getCompanyName(selectedStudent.companyId)}</p>
              </div>

              {/* Selezione azienda di destinazione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Azienda di Destinazione *
                </label>
                <select
                  value={newCompanyId || ''}
                  onChange={(e) => setNewCompanyId(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Seleziona un'azienda --</option>
                  {companies
                    .filter(c => c.id !== selectedStudent.companyId) // Escludi l'azienda attuale
                    .map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Avvertimento */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Attenzione:</strong> Il trasferimento non modificherà le iscrizioni ai corsi già effettuate. 
                  Se necessario, dovrai gestire le iscrizioni separatamente.
                </p>
              </div>

              {/* Pulsanti */}
              <div className="flex gap-4 justify-end">
                <Button
                  onClick={() => setShowConfirmModal(false)}
                  variant="secondary"
                  disabled={isTransferring}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleConfirmTransfer}
                  disabled={!newCompanyId || isTransferring}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isTransferring ? 'Trasferimento...' : '✅ Conferma Trasferimento'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
