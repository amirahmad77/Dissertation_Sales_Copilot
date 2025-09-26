import { Lead, useLeadStore } from '@/store/useLeadStore';
import { cn } from '@/lib/utils';
import { Building2, MapPin, Phone, Star, Clock, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragDisabled?: boolean;
}

export function LeadCard({ lead, onClick, isDragDisabled = false }: LeadCardProps) {
  const { updateLeadStatus } = useLeadStore();
  const { toast } = useToast();

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'Restaurant':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Retail':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Services':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium': 
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Awaiting Signature':
        return (
          <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200">
            <Clock className="w-3 h-3" />
            Awaiting Signature
          </div>
        );
      case 'Closed-Won':
        return (
          <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full border border-green-200">
            <CheckCircle className="w-3 h-3" />
            Deal Closed
          </div>
        );
      default:
        return null;
    }
  };

  const handleSimulateSignature = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    updateLeadStatus(lead.id, 'Closed-Won');
    toast({
      title: "Contract Signed! 🎉",
      description: `Congratulations! ${lead.companyName} has signed the contract.`,
    });
  };

  const handleSimulateRejection = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    updateLeadStatus(lead.id, 'Contacted'); // Move back to previous status
    toast({
      title: "Contract Rejected",
      description: `${lead.companyName} has rejected the contract. Consider revising the proposal.`,
      variant: "destructive"
    });
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-4 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:bg-card-hover",
        !isDragDisabled && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-card-foreground text-sm truncate">{lead.companyName}</h3>
        </div>
        {lead.priority && (
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>
            {lead.priority}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-full border",
            getBusinessTypeColor(lead.businessType)
          )}
        >
          {lead.businessType}
        </span>
        {lead.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{lead.rating}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{lead.address}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border">
        {/* Status Badge for special states */}
        {(lead.status === 'Awaiting Signature' || lead.status === 'Closed-Won') && (
          <div className="mb-3">
            {getStatusBadge(lead.status)}
          </div>
        )}

        {/* Simulation Buttons - Only visible for Awaiting Signature */}
        {lead.status === 'Awaiting Signature' && (
          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSimulateSignature}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Simulate Signature
            </Button>
            <Button
              size="sm" 
              variant="destructive"
              className="flex-1"
              onClick={handleSimulateRejection}
            >
              <X className="w-3 h-3 mr-1" />
              Simulate Rejection
            </Button>
          </div>
        )}

        {/* Package and Value */}
        <div className="flex items-center justify-between">
          {lead.package && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {lead.package.replace(' Package', '')}
            </span>
          )}
          {lead.value && (
            <span className="text-sm font-medium text-foreground">
              ${(lead.value / 1000).toFixed(0)}K
            </span>
          )}
        </div>
      </div>
    </div>
  );
}