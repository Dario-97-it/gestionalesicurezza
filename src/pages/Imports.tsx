import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import {
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { generateExcelTemplate, readExcelFile } from '../lib/export';

interface ImportResult {
  success: number;
  errors: number;
  details: {
    row: number;
    value: string;
    error: string;
  }[];
}

export default function Imports() {
  const [importType, setImportType] = useState<'students' | 'companies' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const studentColumns = [
    { key: 'firstName', label: 'Nome' },
    { key: 'lastName', label: 'Cognome' },
    { key: 'fiscalCode', label: 'Codice Fiscale' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
    { key: 'birthDate', label: 'Data di Nascita (YYYY-MM-DD)' },
    { key: 'birthPlace', label: 'Luogo di Nascita' },
    { key: 'jobTitle', label: 'Mansione' },
    { key: 'jobRole', label: 'Ruolo (operaio/impiegato/dirigente/preposto/altro)' },
    { key: 'companyName', label: 'Nome Azienda (deve esistere)' },
  ];

  const companyColumns = [
    { key: 'name', label: 'Nome Azienda' },
    { key: 'vatNumber', label: 'P.IVA' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
    { key: 'address', label: 'Indirizzo' },
    { key: 'city', label: 'Città' },
    { key: 'cap', label: 'CAP' },
    { key: 'contactPerson', label: 'Persona di Contatto' },
    { key: 'atecoCode', label: 'Codice ATECO' },
    { key: 'riskCategory', label: 'Categoria Rischio (low/medium/high)' },
  ];

  const handleDownloadTemplate = () => {
    if (importType === 'students') {
      generateExcelTemplate('studenti', studentColumns);
      toast.success('Template studenti scaricato');
    } else if (importType === 'companies') {
      generateExcelTemplate('aziende', companyColumns);
      toast.success('Template aziende scaricato');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readExcelFile(file);
      setSelectedFile(file);
      setPreviewData(data.slice(0, 5)); // Preview primi 5 record
      toast.success(`File caricato: ${data.length} record trovati`);
    } catch (error) {
      toast.error('Errore nel caricamento del file');
      console.error(error);
    }
  };

  const handleImportStudents = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast.error('Seleziona un file prima di importare');
      return;
    }

    setIsImporting(true);
    try {
      const data = await readExcelFile(selectedFile);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/students/import-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students: data })
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        toast.success(`${result.success} studenti importati con successo`);
        if (result.errors > 0) {
          toast.error(`${result.errors} errori durante l'import`);
        }
      } else {
        throw new Error('Errore durante l\'import');
      }
    } catch (error) {
      toast.error('Errore durante l\'import');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCompanies = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast.error('Seleziona un file prima di importare');
      return;
    }

    setIsImporting(true);
    try {
      const data = await readExcelFile(selectedFile);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/companies/import-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companies: data })
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        toast.success(`${result.success} aziende importate con successo`);
        if (result.errors > 0) {
          toast.error(`${result.errors} errori durante l'import`);
        }
      } else {
        throw new Error('Errore durante l\'import');
      }
    } catch (error) {
      toast.error('Errore durante l\'import');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setImportType(null);
    setSelectedFile(null);
    setPreviewData([]);
    setImportResult(null);
    setIsModalOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Importazioni</h1>
          <p className="text-gray-600 mt-2">Importa massivamente studenti e aziende da file Excel</p>
        </div>

        {/* Import Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Import Studenti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5" />
                Importa Studenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Importa fino a 1000 studenti contemporaneamente da file Excel. Ogni studente verrà associato all'azienda specificata nel file.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Le aziende devono già esistere nel sistema. Scarica il template per vedere i campi obbligatori.
                </p>
              </div>
              <Button
                onClick={() => {
                  setImportType('students');
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <DocumentArrowUpIcon className="w-4 h-4" />
                Importa Studenti
              </Button>
            </CardContent>
          </Card>

          {/* Import Aziende */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5" />
                Importa Aziende
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Importa fino a 1000 aziende contemporaneamente da file Excel. Ogni azienda deve avere una P.IVA univoca.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> La P.IVA deve essere univoca. Scarica il template per vedere i campi obbligatori.
                </p>
              </div>
              <Button
                onClick={() => {
                  setImportType('companies');
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <DocumentArrowUpIcon className="w-4 h-4" />
                Importa Aziende
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimi Import</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Nessun import recente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleReset}
        title={importType === 'students' ? 'Importa Studenti' : 'Importa Aziende'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Step 1: Download Template */}
          {!selectedFile && !importResult && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Passo 1:</strong> Scarica il template Excel e compilalo con i tuoi dati.
                </p>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Scarica Template
              </Button>
            </div>
          )}

          {/* Step 2: Upload File */}
          {!importResult && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Passo 2:</strong> Carica il file Excel compilato.
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full"
                />
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Preview (primi 5 record):</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          {Object.keys(previewData[0]).map(key => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {Object.values(row).map((value: any, colIdx) => (
                              <td key={colIdx} className="px-3 py-2 text-sm text-gray-700 border-b">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Button */}
              {selectedFile && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>Passo 3:</strong> Clicca su "Importa" per avviare l'import.
                    </p>
                  </div>
                  <Button
                    onClick={importType === 'students' ? handleImportStudents : handleImportCompanies}
                    isLoading={isImporting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    Importa {importType === 'students' ? 'Studenti' : 'Aziende'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Import Completato</p>
                    <p className="text-sm text-green-700 mt-1">
                      {importResult.success} record importati con successo
                    </p>
                  </div>
                </div>
              </div>

              {importResult.errors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">{importResult.errors} Errori</p>
                      <div className="text-sm text-red-700 mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {importResult.details.map((detail, idx) => (
                          <p key={idx}>
                            <strong>Riga {detail.row}:</strong> {detail.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Chiudi
                </Button>
                <Button
                  type="button"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Nuovo Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
