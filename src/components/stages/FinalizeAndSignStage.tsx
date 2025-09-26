import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Building2, 
  Package, 
  Calculator,
  Info,
  Star,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Lead, useLeadStore } from '@/store/useLeadStore';
import { supabase } from '@/integrations/supabase/client';

interface FinalizeAndSignStageProps {
  lead: Lead;
  onMarkComplete: () => void;
}

export function FinalizeAndSignStage({ lead, onMarkComplete }: FinalizeAndSignStageProps) {
  const { toast } = useToast();
  const { updateLeadStatus } = useLeadStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const primaryContact = lead.contacts.find(contact => contact.role === 'Primary');
  const getDateRangeLabel = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate && !endDate) return null;
    if (startDate && endDate) return `Active: ${startDate} to ${endDate}`;
    if (startDate) return `Active from ${startDate}`;
    return `Active until ${endDate}`;
  };

  const handleGenerateAndSend = async () => {
    if (!lead.packageConfiguration) {
      toast({
        title: "Package Configuration Missing",
        description: "Package configuration is required to generate the contract.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const commissionsWithDates = lead.packageConfiguration.commissions.map((commission) => ({
        ...commission,
        startDate: commission.startDate ?? null,
        endDate: commission.endDate ?? null
      }));

      const chargesWithDates = lead.packageConfiguration.additionalCharges.map((charge) => ({
        ...charge,
        startDate: charge.startDate ?? null,
        endDate: charge.endDate ?? null
      }));

      // Prepare contract data based on the edge function's expected format
      const contractData = {
        lead: {
          companyName: lead.companyName,
          contactName: primaryContact?.name || lead.contactName,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          businessType: lead.businessType
        },
        packageConfiguration: {
          selectedTariff: {
            name: lead.packageConfiguration.tariffId, // This will be enhanced
            type: "Platform Delivery", // Default for now
            commission: 15 // Default for now
          },
          commissions: commissionsWithDates,
          additionalCharges: chargesWithDates,
          assets: lead.packageConfiguration.assets,
          totalValue: lead.packageConfiguration.additionalCharges.reduce((sum, charge) => sum + charge.price, 0) +
                      lead.packageConfiguration.assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0),
          estimatedCommission: lead.packageConfiguration.commissions.reduce((sum, commission) =>
            sum + (commission.percentage / 100 * 1000), 0), // Rough estimate
          deliveryModel: "Platform Delivery", // This should come from filters
          expectedDailyOrders: 30 // This should come from filters
        },
        legalData: lead.extractedData?.cr || {},
        menuStructure: lead.menu || {},
        metadata: {
          generatedAt: new Date().toISOString(),
          contractVersion: "1.0"
        }
      };

      console.log('Sending contract data:', contractData);

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: { contractData }
      });

      if (error) {
        throw error;
      }

      console.log('Contract email response:', data);

      // Update lead status to "Awaiting Signature"
      updateLeadStatus(lead.id, 'Awaiting Signature');

      toast({
        title: "Contract Generated & Sent!",
        description: `Partnership contract has been sent to ${lead.email}`,
      });

      // Mark stage as complete
      onMarkComplete();

    } catch (error: any) {
      console.error('Error generating contract:', error);
      toast({
        title: "Failed to Generate Contract",
        description: error.message || "An error occurred while generating the contract.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lead.packageConfiguration) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Package Configuration Required</h3>
          <p className="text-muted-foreground">
            Complete the Package Builder stage first to proceed with contract finalization.
          </p>
        </div>
      </div>
    );
  }

  const packageConfig = lead.packageConfiguration;
  const totalOneTimeFees = packageConfig.additionalCharges.reduce((sum, charge) => sum + charge.price, 0) +
                          packageConfig.assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
  const totalCommissionRate = packageConfig.commissions.reduce((sum, commission) => sum + commission.percentage, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Finalize & Sign Contract
        </h2>
        <p className="text-muted-foreground">
          Review the complete partnership agreement and send for signature
        </p>
      </div>

      {/* Lead Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{lead.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{lead.phone}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{lead.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{lead.address}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">{lead.businessType}</Badge>
            <Badge variant="outline">{lead.priority} Priority</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Package Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Package Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Commissions */}
          {packageConfig.commissions.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Commission Structure</h4>
              <div className="space-y-2">
                {packageConfig.commissions.map((commission) => (
                  <div key={commission.id} className="p-2 bg-muted/50 rounded space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{commission.name}</span>
                      <Badge variant="secondary">{commission.percentage}%</Badge>
                    </div>
                    {(commission.serviceType || getDateRangeLabel(commission.startDate, commission.endDate)) && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{commission.serviceType}</span>
                        {getDateRangeLabel(commission.startDate, commission.endDate) && (
                          <span>{getDateRangeLabel(commission.startDate, commission.endDate)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Charges */}
          {packageConfig.additionalCharges.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Additional Charges</h4>
              <div className="space-y-2">
                {packageConfig.additionalCharges.map((charge) => (
                  <div key={charge.id} className="p-2 bg-muted/50 rounded space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{charge.name}</span>
                      <span className="font-medium">{charge.price} SAR</span>
                    </div>
                    {(charge.type || getDateRangeLabel(charge.startDate, charge.endDate)) && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{charge.type}</span>
                        {getDateRangeLabel(charge.startDate, charge.endDate) && (
                          <span>{getDateRangeLabel(charge.startDate, charge.endDate)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Assets */}
          {packageConfig.assets.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Business Assets</h4>
              <div className="space-y-2">
                {packageConfig.assets.map((asset) => (
                  <div key={asset.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <div>
                      <span className="text-sm">{asset.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">Qty: {asset.quantity}</span>
                    </div>
                    <span className="font-medium">{asset.price * asset.quantity} SAR</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Package Totals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-medium">Total One-Time Investment</span>
              </div>
              <span className="text-xl font-bold text-primary">{totalOneTimeFees.toLocaleString()} SAR</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-green-600" />
                <span className="font-medium">Total Commission Rate</span>
              </div>
              <span className="text-xl font-bold text-green-600">{totalCommissionRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ready to Finalize</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-blue-800 font-medium">What happens next?</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• A professional contract will be generated with all the configured details</li>
                  <li>• The contract will be sent to {lead.email} for digital signature</li>
                  <li>• The lead status will be updated to "Awaiting Signature"</li>
                  <li>• You'll be able to track signature status from the main dashboard</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleGenerateAndSend}
              disabled={isGenerating}
              className="bg-gradient-primary hover:opacity-90"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Contract...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate & Send for Signature
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}