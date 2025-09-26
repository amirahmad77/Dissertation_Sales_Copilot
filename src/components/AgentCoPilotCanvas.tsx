import { useState } from 'react';
import { useLeadStore } from '@/store/useLeadStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivationStepper } from './ActivationStepper';
import { VendorProfileStage } from './stages/VendorProfileStage';
import { LegalIdentityStage } from './stages/LegalIdentityStage';
import { StorefrontMenuStage } from './stages/StorefrontMenuStage';
import { useToast } from '@/hooks/use-toast';
import { PackageBuilderStage } from './stages/PackageBuilderStage';
import { FinalizeAndSignStage } from './stages/FinalizeAndSignStage';
import { OCRService } from '@/services/OCRService';
import { OCRDocumentType } from '@/types/ocr';
import { type ActivationStage, type OpeningHours, type Contact, type BankDetails } from '@/store/useLeadStore';
import { PackageConfiguration } from '@/types/package';
import { DebugPanel } from './ui/debug-panel';

/**
 * AgentCoPilotCanvas renders the multi-stage onboarding workspace for the currently selected lead.
 * It wires lead data from the store into each stage component, coordinates stage transitions,
 * and manages document processing feedback so the team can complete activation end to end.
 */
export function AgentCoPilotCanvas() {
  const { 
    selectedLeadId, 
    setSelectedLeadId, 
    leads,
    updateOpeningHours,
    updateStageStatus,
    setCurrentStage,
    updateOfficialLegalName,
    updatePrimaryContact,
    updateContacts,
    updateDocumentStatus,
    updateExtractedData,
    updateBankDetails,
    updateLegalIdentifiers,
    updateCRNumber,
    updateMenu,
    updatePackageConfiguration,
    updateLeadValue,
    isStageComplete,
    canAccessStage,
    getActivationScore
  } = useLeadStore();
  
  const { toast } = useToast();
  const [processingStates, setProcessingStates] = useState<{ [key: string]: boolean }>({});

  const selectedLead = selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) : null;
  const isOpen = !!selectedLeadId && !!selectedLead;

  if (!selectedLead) return null;

  const getDocumentFriendlyName = (type: OCRDocumentType) => {
    switch (type) {
      case 'cr':
        return 'Commercial Registration document';
      case 'iban':
        return 'Bank IBAN letter';
      case 'menu':
        return 'Menu file';
      case 'logo':
        return 'Logo';
      case 'coverPhoto':
        return 'Cover photo';
      case 'storePhoto':
        return 'Storefront photo';
      default:
        return 'Document';
    }
  };

  /**
   * Closes the onboarding canvas and clears the selected lead.
   */
  const handleClose = () => {
    setSelectedLeadId(null);
  };

  /**
   * Attempts to navigate to the provided onboarding stage and blocks access when prerequisites
   * have not yet been satisfied.
   *
   * @param stage - The activation stage the user is trying to open.
   */
  const handleStageClick = (stage: ActivationStage) => {
    console.log(`[Onboarding] Attempting to access stage: ${stage}`);
    console.log(`[Onboarding] Can access stage: ${canAccessStage(selectedLead.id, stage)}`);
    console.log(`[Onboarding] Is stage complete: ${isStageComplete(selectedLead.id, stage)}`);
    
    if (canAccessStage(selectedLead.id, stage)) {
      console.log(`[Onboarding] Navigating to stage: ${stage}`);
      setCurrentStage(selectedLead.id, stage);
      // Update stage status to in-progress if it's pending
      if (selectedLead.stageStatus[stage] === 'pending') {
        updateStageStatus(selectedLead.id, stage, 'in-progress');
      }
    } else {
      console.warn(`[Onboarding] Access denied to stage: ${stage}`);
      toast({
        title: "Access Restricted",
        description: "Please complete previous stages first before accessing this stage.",
        variant: "destructive"
      });
    }
  };

  // File upload handler - Now using OCR Service
  /**
   * Uploads a document and processes it through the OCR service. Successful responses update
   * the store while failures provide actionable toast feedback.
   *
   * @param file - The uploaded file to evaluate.
   * @param documentType - The document identifier used to determine processing rules.
   */
  const handleFileUpload = async (file: File, documentType: OCRDocumentType) => {
    if (!file || !selectedLeadId) return;

    // Simple assets (logo, cover, store photo) don't need OCR – mark as verified immediately
    if (documentType === 'logo' || documentType === 'coverPhoto' || documentType === 'storePhoto') {
      updateDocumentStatus(selectedLeadId, documentType, 'Verified');
      toast({
        title: 'Asset Uploaded',
        description: `${documentType === 'logo' ? 'Logo' : documentType === 'coverPhoto' ? 'Cover Photo' : 'Storefront Photo'} verified successfully.`,
      });
      return;
    }

    setProcessingStates(prev => ({ ...prev, [documentType]: true }));
    updateDocumentStatus(selectedLeadId, documentType, "Processing...");

    try {
      const documentLabel = getDocumentFriendlyName(documentType);
      const result = await OCRService.processDocument(file, documentType, selectedLead?.companyName);

      if (!result.success) {
        updateDocumentStatus(selectedLeadId, documentType, "Needs Review");
        toast({
          title: "Processing Failed",
          description: result.error
            ? `${documentLabel} couldn't be processed: ${result.error}`
            : `${documentLabel} couldn't be processed. Please try again in a moment.`,
          variant: "destructive"
        });
        return;
      }

      if (!result.data) {
        updateDocumentStatus(selectedLeadId, documentType, "Needs Review");
        toast({
          title: "No Data Returned",
          description: `${documentLabel} didn't return any data. Please review the file or try another upload.`,
          variant: "destructive"
        });
        return;
      }

      if (documentType === 'cr' || documentType === 'iban') {
        updateExtractedData(selectedLeadId, documentType, result.data);
        updateDocumentStatus(selectedLeadId, documentType, "Verified");

        if (documentType === 'cr') {
          if (result.data.officialBusinessName) {
            updateOfficialLegalName(selectedLeadId, result.data.officialBusinessName);
          }
          if (result.data.crNumber) {
            updateCRNumber(selectedLeadId, result.data.crNumber);
          }
          updateLegalIdentifiers(selectedLeadId, {
            taxNumber: result.data.taxNumber ?? null,
            legalForm: result.data.legalForm ?? null
          });
        }

        if (documentType === 'iban') {
          updateBankDetails(selectedLeadId, {
            iban: result.data.ibanNumber ?? '',
            accountOwnerName: result.data.accountOwnerName ?? '',
            bankName: result.data.bankName ?? undefined,
            swiftCode: result.data.swiftCode ?? undefined
          });
        }

        toast({
          title: "Document Processed Successfully",
          description: `${documentType === 'cr' ? 'Commercial Registration' : 'Bank IBAN Letter'} has been analyzed and data extracted.`,
        });
      } else if (documentType === 'menu') {
        // Use updateMenu from the lead store to update menu data
        updateMenu(selectedLead.id, result.data);
        updateDocumentStatus(selectedLeadId, documentType, "Verified");
        toast({
          title: "Menu Processed Successfully",
          description: `Menu has been processed successfully. Found ${Object.keys(result.data).length} categories.`,
        });
      } else {
        updateDocumentStatus(selectedLeadId, documentType, "Verified");
        toast({
          title: "Document Processed",
          description: `${documentLabel} has been processed successfully.`,
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
      updateDocumentStatus(selectedLeadId, documentType, "Needs Review");
      toast({
        title: "Processing Failed",
        description: error instanceof Error
          ? `${getDocumentFriendlyName(documentType)} couldn't be processed: ${error.message}`
          : "Failed to process the file. Please try again or review manually.",
        variant: "destructive"
      });
    } finally {
      setProcessingStates(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Stage completion handlers
  /**
   * Marks the vendor profile stage complete and advances the workflow to the legal identity step.
   */
  const handleVendorProfileComplete = () => {
    updateStageStatus(selectedLead.id, 'vendor-profile', 'completed');
    setCurrentStage(selectedLead.id, 'legal-identity');
    updateStageStatus(selectedLead.id, 'legal-identity', 'in-progress');
    toast({
      title: "Vendor Profile Completed",
      description: "Moving to Legal & Identity verification stage.",
    });
  };

  /**
   * Completes the legal identity phase and transitions the lead to storefront preparation.
   */
  const handleLegalIdentityComplete = () => {
    updateStageStatus(selectedLead.id, 'legal-identity', 'completed');
    setCurrentStage(selectedLead.id, 'storefront-menu');
    updateStageStatus(selectedLead.id, 'storefront-menu', 'in-progress');
    toast({
      title: "Legal & Identity Completed",
      description: "Moving to Storefront & Menu stage.",
    });
  };

  /**
   * Applies the official business name extracted from CR OCR results to the lead profile.
   */
  const handleUseOfficialName = () => {
    if (selectedLead.extractedData?.cr?.officialBusinessName) {
      updateOfficialLegalName(selectedLead.id, selectedLead.extractedData.cr.officialBusinessName);
      toast({
        title: "Official Name Updated",
        description: "Using the official business name from CR document.",
      });
    }
  };

  /**
   * Sets the primary contact for the lead and optionally marks the owner as the same person.
   *
   * @param name - Display name that should appear as the primary contact.
   * @param useOwnerAsContact - When true, synchronizes the owner record with the contact details.
   */
  const handleUpdatePrimaryContact = (name: string, useOwnerAsContact: boolean) => {
    updatePrimaryContact(selectedLead.id, name, useOwnerAsContact);
    toast({
      title: "Primary Contact Updated",
      description: `Primary contact set to: ${name}`,
    });
  };

  /**
   * Persists incremental bank detail updates collected in the legal stage forms.
   *
   * @param details - Any subset of bank fields supplied by the operator.
   */
  const handleBankDetailsUpdate = (details: Partial<BankDetails>) => {
    updateBankDetails(selectedLead.id, details);
  };

  /**
   * Persists tax registration and legal form attributes captured from documentation.
   *
   * @param data - Object containing optional tax number or legal form values to update.
   */
  const handleLegalIdentifiersUpdate = (data: { taxNumber?: string | null; legalForm?: string | null }) => {
    updateLegalIdentifiers(selectedLead.id, data);
  };

  /**
   * Replaces the contact list for the selected lead, ensuring the primary contact mirrors the UI state.
   *
   * @param contacts - Updated roster of stakeholder contacts.
   */
  const handleContactsUpdate = (contacts: Contact[]) => {
    updateContacts(selectedLead.id, contacts);
  };

  /**
   * Confirms storefront assets and menu quality thresholds before moving the lead to package building.
   */
  const handleStorefrontMenuComplete = () => {
    const menuScores = useLeadStore.getState().getMenuHealthScore(selectedLead.id);
    const isComplete = isStageComplete(selectedLead.id, 'storefront-menu');
    
    console.log(`[Onboarding] Storefront menu completion check:`);
    console.log(`[Onboarding] - Documents: logo=${selectedLead.documents.logo}, cover=${selectedLead.documents.coverPhoto}, store=${selectedLead.documents.storePhoto}, menu=${selectedLead.documents.menu}`);
    console.log(`[Onboarding] - Menu scores:`, menuScores);
    console.log(`[Onboarding] - Is complete: ${isComplete}`);
    
    if (isComplete) {
      updateStageStatus(selectedLead.id, 'storefront-menu', 'completed');
      setCurrentStage(selectedLead.id, 'package-builder');
      updateStageStatus(selectedLead.id, 'package-builder', 'in-progress');
      toast({
        title: "Storefront & Menu Complete",
        description: "Moving to Package Builder stage.",
      });
    } else {
      toast({
        title: "Requirements Not Met",
        description: "Please complete all document uploads and meet menu quality requirements before proceeding.",
        variant: "destructive"
      });
    }
  };
  
  /**
   * Records the proposed package configuration, updates projected value, and advances to contract finalization.
   *
   * @param packageConfig - Bundle of selected assets, charges, and pricing created in the package builder.
   */
  const handlePackageBuilderComplete = (packageConfig: PackageConfiguration) => {
    console.log(`[Onboarding] Package builder completion with config:`, packageConfig);
    
    // Calculate total value from package configuration
    const totalOneTimeFees = packageConfig.additionalCharges.reduce((sum, charge) => sum + charge.price, 0) +
                            packageConfig.assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
    
    // Store package configuration and update lead value
    updatePackageConfiguration(selectedLead.id, packageConfig);
    updateLeadValue(selectedLead.id, totalOneTimeFees);
    
    updateStageStatus(selectedLead.id, 'package-builder', 'completed');
    setCurrentStage(selectedLead.id, 'finalize-sign');
    updateStageStatus(selectedLead.id, 'finalize-sign', 'in-progress');
    
    toast({
      title: "Package Configuration Complete",
      description: `Package value: ${totalOneTimeFees} SAR. Moving to contract finalization stage.`,
    });
  };

  const activationScore = getActivationScore(selectedLead.id);

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

  /**
   * Enables operators to manually enter CR or IBAN data and keeps dependent lead fields synchronized.
   *
   * @param docType - Identifier for the document being updated manually.
   * @param data - Field values keyed to the expected OCR payload shape.
   */
  const handleManualDataEntry = (docType: 'cr' | 'iban', data: any) => {
    if (!selectedLead) return;

    if (docType === 'cr') {
      // Update CR-related data using individual update methods
      updateOfficialLegalName(selectedLead.id, data.officialBusinessName);
      updateLegalIdentifiers(selectedLead.id, {
        taxNumber: data.taxNumber,
        legalForm: data.legalForm
      });
      updateCRNumber(selectedLead.id, data.crNumber);
      updateExtractedData(selectedLead.id, 'cr', {
        officialBusinessName: data.officialBusinessName,
        ownerName: data.ownerName,
        taxNumber: data.taxNumber,
        legalForm: data.legalForm,
        crNumber: data.crNumber
      });
      updateDocumentStatus(selectedLead.id, 'cr', 'Verified');

      // Update primary contact if owner name is provided
      if (data.ownerName && !selectedLead.contacts.find(c => c.role === 'Primary')) {
        updatePrimaryContact(selectedLead.id, data.ownerName, true);
      }
    } else if (docType === 'iban') {
      // Update IBAN-related data
      updateBankDetails(selectedLead.id, {
        iban: data.ibanNumber,
        accountOwnerName: data.accountOwnerName,
        bankName: data.bankName,
        swiftCode: data.swiftCode
      });
      updateExtractedData(selectedLead.id, 'iban', {
        ibanNumber: data.ibanNumber,
        accountOwnerName: data.accountOwnerName,
        bankName: data.bankName,
        swiftCode: data.swiftCode
      });
      updateDocumentStatus(selectedLead.id, 'iban', 'Verified');
    }

    toast({
      title: "Data Saved",
      description: `${docType.toUpperCase()} data has been saved successfully.`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium': 
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  /**
   * Selects the correct stage component to render based on the lead's current stage.
   */
  const renderCurrentStage = () => {
    switch (selectedLead.currentStage) {
      case 'vendor-profile':
        return (
          <VendorProfileStage
            lead={selectedLead}
            onUpdateOpeningHours={(hours: OpeningHours) => updateOpeningHours(selectedLead.id, hours)}
            onUpdateContactName={(name) => updatePrimaryContact(selectedLead.id, name, false)}
            onUpdateContacts={handleContactsUpdate}
            onMarkComplete={handleVendorProfileComplete}
          />
        );

      case 'legal-identity':
        return (
          <LegalIdentityStage
            lead={selectedLead}
            processingStates={processingStates}
            onFileUpload={handleFileUpload}
            onUseOfficialName={handleUseOfficialName}
            onUpdatePrimaryContact={handleUpdatePrimaryContact}
            onUpdateBankDetails={handleBankDetailsUpdate}
            onUpdateLegalIdentifiers={handleLegalIdentifiersUpdate}
            onManualDataEntry={handleManualDataEntry}
            onMarkComplete={() => {
              updateStageStatus(selectedLead.id, 'legal-identity', 'completed');
              setCurrentStage(selectedLead.id, 'storefront-menu');
              updateStageStatus(selectedLead.id, 'storefront-menu', 'in-progress');
              toast({
                title: "Legal Identity Complete",
                description: "Moving to Storefront & Menu stage.",
              });
            }}
          />
        );
      
      case 'storefront-menu':
        return (
          <StorefrontMenuStage
            lead={selectedLead}
            processingStates={processingStates}
            onFileUpload={handleFileUpload}
            onMarkComplete={handleStorefrontMenuComplete}
          />
        );
      
      case 'package-builder':
        return (
          <PackageBuilderStage
            lead={selectedLead}
            onMarkComplete={handlePackageBuilderComplete}
          />
        );
      
      case 'finalize-sign':
        return (
          <FinalizeAndSignStage
            lead={selectedLead}
            onMarkComplete={() => {
              updateStageStatus(selectedLead.id, 'finalize-sign', 'completed');
              toast({
                title: "Onboarding Complete!",
                description: `${selectedLead.companyName} has completed the full onboarding process.`,
              });
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[90vw] md:w-[800px] lg:w-[1000px] xl:w-[1200px] max-w-[95vw] p-0 overflow-hidden animate-slide-in-right"
      >
        <div className="h-full flex">
          {/* Left Sidebar - Stepper */}
          <div className="w-80 lg:w-80 md:w-64 sm:w-56 bg-muted/30 border-r border-border p-6 overflow-y-auto">
            {/* Header */}
            <SheetHeader className="mb-6">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg">
                  Onboarding for {selectedLead.companyName}
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Lead Summary */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedLead.companyName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", getBusinessTypeColor(selectedLead.businessType))}>
                  {selectedLead.businessType}
                </Badge>
                <Badge className={cn("text-xs", getPriorityColor(selectedLead.priority))}>
                  {selectedLead.priority}
                </Badge>
              </div>
              
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span>{selectedLead.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{selectedLead.address}</span>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Overall Progress</span>
                  <span>{activationScore}%</span>
                </div>
                <Progress value={activationScore} className="h-2" />
              </div>
            </div>

            {/* Activation Stepper */}
            <ActivationStepper
              currentStage={selectedLead.currentStage}
              stageStatus={selectedLead.stageStatus}
              onStageClick={handleStageClick}
              canAccessStage={(stage) => canAccessStage(selectedLead.id, stage)}
              isStageComplete={(stage) => isStageComplete(selectedLead.id, stage)}
            />

            {/* Debug Panel - Only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <DebugPanel
                lead={selectedLead}
                isStageComplete={(leadId, stage) => isStageComplete(leadId, stage)}
                canAccessStage={(leadId, stage) => canAccessStage(leadId, stage)}
              />
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {renderCurrentStage()}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}