
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
    .replace(/□/g, ' ');
  
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
  return mostCommonDiff * 0.5;
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
  
  // Detect tables by looking for row patterns
  const tables: Array<Array<Array<string>>> = [];
  let currentTable: Array<Array<string>> = [];
  let inTable = false;
  
  // Minimum number of columns to consider a row as part of a table
  const MIN_COLUMNS_FOR_TABLE = 2;
  
  // Function to detect column boundaries from all rows
  function detectColumns(rows: TextItemWithLocation[][]): number[] {
    // Flatten all x coordinates
    const allXCoords: number[] = [];
    rows.forEach(row => {
      row.forEach(item => {
        // Start and end positions of the text item
        allXCoords.push(item.transform[4]);
        allXCoords.push(item.transform[4] + item.width);
      });
    });
    
    // Sort and deduplicate coordinates
    const uniqueXCoords = [...new Set(allXCoords.sort((a, b) => a - b))];
    
    // Find clusters of coordinates that are close to each other
    const columnBoundaries: number[] = [];
    let currentCluster: number[] = [uniqueXCoords[0]];
    
    for (let i = 1; i < uniqueXCoords.length; i++) {
      const diff = uniqueXCoords[i] - uniqueXCoords[i-1];
      if (diff > 10) { // If gap is significant, it's a new column
        // Add average of cluster as column boundary
        columnBoundaries.push(currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length);
        currentCluster = [];
      }
      currentCluster.push(uniqueXCoords[i]);
    }
    
    // Add the last cluster
    if (currentCluster.length > 0) {
      columnBoundaries.push(currentCluster.reduce((sum, val) => sum + val, 0) / currentCluster.length);
    }
    
    return columnBoundaries;
  }
  
  // Find potential table rows (rows with multiple items)
  const potentialTableRows = rows.filter(row => row.length >= MIN_COLUMNS_FOR_TABLE);
  
  // If we have enough rows to form a table
  if (potentialTableRows.length >= 2) {
    // Detect column boundaries based on all potential table rows
    const columnBoundaries = detectColumns(potentialTableRows);
    
    // Process all rows to create a structured table
    for (const row of rows) {
      // Create an array to represent cells in this row
      const cells: string[] = new Array(columnBoundaries.length).fill('');
      
      // Place each text item in the appropriate cell
      for (const item of row) {
        const itemX = item.transform[4];
        // Find which column this item belongs to
        let columnIndex = 0;
        
        while (columnIndex < columnBoundaries.length - 1 && 
               itemX >= (columnBoundaries[columnIndex] + columnBoundaries[columnIndex + 1]) / 2) {
          columnIndex++;
        }
        
        // Add text to the correct cell (append if cell already has content)
        cells[columnIndex] = cells[columnIndex] 
          ? cells[columnIndex] + ' ' + item.str
          : item.str;
      }
      
      // Trim whitespace from cell values
      const processedCells = cells.map(cell => cell.trim());
      
      // If row has content, add it to the current table
      if (processedCells.some(cell => cell !== '')) {
        if (!inTable) {
          inTable = true;
          currentTable = [];
        }
        currentTable.push(processedCells);
      } else if (inTable && currentTable.length > 0) {
        // Empty row after table content - could be a table separator
        // Add the current table to our collection if it has multiple rows
        if (currentTable.length >= 2) {
          tables.push([...currentTable]);
        }
        currentTable = [];
        inTable = false;
      }
    }
    
    // Add the last table if it exists
    if (inTable && currentTable.length >= 2) {
      tables.push(currentTable);
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
