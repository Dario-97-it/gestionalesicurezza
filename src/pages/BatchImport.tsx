import { useState, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type ImportType = 'companies' | 'students' | 'instructors';

interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  companiesCreated?: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;
  duplicates: Array<{
    row: number;
    field: string;
    existingId: number;
    existingName: string;
    value: string;
  }>;
}

const IMPORT_CONFIGS = {
  companies: {
    title: 'Aziende',
    icon: '🏢',
    description: 'Importa aziende clienti con dati anagrafici e fiscali',
    requiredFields: ['name'],
    optionalFields: ['vatNumber', 'taxCode', 'address', 'city', 'province', 'postalCode', 'country', 'phone', 'email', 'pec', 'sdiCode', 'notes'],
    templateHeaders: [
      'Nome Azienda*', 'P.IVA', 'Codice Fiscale', 'Indirizzo', 'Città', 'Provincia', 
      'CAP', 'Paese', 'Telefono', 'Email', 'PEC', 'Codice SDI', 'Note'
    ],
    fieldMapping: {
      'Nome Azienda*': 'name',
      'P.IVA': 'vatNumber',
      'Codice Fiscale': 'taxCode',
      'Indirizzo': 'address',
      'Città': 'city',
      'Provincia': 'province',
      'CAP': 'postalCode',
      'Paese': 'country',
      'Telefono': 'phone',
      'Email': 'email',
      'PEC': 'pec',
      'Codice SDI': 'sdiCode',
      'Note': 'notes',
    },
    endpoint: '/api/companies/import-batch',
  },
  students: {
    title: 'Studenti',
    icon: '👨‍🎓',
    description: 'Importa studenti con dati anagrafici e azienda di appartenenza',
    requiredFields: ['firstName', 'lastName'],
    optionalFields: ['email', 'phone', 'taxCode', 'birthDate', 'birthPlace', 'address', 'city', 'province', 'postalCode', 'country', 'companyName', 'companyVatNumber', 'notes'],
    templateHeaders: [
      'Nome*', 'Cognome*', 'Email', 'Telefono', 'Codice Fiscale', 'Data Nascita', 
      'Luogo Nascita', 'Indirizzo', 'Città', 'Provincia', 'CAP', 'Paese', 
      'Nome Azienda', 'P.IVA Azienda', 'Note'
    ],
    fieldMapping: {
      'Nome*': 'firstName',
      'Cognome*': 'lastName',
      'Email': 'email',
      'Telefono': 'phone',
      'Codice Fiscale': 'taxCode',
      'Data Nascita': 'birthDate',
      'Luogo Nascita': 'birthPlace',
      'Indirizzo': 'address',
      'Città': 'city',
      'Provincia': 'province',
      'CAP': 'postalCode',
      'Paese': 'country',
      'Nome Azienda': 'companyName',
      'P.IVA Azienda': 'companyVatNumber',
      'Note': 'notes',
    },
    endpoint: '/api/students/import-batch',
  },
  instructors: {
    title: 'Docenti',
    icon: '👨‍🏫',
    description: 'Importa docenti con dati anagrafici, fiscali e tariffe',
    requiredFields: ['firstName', 'lastName'],
    optionalFields: ['email', 'phone', 'taxCode', 'vatNumber', 'specialization', 'hourlyRate', 'address', 'city', 'province', 'postalCode', 'country', 'iban', 'notes'],
    templateHeaders: [
      'Nome*', 'Cognome*', 'Email', 'Telefono', 'Codice Fiscale', 'P.IVA', 
      'Specializzazione', 'Tariffa Oraria (€)', 'Indirizzo', 'Città', 'Provincia', 
      'CAP', 'Paese', 'IBAN', 'Note'
    ],
    fieldMapping: {
      'Nome*': 'firstName',
      'Cognome*': 'lastName',
      'Email': 'email',
      'Telefono': 'phone',
      'Codice Fiscale': 'taxCode',
      'P.IVA': 'vatNumber',
      'Specializzazione': 'specialization',
      'Tariffa Oraria (€)': 'hourlyRate',
      'Indirizzo': 'address',
      'Città': 'city',
      'Provincia': 'province',
      'CAP': 'postalCode',
      'Paese': 'country',
      'IBAN': 'iban',
      'Note': 'notes',
    },
    endpoint: '/api/instructors/import-batch',
  },
};

