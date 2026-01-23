import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StudentAttendance {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  present: boolean;
  hoursAttended: number;
  sessionHours: number;
}

interface ExportData {
  courseName: string;
  editionDate: string;
  sessionInfo: string;
  instructor: string;
  location: string;
  students: StudentAttendance[];
  totalHours: number;
  totalSessionHours: number;
}

export const exportAttendancePDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPosition = margin;

  // Intestazione
  doc.setFontSize(16);
  doc.text('REGISTRO PRESENZE', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.text(`Corso: ${data.courseName}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Edizione: ${data.editionDate}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Sessione: ${data.sessionInfo}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Docente: ${data.instructor}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Luogo: ${data.location}`, margin, yPosition);
  yPosition += 8;

  // Tabella presenze
  const tableData = data.students.map(s => [
    `${s.firstName} ${s.lastName}`,
    s.email,
    s.companyName,
    s.present ? '✓' : '✗',
    `${s.hoursAttended}/${s.sessionHours}h`,
    `${Math.round((s.hoursAttended / s.sessionHours) * 100)}%`
  ]);

  (doc as any).autoTable({
    head: [['Studente', 'Email', 'Azienda', 'Presente', 'Ore', 'Frequenza']],
    body: tableData,
    startY: yPosition,
    margin: margin,
    theme: 'grid',
    headerStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Riepilogo
  doc.setFontSize(10);
  doc.text(`Presenti: ${data.students.filter(s => s.present).length}/${data.students.length}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Ore totali: ${data.totalHours}/${data.totalSessionHours}h`, margin, yPosition);
  yPosition += 5;
  const frequencyPercent = data.totalSessionHours > 0 ? Math.round((data.totalHours / data.totalSessionHours) * 100) : 0;
  doc.text(`Frequenza media: ${frequencyPercent}%`, margin, yPosition);
  yPosition += 10;

  // Firma
  doc.setFontSize(9);
  doc.text('Firma Docente: ___________________', margin, yPosition);
  yPosition += 5;
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, margin, yPosition);

  // Salva il PDF
  const filename = `Registro_Presenze_${data.courseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export const exportAttendanceExcel = async (data: ExportData) => {
  const { default: XLSX } = await import('xlsx');

  const wsData = [
    ['REGISTRO PRESENZE'],
    [],
    ['Corso:', data.courseName],
    ['Edizione:', data.editionDate],
    ['Sessione:', data.sessionInfo],
    ['Docente:', data.instructor],
    ['Luogo:', data.location],
    [],
    ['Studente', 'Email', 'Azienda', 'Presente', 'Ore', 'Frequenza %'],
    ...data.students.map(s => [
      `${s.firstName} ${s.lastName}`,
      s.email,
      s.companyName,
      s.present ? 'Sì' : 'No',
      `${s.hoursAttended}/${s.sessionHours}`,
      `${Math.round((s.hoursAttended / s.sessionHours) * 100)}%`
    ]),
    [],
    ['Riepilogo'],
    ['Presenti:', `${data.students.filter(s => s.present).length}/${data.students.length}`],
    ['Ore totali:', `${data.totalHours}/${data.totalSessionHours}`],
    ['Frequenza media:', `${data.totalSessionHours > 0 ? Math.round((data.totalHours / data.totalSessionHours) * 100) : 0}%`]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Presenze');

  const filename = `Registro_Presenze_${data.courseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};
