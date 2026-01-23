import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { importStudents, importCompanies, downloadTemplate, type ImportResult } from '../lib/excel';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'students' | 'companies';
  existingCodes: Set<string>; // CF per studenti, P.IVA per aziende
  onImport: (data: any[]) => Promise<void>;
}

export function ImportModal({ isOpen, onClose, type, existingCodes, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<any> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      let result: ImportResult<any>;
      if (type === 'students') {
        result = await importStudents(selectedFile, new Set(existingCodes));
      } else {
        result = await importCompanies(selectedFile, new Set(existingCodes));
      }
      setImportResult(result);
      setStep('preview');
    } catch (error: any) {
      console.error('Error processing file:', error);
      setImportResult({
        success: false,
        data: [],
        errors: [{ row: 0, column: '', message: error.message, value: null }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        duplicates: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importResult || importResult.data.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(importResult.data);
      setStep('complete');
    } catch (error: any) {
      console.error('Error importing data:', error);
      setImportResult(prev => prev ? {
        ...prev,
        errors: [...prev.errors, { row: 0, column: '', message: `Errore import: ${error.message}`, value: null }]
      } : null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setStep('upload');
    onClose();
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>
            {type === 'students' ? 'Importa Studenti' : 'Importa Aziende'}
          </CardTitle>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-600 mb-4">
                  Seleziona un file Excel (.xlsx, .xls) o CSV
                </p>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                  {isProcessing ? 'Elaborazione...' : 'Seleziona File'}
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📋 Formato richiesto</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Il file deve contenere le seguenti colonne:
                </p>
                {type === 'students' ? (
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li><strong>Nome</strong> (obbligatorio)</li>
                    <li><strong>Cognome</strong> (obbligatorio)</li>
                    <li>Codice Fiscale</li>
                    <li>Email</li>
                    <li>Telefono</li>
                    <li>Data Nascita</li>
                    <li>Luogo Nascita</li>
                    <li>Indirizzo</li>
                    <li>Azienda</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li><strong>Ragione Sociale</strong> (obbligatorio)</li>
                    <li>Partita IVA</li>
                    <li>Email</li>
                    <li>Telefono</li>
                    <li>Indirizzo</li>
                    <li>Referente</li>
                  </ul>
                )}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="mt-3"
                  onClick={handleDownloadTemplate}
                >
                  📥 Scarica Template
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && importResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-700">{importResult.totalRows}</div>
                  <div className="text-sm text-gray-500">Righe Totali</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.validRows}</div>
                  <div className="text-sm text-gray-500">Valide</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                  <div className="text-sm text-gray-500">Duplicati</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                  <div className="text-sm text-gray-500">Errori</div>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">❌ Errori</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-auto">
                    {importResult.errors.map((error, i) => (
                      <li key={i}>
                        {error.row > 0 && `Riga ${error.row}: `}
                        {error.message}
                        {error.value && ` (${error.value})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Avvisi</h4>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-auto">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>
                        Riga {warning.row}: {warning.message}
                        {warning.value && ` (${warning.value})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {importResult.data.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Anteprima dati da importare ({importResult.data.length} record)
                  </h4>
                  <div className="border rounded-lg overflow-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {type === 'students' ? (
                            <>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cognome</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CF</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ragione Sociale</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">P.IVA</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Telefono</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importResult.data.slice(0, 10).map((item, i) => (
                          <tr key={i}>
                            {type === 'students' ? (
                              <>
                                <td className="px-3 py-2 text-sm">{item.firstName}</td>
                                <td className="px-3 py-2 text-sm">{item.lastName}</td>
                                <td className="px-3 py-2 text-sm font-mono text-xs">{item.fiscalCode || '-'}</td>
                                <td className="px-3 py-2 text-sm">{item.email || '-'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 text-sm">{item.name}</td>
                                <td className="px-3 py-2 text-sm font-mono text-xs">{item.vatNumber || '-'}</td>
                                <td className="px-3 py-2 text-sm">{item.email || '-'}</td>
                                <td className="px-3 py-2 text-sm">{item.phone || '-'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importResult.data.length > 10 && (
                      <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                        ... e altri {importResult.data.length - 10} record
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  ← Indietro
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importResult.data.length === 0 || isImporting}
                >
                  {isImporting ? 'Importazione...' : `Importa ${importResult.data.length} record`}
                </Button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Importazione completata!
              </h3>
              <p className="text-gray-600 mb-6">
                {importResult?.validRows || 0} record importati con successo
              </p>
              <Button onClick={handleClose}>
                Chiudi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
