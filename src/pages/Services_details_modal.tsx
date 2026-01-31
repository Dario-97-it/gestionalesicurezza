// Aggiungi questo codice prima della chiusura di </Layout> nel file Services.tsx

{/* Course Details Modal */}
<Modal
  isOpen={isDetailsModalOpen}
  onClose={() => setIsDetailsModalOpen(false)}
  title={`Dettagli Corso: ${selectedCourse?.title}`}
  size="xl"
>
  {isLoadingDetails ? (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ) : courseDetails ? (
    <div className="space-y-6">
      {/* Course Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Informazioni Corso</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Codice</p>
            <p className="font-mono font-semibold">{courseDetails.course.code}</p>
          </div>
          <div>
            <p className="text-gray-600">Tipo</p>
            <p className="font-semibold">{getTypeLabel(courseDetails.course.type)}</p>
          </div>
          <div>
            <p className="text-gray-600">Durata</p>
            <p className="font-semibold">{courseDetails.course.durationHours} ore</p>
          </div>
          <div>
            <p className="text-gray-600">Prezzo Base</p>
            <p className="font-semibold">€{((courseDetails.course.defaultPrice || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Editions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Edizioni ({courseDetails.editions.length})</h3>
        {courseDetails.editions.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessuna edizione creata</p>
        ) : (
          <div className="space-y-4">
            {courseDetails.editions.map((edition: any, idx: number) => (
              <div key={edition.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Edizione {idx + 1}</p>
                    <p className="font-semibold">{new Date(edition.startDate).toLocaleDateString('it-IT')} - {new Date(edition.endDate).toLocaleDateString('it-IT')}</p>
                  </div>
                  <Badge variant={edition.isDedicated ? 'secondary' : 'success'}>
                    {edition.isDedicated ? 'Privata' : 'Multi-azienda'}
                  </Badge>
                </div>

                {/* Registrations */}
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Iscritti: {edition.totalRegistrations}</p>
                  {edition.registrations.length === 0 ? (
                    <p className="text-gray-500 text-xs">Nessun iscritto</p>
                  ) : (
                    <div className="space-y-2">
                      {edition.registrations.map((reg: any) => (
                        <div key={reg.id} className="bg-white border border-gray-100 rounded p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{reg.studentName} {reg.studentLastName}</span>
                            <span className="text-gray-600">€{(reg.priceApplied / 100).toFixed(2)}</span>
                          </div>
                          <div className="text-gray-600 mt-1">
                            {reg.companyName && <p>Azienda: {reg.companyName}</p>}
                            {reg.attendancePercent && <p>Presenze: {reg.attendancePercent}%</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Company Prices */}
                {edition.companyPrices.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Prezzi per Azienda</p>
                    <div className="space-y-1">
                      {edition.companyPrices.map((cp: any) => (
                        <div key={cp.companyId} className="flex justify-between text-xs">
                          <span>{cp.companyName}</span>
                          <span className="font-semibold">€{(cp.price / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null}
  <div className="flex justify-end gap-3 pt-4 border-t">
    <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
      Chiudi
    </Button>
  </div>
</Modal>
