
import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProcessingStep = {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
};

interface ProcessingStatusProps {
  steps: ProcessingStep[];
  className?: string;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ steps, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {step.status === 'pending' && (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
            {step.status === 'processing' && (
              <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
            )}
            {step.status === 'completed' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'error' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="flex-grow">
            <p className={cn(
              "font-medium", 
              step.status === 'completed' && "text-green-700",
              step.status === 'error' && "text-red-700",
              step.status === 'processing' && "text-brand-700"
            )}>
              {step.title}
            </p>
            {step.message && (
              <p className="text-sm text-gray-500 mt-0.5">{step.message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProcessingStatus;
