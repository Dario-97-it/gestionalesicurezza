import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Esporta dati in formato CSV
 */
export const exportToCSV = (data: any[], filename: string, columns?: string[]) => {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  // Se non specificati, usa le chiavi del primo oggetto
  const cols = columns || Object.keys(data[0]);
  
  // Crea header
  let csv = cols.join(',') + '\n';
  
  // Aggiungi dati
  data.forEach(row => {
    const values = cols.map(col => {
      const value = row[col];
      // Escape quotes e newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csv += values.join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Esporta dati in formato Excel
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Esporta dati in formato PDF con tabella
 */
export const exportToPDF = (
  data: any[],
  filename: string,
  columns: { key: string; label: string }[],
  title?: string
) => {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  const doc = new jsPDF();
  
  // Aggiungi titolo
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  // Prepara dati per la tabella
  const tableData = data.map(row =>
    columns.map(col => row[col.key] || '')
  );

  // Aggiungi tabella
  autoTable(doc, {
    head: [columns.map(col => col.label)],
    body: tableData,
    startY: title ? 25 : 10,
    margin: 10,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Download
  doc.save(`${filename}.pdf`);
};

/**
 * Genera template Excel per import
 */
export const generateExcelTemplate = (filename: string, columns: { key: string; label: string }[]) => {
  const worksheet = XLSX.utils.aoa_to_sheet([columns.map(col => col.label)]);
  
  // Imposta larghezza colonne
  worksheet['!cols'] = columns.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, `${filename}_template.xlsx`);
};

/**
 * Leggi file Excel e converti in array di oggetti
 */
export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
};
