
import * as PDFJS from 'pdfjs-dist';

// Initialize PDF.js worker
PDFJS.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;

interface TextItemWithLocation {
  transform: number[];
  width: number;
  height: number;
  str: string;
}

// Function to load a PDF file
export async function loadPdfDocument(file: File): Promise<PDFJS.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return PDFJS.getDocument({ data: arrayBuffer }).promise;
}

// Function to extract table-like structures from a PDF page
export async function extractTablesFromPage(page: PDFJS.PDFPageProxy): Promise<Array<Array<Array<string>>>> {
  const textContent = await page.getTextContent();
  const items = textContent.items as TextItemWithLocation[];
  
  // Sort items by y-position (vertical) to group by rows
  const sortedItems = [...items].sort((a, b) => {
    // PDF coordinates start from bottom-left, so we invert the y-axis
    return b.transform[5] - a.transform[5];
  });
  
  // Group items by row based on their y-position
  const rows: TextItemWithLocation[][] = [];
  let currentRow: TextItemWithLocation[] = [];
  let currentY = sortedItems.length > 0 ? sortedItems[0].transform[5] : 0;
  
  for (const item of sortedItems) {
    // If the item's y-position is significantly different from the current row,
    // start a new row (tolerance for slight variations in text alignment)
    if (Math.abs(item.transform[5] - currentY) > 5) {
      if (currentRow.length > 0) {
        rows.push([...currentRow]);
        currentRow = [];
      }
      currentY = item.transform[5];
    }
    currentRow.push(item);
  }
  
  // Add the last row if it exists
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  // Detect tables by looking for row patterns
  const tables: Array<Array<Array<string>>> = [];
  let currentTable: Array<Array<string>> = [];
  let inTable = false;
  
  // Minimum number of columns to consider a row as part of a table
  const MIN_COLUMNS_FOR_TABLE = 2;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Sort items in the row by x-position (horizontal)
    const sortedRow = [...row].sort((a, b) => a.transform[4] - b.transform[4]);
    
    // Extract text from each column
    const columns: string[] = sortedRow.map(item => item.str.trim());
    
    // Check if this row might be part of a table
    if (columns.length >= MIN_COLUMNS_FOR_TABLE) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(columns);
    } else {
      // If we were in a table and now we're not, save the table
      if (inTable && currentTable.length > 1) { // Require at least 2 rows for a table
        tables.push([...currentTable]);
        currentTable = [];
      }
      inTable = false;
    }
  }
  
  // Add the last table if it exists
  if (inTable && currentTable.length > 1) {
    tables.push(currentTable);
  }
  
  return tables;
}

// Function to extract tables from all pages of a PDF
export async function extractTablesFromPdf(pdf: PDFJS.PDFDocumentProxy): Promise<Array<Array<Array<string>>>> {
  const numPages = pdf.numPages;
  const allTables: Array<Array<Array<string>>> = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const tables = await extractTablesFromPage(page);
    allTables.push(...tables);
  }
  
  return allTables;
}
