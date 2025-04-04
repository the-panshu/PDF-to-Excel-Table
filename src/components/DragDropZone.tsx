
import React, { useState, useRef } from 'react';
import { Upload, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const DragDropZone: React.FC<DragDropZoneProps> = ({ onFileSelect, isProcessing }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
        isDragActive ? "drag-active" : "border-gray-300 hover:border-brand-400 hover:bg-gray-50",
        isProcessing ? "opacity-50 cursor-not-allowed" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isProcessing ? undefined : handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="bg-brand-100 p-4 rounded-full">
          <Upload className="h-10 w-10 text-brand-600" />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            Drag & Drop your PDF here or click to browse
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports tables with or without borders & irregular shapes
          </p>
        </div>
      </div>
    </div>
  );
};

export default DragDropZone;
