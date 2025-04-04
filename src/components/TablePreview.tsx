
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
  const previewRows = selectedTable.slice(0, 10);
  
  // Determine max columns across all rows to handle irregular tables
  const maxCols = Math.max(...previewRows.map(row => row.length));

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
                <TableHead key={colIndex} className="whitespace-nowrap">
                  Column {colIndex + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: maxCols }).map((_, colIndex) => (
                  <TableCell key={colIndex} className="overflow-hidden text-ellipsis">
                    {row[colIndex] || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {selectedTable.length > 10 && (
          <div className="p-2 text-center text-sm text-gray-500 bg-gray-50 border-t">
            {selectedTable.length - 10} more rows (not shown in preview)
          </div>
        )}
      </div>
    </div>
  );
};

export default TablePreview;
