
import * as XLSX from 'xlsx';

// Function to convert 2D array to Excel worksheet
export function createWorksheet(data: Array<Array<string>>): XLSX.WorkSheet {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Style all cells 
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  // Apply column widths
  const cols: XLSX.ColInfo[] = [];
  for (let i = range.s.c; i <= range.e.c; i++) {
    cols[i] = { width: 15 }; // Default width
  }
  worksheet['!cols'] = cols;
  
  return worksheet;
}

// Function to generate Excel file from multiple tables
export function generateExcelFile(tables: Array<Array<Array<string>>>): Blob {
  const workbook = XLSX.utils.book_new();
  
  tables.forEach((table, index) => {
    const worksheet = createWorksheet(table);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Table ${index + 1}`);
  });
  
  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Convert array buffer to Blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Function to download Excel file
export function downloadExcel(tables: Array<Array<Array<string>>>, fileName: string = 'extracted-tables') {
  const excelBlob = generateExcelFile(tables);
  
  // Create download link
  const url = URL.createObjectURL(excelBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
