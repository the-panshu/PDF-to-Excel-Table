
import * as PDFJS from 'pdfjs-dist';

// Initialize PDF.js worker
PDFJS.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;

interface TextItemWithLocation {
  transform: number[];
  width: number;
  height: number;
  str: string;
  fontName?: string;
}

// Function to load a PDF file
export async function loadPdfDocument(file: File): Promise<PDFJS.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return PDFJS.getDocument({ data: arrayBuffer }).promise;
}

// Function to normalize text from PDF
function normalizeText(text: string): string {
  // Replace various Unicode space characters with standard spaces
  const normalizedText = text
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Remove control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Handle special characters that might appear as boxes
    .replace(/□/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ');
  
  return normalizedText.trim();
}

// Calculate the vertical distance between rows to determine rows in the same group
function calculateRowGrouping(items: TextItemWithLocation[]): number {
  if (items.length <= 1) return 5; // Default tolerance
  
  // Sort by y-position
  const sortedY = [...items].map(item => item.transform[5]).sort((a, b) => a - b);
  
  // Calculate differences between consecutive y-positions
  const differences: number[] = [];
  for (let i = 1; i < sortedY.length; i++) {
    const diff = Math.abs(sortedY[i] - sortedY[i-1]);
    if (diff > 1) { // Ignore tiny differences
      differences.push(diff);
    }
  }
  
  // Find the most common difference using a simple histogram
  const histogram: Record<number, number> = {};
  let maxCount = 0;
  let mostCommonDiff = 5; // Default
  
  differences.forEach(diff => {
    // Round to nearest integer to group similar differences
    const roundedDiff = Math.round(diff);
    histogram[roundedDiff] = (histogram[roundedDiff] || 0) + 1;
    
    if (histogram[roundedDiff] > maxCount) {
      maxCount = histogram[roundedDiff];
      mostCommonDiff = roundedDiff;
    }
  });
  
  // Use the most common difference as a basis for row grouping with some tolerance
  return mostCommonDiff * 0.6;
}

// Function to detect if a row is likely a header row
function isLikelyHeaderRow(row: TextItemWithLocation[], allRows: TextItemWithLocation[][]): boolean {
  // Check if it's the first row
  if (allRows.indexOf(row) === 0) return true;
  
  // Check if font is different/bold (some PDFs mark headers with different fonts)
  const fontInfo = row.map(item => item.fontName || '');
  const containsBold = fontInfo.some(font => font.toLowerCase().includes('bold'));
  
  // Check if this row is followed by data rows with similar column structure
  const rowIndex = allRows.indexOf(row);
  if (rowIndex >= 0 && rowIndex < allRows.length - 1) {
    const nextRow = allRows[rowIndex + 1];
    
    // If next row has more cells or different structure, this might be a header
    if (nextRow && Math.abs(row.length - nextRow.length) <= 1) {
      const rowXPositions = row.map(item => item.transform[4]);
      const nextRowXPositions = nextRow.map(item => item.transform[4]);
      
      // Check if X positions align (columns align)
      let matching = 0;
      for (const xPos of rowXPositions) {
        if (nextRowXPositions.some(nextX => Math.abs(xPos - nextX) < 10)) {
          matching++;
        }
      }
      
      // If most positions match, this is likely not a header but part of the data
      if (matching >= Math.min(row.length, nextRow.length) * 0.7) {
        return false;
      }
    }
  }
  
  return containsBold || rowIndex === 0;
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
  
  // Calculate the optimal vertical tolerance for grouping rows
  const verticalTolerance = calculateRowGrouping(sortedItems);
  
  // Group items by row based on their y-position
  const rows: TextItemWithLocation[][] = [];
  let currentRow: TextItemWithLocation[] = [];
  let currentY = sortedItems.length > 0 ? sortedItems[0].transform[5] : 0;
  
  for (const item of sortedItems) {
    // Normalize the text to handle encoding issues
    item.str = normalizeText(item.str);
    
    // Skip empty items
    if (!item.str.trim()) continue;
    
    // If the item's y-position is significantly different from the current row,
    // start a new row (using calculated tolerance for variations in text alignment)
    if (Math.abs(item.transform[5] - currentY) > verticalTolerance) {
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

  // For each row, sort items by x-position (horizontal) to preserve column order
  for (let i = 0; i < rows.length; i++) {
    rows[i] = rows[i].sort((a, b) => a.transform[4] - b.transform[4]);
  }
  
  // Detect tables by looking for consistent column structures
  const tables: Array<Array<Array<string>>> = [];
  let currentTable: Array<Array<string>> = [];
  let inTable = false;
  let headerRow: TextItemWithLocation[] | null = null;
  
  // Minimum number of columns to consider a row as part of a table
  const MIN_COLUMNS_FOR_TABLE = 2;
  
  // Function to detect and align columns across rows
  function alignRowsToColumns(rows: TextItemWithLocation[][]): Array<Array<string>> {
    if (rows.length === 0) return [];
    
    // Identify the header row if it exists
    headerRow = null;
    for (let i = 0; i < Math.min(rows.length, 3); i++) { // Check first few rows
      if (isLikelyHeaderRow(rows[i], rows)) {
        headerRow = rows[i];
        break;
      }
    }
    
    // If no header was found, use the first row
    if (!headerRow && rows.length > 0) {
      headerRow = rows[0];
    }
    
    // Create column boundaries
    const columnPositions: number[] = [];
    if (headerRow) {
      // Use header positions as column boundaries
      headerRow.forEach(item => {
        columnPositions.push(item.transform[4] + (item.width / 2));
      });
    } else {
      // Identify column boundaries based on all rows
      const allXPositions: number[] = [];
      rows.forEach(row => {
        row.forEach(item => {
          allXPositions.push(item.transform[4]);
        });
      });
      
      // Sort and find clusters
      const sortedX = [...allXPositions].sort((a, b) => a - b);
      let prevX = -100; // Initial offset
      
      for (const x of sortedX) {
        if (x - prevX > 10) { // New column
          columnPositions.push(x);
          prevX = x;
        }
      }
    }

    // Now create a structured table with cells aligned to columns
    const alignedTable: Array<Array<string>> = [];
    
    rows.forEach(row => {
      const rowData: string[] = new Array(columnPositions.length).fill('');
      
      row.forEach(item => {
        // Find which column this item belongs to
        const itemCenter = item.transform[4] + (item.width / 2);
        let columnIndex = 0;
        
        // Find closest column
        let minDistance = Number.MAX_VALUE;
        for (let i = 0; i < columnPositions.length; i++) {
          const distance = Math.abs(itemCenter - columnPositions[i]);
          if (distance < minDistance) {
            minDistance = distance;
            columnIndex = i;
          }
        }
        
        // Ensure we don't exceed column bounds
        columnIndex = Math.min(columnIndex, columnPositions.length - 1);
        
        // Add text to the corresponding column
        if (rowData[columnIndex]) {
          rowData[columnIndex] += ' ' + item.str;
        } else {
          rowData[columnIndex] = item.str;
        }
      });
      
      // Clean up row data
      const cleanedRow = rowData.map(cell => cell.trim()).filter(cell => cell !== '');
      
      if (cleanedRow.length > 0) {
        alignedTable.push(cleanedRow);
      }
    });
    
    return alignedTable;
  }
  
  // Find potential table rows (rows with multiple items)
  const potentialTableRows = rows.filter(row => row.length >= MIN_COLUMNS_FOR_TABLE);
  
  // If we have enough rows to form a table
  if (potentialTableRows.length >= 2) {
    // Process the rows to get aligned table
    const structuredTable = alignRowsToColumns(potentialTableRows);
    
    if (structuredTable.length >= 2) { // Need at least header + one data row
      tables.push(structuredTable);
    }
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
