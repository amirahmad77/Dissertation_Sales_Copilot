import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Bug, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lead, ActivationStage } from '@/store/useLeadStore';

interface DebugPanelProps {
  lead: Lead;
  isStageComplete: (leadId: string, stage: ActivationStage) => boolean;
  canAccessStage: (leadId: string, stage: ActivationStage) => boolean;
}

export function DebugPanel({ lead, isStageComplete, canAccessStage }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const stages: ActivationStage[] = ['vendor-profile', 'legal-identity', 'storefront-menu', 'package-builder', 'finalize-sign'];
  
  const documentTypes = ['cr', 'iban', 'logo', 'coverPhoto', 'storePhoto', 'menu'] as const;
  
  return (
    <Card className="mt-6 border-dashed border-2 border-muted">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                Debug Information
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "transform rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 text-sm">
            {/* Current State */}
            <div>
              <h4 className="font-medium mb-2">Current State</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>Current Stage: <Badge variant="outline">{lead.currentStage}</Badge></div>
                <div>Lead Status: <Badge variant="outline">{lead.status}</Badge></div>
              </div>
            </div>

            {/* Stage Completion Status */}
            <div>
              <h4 className="font-medium mb-2">Stage Status</h4>
              <div className="space-y-1">
                {stages.map(stage => {
                  const complete = isStageComplete(lead.id, stage);
                  const canAccess = canAccessStage(lead.id, stage);
                  const status = lead.stageStatus[stage];
                  
                  return (
                    <div key={stage} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2">
                        {complete ? (
                          <CheckCircle className="h-3 w-3 text-success" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "text-xs",
                          lead.currentStage === stage && "font-medium text-primary"
                        )}>
                          {stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {status}
                        </Badge>
                        <Badge 
                          variant={canAccess ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {canAccess ? 'Accessible' : 'Locked'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Status */}
            <div>
              <h4 className="font-medium mb-2">Document Status</h4>
              <div className="grid grid-cols-2 gap-1">
                {documentTypes.map(docType => (
                  <div key={docType} className="flex items-center justify-between text-xs p-1 rounded bg-muted/20">
                    <span className="capitalize">{docType}:</span>
                    <Badge 
                      variant={lead.documents[docType] === 'Verified' ? 'default' : 'secondary'}
                      className="text-xs px-1 py-0"
                    >
                      {lead.documents[docType] || 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu Info */}
            {lead.menu && Object.keys(lead.menu).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Menu Information</h4>
                <div className="text-xs space-y-1">
                  <div>Categories: {Object.keys(lead.menu).length}</div>
                  <div>Total Items: {Object.values(lead.menu).flat().length}</div>
                  <div>Items with Descriptions: {Object.values(lead.menu).flat().filter(item => item.description).length}</div>
                  <div>Items with Photos: {Object.values(lead.menu).flat().filter(item => item.hasPhoto || item.photoUrl).length}</div>
                </div>
              </div>
            )}

            {/* Raw Data Toggle */}
            <details className="border rounded p-2 bg-muted/20">
              <summary className="cursor-pointer text-xs font-medium mb-2">Raw Lead Data</summary>
              <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(lead, null, 2)}
              </pre>
            </details>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}