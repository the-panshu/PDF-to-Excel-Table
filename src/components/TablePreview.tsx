
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TablePreviewProps {
  tables: Array<Array<Array<string>>>;
  selectedTableIndex: number;
  onTableSelect: (index: number) => void;
}

const TablePreview: React.FC<TablePreviewProps> = ({ 
  tables, 
  selectedTableIndex, 
  onTableSelect 
}) => {
  if (tables.length === 0) return null;
  
  // Show a preview of the selected table (limit to 10 rows for preview)
  const selectedTable = tables[selectedTableIndex];
  
  // Get header row (first row) and data rows
  const headerRow = selectedTable[0] || [];
  const dataRows = selectedTable.slice(1, 11); // Show up to 10 data rows in preview
  
  // Determine max columns across all rows to handle irregular tables
  const maxCols = Math.max(...selectedTable.map(row => row.length));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap">
        <h3 className="text-lg font-medium">Table Preview</h3>
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          {tables.map((_, index) => (
            <button
              key={index}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                index === selectedTableIndex
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => onTableSelect(index)}
            >
              Table {index + 1}
            </button>
          ))}
        </div>
      </div>
      
      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <TableHead 
                  key={colIndex} 
                  className="whitespace-nowrap font-semibold text-xs px-3 py-2 bg-gray-100"
                  title={headerRow[colIndex] || `Column ${colIndex + 1}`}
                >
                  {headerRow[colIndex] || `Column ${colIndex + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: maxCols }).map((_, colIndex) => (
                  <TableCell 
                    key={colIndex} 
                    className="text-xs p-2 max-w-[200px] overflow-hidden text-ellipsis"
                    title={row[colIndex] || ''}
                  >
                    {row[colIndex] || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {selectedTable.length > 11 && (
          <div className="p-2 text-center text-sm text-gray-500 bg-gray-50 border-t">
            {selectedTable.length - 11} more rows (not shown in preview)
          </div>
        )}
      </div>
    </div>
  );
};

export default TablePreview;
