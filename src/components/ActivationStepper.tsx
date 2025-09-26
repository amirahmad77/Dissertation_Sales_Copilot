import { CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ActivationStage, type StageStatus } from '@/store/useLeadStore';

interface Step {
  id: ActivationStage;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    id: 'vendor-profile',
    title: 'Vendor Profile',
    description: 'Complete business information and opening hours'
  },
  {
    id: 'legal-identity',
    title: 'Legal & Identity',
    description: 'Upload and verify legal documents'
  },
  {
    id: 'storefront-menu',
    title: 'Storefront & Menu',
    description: 'Add branding assets and complete menu'
  },
  {
    id: 'package-builder',
    title: 'Package Builder',
    description: 'Configure service package and pricing'
  },
  {
    id: 'finalize-sign',
    title: 'Finalize & Sign',
    description: 'Review and send for e-signature'
  }
];

interface ActivationStepperProps {
  currentStage: ActivationStage;
  stageStatus: { [K in ActivationStage]: StageStatus };
  onStageClick: (stage: ActivationStage) => void;
  canAccessStage: (stage: ActivationStage) => boolean;
  isStageComplete: (stage: ActivationStage) => boolean;
}

const getStageIcon = (
  stage: ActivationStage,
  status: StageStatus,
  isComplete: boolean,
  isCurrent: boolean
) => {
  if (isComplete) {
    return <CheckCircle className="h-5 w-5 text-success" />;
  }
  
  if (status === 'needs-review') {
    return <AlertCircle className="h-5 w-5 text-warning" />;
  }
  
  if (isCurrent || status === 'in-progress') {
    return <Clock className="h-5 w-5 text-primary" />;
  }
  
  return <Circle className="h-5 w-5 text-muted-foreground" />;
};

export function ActivationStepper({
  currentStage,
  stageStatus,
  onStageClick,
  canAccessStage,
  isStageComplete
}: ActivationStepperProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const isCurrent = currentStage === step.id;
        const status = stageStatus[step.id];
        const isComplete = isStageComplete(step.id);
        const canAccess = canAccessStage(step.id);
        const isConnected = index < steps.length - 1;

        return (
          <div key={step.id} className="relative">
            <button
              onClick={() => canAccess && onStageClick(step.id)}
              disabled={!canAccess}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                "hover:bg-card-hover",
                isCurrent && "bg-primary/5 border border-primary/20",
                !canAccess && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStageIcon(step.id, status, isComplete, isCurrent)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium text-sm",
                  isCurrent ? "text-primary" : "text-foreground"
                )}>
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                {isComplete && (
                  <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">
                    Completed
                  </span>
                )}
                {status === 'in-progress' && !isComplete && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    In Progress
                  </span>
                )}
                {status === 'needs-review' && (
                  <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-1 rounded">
                    Needs Review
                  </span>
                )}
              </div>
            </button>
            
            {/* Connection line */}
            {isConnected && (
              <div className="ml-8 h-4 w-px bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}