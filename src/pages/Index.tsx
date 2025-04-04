
import React, { useState, useCallback } from 'react';
import { CheckCircle, Download, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DragDropZone from '@/components/DragDropZone';
import ProcessingStatus, { ProcessingStep } from '@/components/ProcessingStatus';
import TablePreview from '@/components/TablePreview';
import { loadPdfDocument, extractTablesFromPdf } from '@/utils/pdfProcessing';
import { downloadExcel } from '@/utils/excelGeneration';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'upload', title: 'Upload PDF', status: 'pending' },
    { id: 'process', title: 'Process PDF & Detect Tables', status: 'pending' },
    { id: 'extract', title: 'Extract Table Data', status: 'pending' },
  ]);
  const [tables, setTables] = useState<Array<Array<Array<string>>>>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  // Update a step's status
  const updateStepStatus = useCallback((stepId: string, status: ProcessingStep['status'], message?: string) => {
    setSteps(prevSteps => prevSteps.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setTables([]);
    setIsProcessing(true);
    
    // Reset steps
    setSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'pending', message: undefined })));
    
    // Mark upload step as completed
    updateStepStatus('upload', 'completed', `${selectedFile.name} uploaded (${(selectedFile.size / 1024).toFixed(1)} KB)`);
    
    try {
      // Process the PDF
      updateStepStatus('process', 'processing');
      
      // Load PDF document
      const pdf = await loadPdfDocument(selectedFile);
      
      // Extract tables
      const extractedTables = await extractTablesFromPdf(pdf);
      
      if (extractedTables.length === 0) {
        updateStepStatus('process', 'error', 'No tables detected in this PDF.');
        setIsProcessing(false);
        return;
      }
      
      updateStepStatus('process', 'completed', `${extractedTables.length} tables detected`);
      
      // Extract data
      updateStepStatus('extract', 'processing');
      
      // In a real implementation, more complex extraction would happen here
      // For now, we'll just use the tables we've already extracted
      setTables(extractedTables);
      
      updateStepStatus('extract', 'completed', `Extracted ${extractedTables.reduce((acc, table) => acc + table.length, 0)} rows of data`);
      setIsProcessing(false);
      
      toast({
        title: "Tables extracted successfully",
        description: `Found ${extractedTables.length} tables in the document`,
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      updateStepStatus('process', 'error', 'Error processing PDF. Please try a different file.');
      setIsProcessing(false);
      
      toast({
        title: "Error processing PDF",
        description: "Please make sure you've uploaded a valid PDF file.",
        variant: "destructive"
      });
    }
  }, [updateStepStatus, toast]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (tables.length > 0) {
      downloadExcel(tables, file ? file.name.replace('.pdf', '') : 'extracted-tables');
      
      toast({
        title: "Excel file downloaded",
        description: "Tables have been saved as an Excel file.",
      });
    }
  }, [tables, file, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Table className="h-6 w-6 text-brand-500" />
              <h1 className="text-xl font-bold text-gray-900">PDF Table Wizard</h1>
            </div>
            <a 
              href="https://github.com/your-username/pdf-table-wizard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-brand-500"
            >
              About
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Extract Tables from PDFs to Excel</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your system-generated PDF with tables, and we'll extract the data directly to an Excel spreadsheet.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Process */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>
                  Drag and drop or select a PDF file containing tables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                
                {file && (
                  <div className="mt-6">
                    <ProcessingStatus steps={steps} />
                  </div>
                )}
              </CardContent>
            </Card>
            
            {tables.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Table Preview</CardTitle>
                  <CardDescription>
                    Preview and select tables detected in your PDF
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TablePreview 
                    tables={tables} 
                    selectedTableIndex={selectedTableIndex}
                    onTableSelect={setSelectedTableIndex}
                  />
                  
                  <Button 
                    className="mt-6 w-full" 
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Excel File
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Right Column - Features & Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
                <CardDescription>
                  Our advanced table extraction capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Tables With Borders</h3>
                      <p className="text-sm text-gray-500">Precisely extracts tables with clearly defined borders</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Tables Without Borders</h3>
                      <p className="text-sm text-gray-500">Detects tables arranged by whitespace and alignment</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Irregular Tables</h3>
                      <p className="text-sm text-gray-500">Handles non-standard and complex table structures</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Multi-Page Support</h3>
                      <p className="text-sm text-gray-500">Extracts tables from all pages of your document</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="bg-green-100 p-1 rounded-full mr-3 mt-0.5">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Export to Excel</h3>
                      <p className="text-sm text-gray-500">Download tables in Excel format with each table on a separate sheet</p>
                    </div>
                  </li>
                </ul>
                
                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">How It Works</h3>
                  <p className="text-sm text-gray-500">
                    Our tool analyzes the structure and layout of your PDF to detect table-like patterns. 
                    It identifies rows and columns based on text positioning without 
                    converting to images or relying on OCR, making it perfect for system-generated PDFs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto py-6 px-4">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PDF Table Wizard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