export default function BatchImport() {
  const [importType, setImportType] = useState<ImportType>('companies');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'result'>('select');
  const [finalResult, setFinalResult] = useState<ImportResult | null>(null);

  const config = IMPORT_CONFIGS[importType];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setIsLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('Il file deve contenere almeno una riga di dati oltre all\'intestazione');
        setFile(null);
        setIsLoading(false);
        return;
      }

      // Mappa le colonne usando l'intestazione
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      const mappedRows = rows.map(row => {
        const mappedRow: Record<string, any> = {};
        headers.forEach((header, index) => {
          const fieldName = config.fieldMapping[header as keyof typeof config.fieldMapping];
          if (fieldName) {
            mappedRow[fieldName] = row[index];
          }
        });
        return mappedRow;
      });

      setParsedData(mappedRows);
      setStep('preview');

      // Esegui preview (dry run)
      const token = localStorage.getItem('accessToken');
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: mappedRows, dryRun: true }),
      });

      if (!response.ok) {
        throw new Error('Errore durante la verifica dei dati');
      }

      const result = await response.json();
      setPreviewResult(result);
    } catch (err: any) {
      toast.error(err.message || 'Errore durante la lettura del file');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([config.templateHeaders]);
    
    // Imposta larghezza colonne
    ws['!cols'] = config.templateHeaders.map(() => ({ wch: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.title);
    XLSX.writeFile(wb, `Template_${config.title}.xlsx`);
    toast.success('Template scaricato');
  };

  const executeImport = async () => {
    if (!parsedData.length) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: parsedData, dryRun: false }),
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'importazione');
      }

      const result = await response.json();
      setFinalResult(result);
      setStep('result');

      if (result.success) {
        toast.success(`Importazione completata: ${result.imported} ${config.title.toLowerCase()} importati`);
      } else {
        toast.error(`Importazione completata con errori: ${result.imported} importati, ${result.skipped} saltati`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore durante l\'importazione');
    } finally {
      setIsLoading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setPreviewResult(null);
    setFinalResult(null);
    setStep('select');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">📥 Importazione Massiva</h1>
            <p className="text-gray-600 mt-1">Importa dati da file Excel con validazione e controllo duplicati</p>
          </div>
          {step !== 'select' && (
            <Button onClick={resetImport} variant="secondary">
              ← Nuova Importazione
            </Button>
          )}
        </div>

        {/* Step 1: Selezione tipo */}
        {step === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.entries(IMPORT_CONFIGS) as [ImportType, typeof IMPORT_CONFIGS.companies][]).map(([type, cfg]) => (
              <Card 
                key={type}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  importType === type ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setImportType(type)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">{cfg.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{cfg.title}</h3>
                  <p className="text-sm text-gray-600">{cfg.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 'select' && (
          <Card>
            <CardHeader>
              <CardTitle>Importa {config.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">📋</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Template Excel</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Scarica il template e compilalo con i dati da importare. I campi con * sono obbligatori.
                    </p>
                    <Button onClick={downloadTemplate} className="mt-3" size="sm">
                      📥 Scarica Template {config.title}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Campi richiesti */}
              <div>
                <h4 className="font-medium mb-2">Campi del template:</h4>
                <div className="flex flex-wrap gap-2">
                  {config.templateHeaders.map((header, i) => (
                    <span 
                      key={i}
                      className={`px-2 py-1 rounded text-sm ${
                        header.includes('*') 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {header}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">* Campi obbligatori</p>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-4xl mb-4">📁</div>
                {isDragActive ? (
                  <p className="text-blue-600">Rilascia il file qui...</p>
                ) : (
                  <>
                    <p className="text-gray-600">Trascina qui il file Excel o clicca per selezionarlo</p>
                    <p className="text-sm text-gray-500 mt-2">Formati supportati: .xlsx, .xls, .csv</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && previewResult && (
          <div className="space-y-6">
            {/* Riepilogo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{previewResult.totalRows}</div>
                  <div className="text-sm text-gray-600">Righe Totali</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewResult.imported}</div>
                  <div className="text-sm text-gray-600">Da Importare</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewResult.skipped}</div>
                  <div className="text-sm text-gray-600">Da Saltare</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{previewResult.duplicates.length}</div>
                  <div className="text-sm text-gray-600">Duplicati</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{previewResult.warnings.length}</div>
                  <div className="text-sm text-gray-600">Avvertimenti</div>
                </CardContent>
              </Card>
            </div>

            {/* Errori */}
            {previewResult.errors.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700">❌ Errori ({previewResult.errors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Riga</th>
                          <th className="px-3 py-2 text-left">Campo</th>
                          <th className="px-3 py-2 text-left">Errore</th>
                          <th className="px-3 py-2 text-left">Valore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.errors.map((error, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="px-3 py-2">{error.row}</td>
                            <td className="px-3 py-2">{error.field}</td>
                            <td className="px-3 py-2">{error.message}</td>
                            <td className="px-3 py-2 font-mono text-xs">{error.value || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Duplicati */}
            {previewResult.duplicates.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-700">⚠️ Duplicati ({previewResult.duplicates.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Riga</th>
                          <th className="px-3 py-2 text-left">Campo</th>
                          <th className="px-3 py-2 text-left">Valore</th>
                          <th className="px-3 py-2 text-left">Esistente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.duplicates.map((dup, i) => (
                          <tr key={i} className="border-t border-orange-100">
                            <td className="px-3 py-2">{dup.row}</td>
                            <td className="px-3 py-2">{dup.field}</td>
                            <td className="px-3 py-2 font-mono text-xs">{dup.value}</td>
                            <td className="px-3 py-2">{dup.existingName} (ID: {dup.existingId})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Avvertimenti */}
            {previewResult.warnings.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-700">⚡ Avvertimenti ({previewResult.warnings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Riga</th>
                          <th className="px-3 py-2 text-left">Campo</th>
                          <th className="px-3 py-2 text-left">Avvertimento</th>
                          <th className="px-3 py-2 text-left">Valore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.warnings.map((warning, i) => (
                          <tr key={i} className="border-t border-yellow-100">
                            <td className="px-3 py-2">{warning.row}</td>
                            <td className="px-3 py-2">{warning.field}</td>
                            <td className="px-3 py-2">{warning.message}</td>
                            <td className="px-3 py-2 font-mono text-xs">{warning.value || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Azioni */}
            <div className="flex gap-4 justify-end">
              <Button onClick={resetImport} variant="secondary">
                Annulla
              </Button>
              <Button 
                onClick={executeImport} 
                disabled={isLoading || previewResult.imported === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Importazione...' : `✅ Importa ${previewResult.imported} ${config.title}`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Risultato finale */}
        {step === 'result' && finalResult && (
          <Card>
            <CardHeader>
              <CardTitle className={finalResult.success ? 'text-green-700' : 'text-orange-700'}>
                {finalResult.success ? '✅ Importazione Completata' : '⚠️ Importazione Completata con Avvertimenti'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{finalResult.totalRows}</div>
                  <div className="text-sm text-gray-600">Righe Totali</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{finalResult.imported}</div>
                  <div className="text-sm text-gray-600">Importati</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{finalResult.skipped}</div>
                  <div className="text-sm text-gray-600">Saltati</div>
                </div>
                {finalResult.companiesCreated !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{finalResult.companiesCreated}</div>
                    <div className="text-sm text-gray-600">Aziende Create</div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={resetImport}>
                  📥 Nuova Importazione
                </Button>
                <Button 
                  onClick={() => window.location.href = `/${importType}`}
                  variant="secondary"
                >
                  Vai a {config.title}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Elaborazione in corso...</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
