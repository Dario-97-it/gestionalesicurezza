import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import toast from 'react-hot-toast';

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{
    rowNumber: number;
    error: string;
  }>;
  warnings: Array<{
    rowNumber: number;
    warning: string;
  }>;
}

export default function BatchRegistrations() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Seleziona un file CSV');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async (dryRun: boolean) => {
    if (!file) {
      toast.error('Seleziona un file CSV');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', dryRun.toString());

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/registrations/import-batch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setShowPreview(true);

        if (dryRun) {
          toast.success(`Preview: ${data.importedCount} iscrizioni da importare`);
        } else {
          toast.success(`${data.importedCount} iscrizioni importate con successo`);
          setFile(null);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Errore nell\'importazione');
      }
    } catch (err) {
      console.error('Error importing registrations:', err);
      toast.error('Errore nell\'importazione');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `studentFirstName,studentLastName,studentEmail,studentPhone,companyName,courseId,courseEditionId,priceApplied,notes
Marco,Rossi,marco.rossi@example.com,+39123456789,Acme Corp,1,1,50000,Note aggiuntive
Maria,Bianchi,maria.bianchi@example.com,+39987654321,Beta Ltd,1,1,50000,`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
    element.setAttribute('download', 'template-iscrizioni.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📥 Importazione Batch Iscrizioni</h1>
          <p className="text-gray-600 mt-2">Importa più iscrizioni da file CSV</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleziona file CSV</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Il file deve contenere le colonne: studentFirstName, studentLastName, studentEmail, courseId, courseEditionId
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <div className="font-medium text-gray-900">
                      {file ? file.name : 'Clicca per selezionare un file'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">oppure trascina il file qui</div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={downloadTemplate}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  📋 Scarica Template
                </Button>
                <Button
                  onClick={() => handleImport(true)}
                  disabled={!file || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? '⏳ Caricamento...' : '👁️ Preview'}
                </Button>
                <Button
                  onClick={() => handleImport(false)}
                  disabled={!file || isLoading || !result}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? '⏳ Caricamento...' : '✅ Importa'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && showPreview && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Importazione</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.totalRows}</div>
                      <div className="text-sm text-gray-600">Righe totali</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.importedCount}</div>
                      <div className="text-sm text-gray-600">Importate</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{result.warnings.length}</div>
                      <div className="text-sm text-gray-600">Avvertimenti</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                      <div className="text-sm text-gray-600">Errori</div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-600 mb-2">❌ Errori ({result.errors.length})</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {result.errors.map((err, idx) => (
                        <div key={idx} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          Riga {err.rowNumber}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2">⚠️ Avvertimenti ({result.warnings.length})</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {result.warnings.map((warn, idx) => (
                        <div key={idx} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                          Riga {warn.rowNumber}: {warn.warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {result.importedCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-700">
                      ✅ {result.importedCount} iscrizioni pronte per l'importazione
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📖 Istruzioni</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <strong>Formato CSV:</strong> Il file deve essere un CSV con le seguenti colonne obbligatorie:
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">studentFirstName</code> - Nome dello studente</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">studentLastName</code> - Cognome dello studente</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">studentEmail</code> - Email dello studente</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">courseId</code> - ID del corso</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">courseEditionId</code> - ID dell'edizione del corso</li>
                </ul>
              </div>
              <div>
                <strong>Colonne opzionali:</strong>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">studentPhone</code> - Telefono dello studente</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">companyName</code> - Nome dell'azienda</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">priceApplied</code> - Prezzo applicato (in centesimi)</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">notes</code> - Note aggiuntive</li>
                </ul>
              </div>
              <div>
                <strong>Procedura:</strong>
                <ol className="list-decimal list-inside mt-2 ml-2 space-y-1">
                  <li>Scarica il template CSV</li>
                  <li>Compila il file con i dati delle iscrizioni</li>
                  <li>Carica il file e clicca "Preview" per verificare</li>
                  <li>Se tutto è corretto, clicca "Importa" per salvare le iscrizioni</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
