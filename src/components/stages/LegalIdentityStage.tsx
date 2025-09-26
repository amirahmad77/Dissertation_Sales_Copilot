import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const LEGAL_FORM_OPTIONS = [
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Limited Liability Company', label: 'Limited Liability Company (LLC)' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Joint Stock Company', label: 'Joint Stock Company' },
  { value: 'Nonprofit Organization', label: 'Nonprofit Organization' }
];

import { OCRFallbackEditor } from '@/components/OCRFallbackEditor';
import { 
  FileText,
  CreditCard,
  Upload,
  CheckCircle,
  AlertCircle, 
  Loader2,
  AlertTriangle,
  User,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Lead, type BankDetails } from '@/store/useLeadStore';

interface LegalIdentityStageProps {
  lead: Lead;
  processingStates: { [key: string]: boolean };
  onFileUpload: (file: File, docType: 'cr' | 'iban') => void;
  onUseOfficialName: () => void;
  onUpdatePrimaryContact: (name: string, useOwnerAsContact: boolean) => void;
  onUpdateBankDetails: (details: Partial<BankDetails>) => void;
  onUpdateLegalIdentifiers: (data: { taxNumber?: string | null; legalForm?: string | null }) => void;
  onManualDataEntry: (docType: 'cr' | 'iban', data: any) => void;
  onMarkComplete: () => void;
}

export function LegalIdentityStage({
  lead,
  processingStates,
  onFileUpload,
  onUseOfficialName,
  onUpdatePrimaryContact,
  onUpdateBankDetails,
  onUpdateLegalIdentifiers,
  onManualDataEntry,
  onMarkComplete
}: LegalIdentityStageProps) {
  const crFileRef = useRef<HTMLInputElement>(null);
  const ibanFileRef = useRef<HTMLInputElement>(null);
  const primaryContact = lead.contacts.find(contact => contact.role === 'Primary');
  const [primaryContactInput, setPrimaryContactInput] = useState(primaryContact?.name || '');
  const [showContactPrompt, setShowContactPrompt] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ cr?: string; iban?: string }>({});
  const [bankNameInput, setBankNameInput] = useState(lead.bankDetails?.bankName || '');
  const [swiftCodeInput, setSwiftCodeInput] = useState(lead.bankDetails?.swiftCode || '');
  const [taxNumberInput, setTaxNumberInput] = useState(
    lead.taxNumber || lead.extractedData?.cr?.taxNumber || ''
  );
  const [legalFormInput, setLegalFormInput] = useState(
    lead.legalForm || lead.extractedData?.cr?.legalForm || ''
  );
  const [showFallbackEditor, setShowFallbackEditor] = useState<'cr' | 'iban' | null>(null);

  useEffect(() => {
    setPrimaryContactInput(primaryContact?.name || '');
  }, [primaryContact?.name]);

  useEffect(() => {
    setBankNameInput(lead.bankDetails?.bankName || '');
    setSwiftCodeInput(lead.bankDetails?.swiftCode || '');
  }, [lead.bankDetails?.bankName, lead.bankDetails?.swiftCode]);

  useEffect(() => {
    setTaxNumberInput(lead.taxNumber || lead.extractedData?.cr?.taxNumber || '');
    setLegalFormInput(lead.legalForm || lead.extractedData?.cr?.legalForm || '');
  }, [lead.taxNumber, lead.legalForm, lead.extractedData?.cr?.taxNumber, lead.extractedData?.cr?.legalForm]);

  useEffect(() => () => {
    Object.values(previewUrls).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
  }, [previewUrls]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, docType: 'cr' | 'iban') => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrls(prev => {
        const previousUrl = prev[docType];
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return { ...prev, [docType]: URL.createObjectURL(file) };
      });
      onFileUpload(file, docType);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleBankFieldChange = (field: 'bankName' | 'swiftCode', value: string) => {
    const normalizedValue = field === 'swiftCode' ? value.toUpperCase() : value;
    if (field === 'bankName') {
      setBankNameInput(normalizedValue);
    } else {
      setSwiftCodeInput(normalizedValue);
    }
    onUpdateBankDetails({ [field]: normalizedValue } as Partial<BankDetails>);
  };

  const handleTaxNumberChange = (value: string) => {
    setTaxNumberInput(value);
    onUpdateLegalIdentifiers({ taxNumber: value || null });
  };

  const handleLegalFormChange = (value: string) => {
    setLegalFormInput(value);
    onUpdateLegalIdentifiers({ legalForm: value || null });
  };

  const getDocumentStatus = (docType: 'cr' | 'iban') => {
    const status = lead.documents[docType];
    const isProcessing = processingStates[docType];
    
    if (isProcessing) {
      return { icon: Loader2, label: 'Processing...', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    }
    
    switch (status) {
      case 'Verified':
        return { icon: CheckCircle, label: 'Verified', color: 'text-success', bgColor: 'bg-success/10' };
      case 'Needs Review':
        return { icon: AlertCircle, label: 'Needs Review', color: 'text-warning', bgColor: 'bg-warning/10' };
      default:
        return { icon: Upload, label: 'Upload Required', color: 'text-muted-foreground', bgColor: 'bg-muted/20' };
    }
  };

  const handleFallbackSave = (docType: 'cr' | 'iban', data: any) => {
    onManualDataEntry(docType, data);
    setShowFallbackEditor(null);
  };

  // Check for business name mismatch
  const hasBusinessNameMismatch = !!(
    lead.companyName && 
    lead.extractedData?.cr?.officialBusinessName &&
    lead.companyName.toLowerCase().trim() !== lead.extractedData.cr.officialBusinessName.toLowerCase().trim()
  );

  // Check for bank account name mismatch
  const hasBankNameMismatch = !!(
    lead.officialLegalName &&
    lead.extractedData?.iban?.accountOwnerName &&
    lead.officialLegalName.toLowerCase().trim() !== lead.extractedData.iban.accountOwnerName.toLowerCase().trim()
  );

  // Handle owner as primary contact flow
  const handleOwnerContactDecision = (useOwner: boolean) => {
    if (useOwner && lead.extractedData?.cr?.ownerName) {
      onUpdatePrimaryContact(lead.extractedData.cr.ownerName, true);
      setShowContactPrompt(false);
    } else {
      setShowContactPrompt(false);
      // Focus on manual input
    }
  };

  const handlePrimaryContactSave = () => {
    if (primaryContactInput.trim()) {
      onUpdatePrimaryContact(primaryContactInput.trim(), false);
    }
  };

  // Show contact prompt after CR is verified and owner name is extracted
  const shouldShowContactPrompt = !!(
    lead.documents.cr === 'Verified' &&
    lead.extractedData?.cr?.ownerName &&
    !primaryContact &&
    !showContactPrompt
  );

  const isComplete = !!(
    lead.documents.cr === 'Verified' &&
    lead.documents.iban === 'Verified' &&
    lead.officialLegalName &&
    primaryContact &&
    lead.crNumber &&
    lead.bankDetails?.iban &&
    lead.bankDetails?.accountOwnerName &&
    lead.bankDetails?.bankName &&
    lead.bankDetails?.swiftCode &&
    lead.taxNumber &&
    lead.legalForm
  );

  return (
    <div className="space-y-6">
      {/* Document Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legal Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Commercial Registration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Commercial Registration (CR)</Label>
              {(() => {
                const status = getDocumentStatus('cr');
                const IconComponent = status.icon;
                return (
                  <Badge className={cn("flex items-center gap-2", status.bgColor, status.color)}>
                    <IconComponent className={cn("h-4 w-4", processingStates.cr && "animate-spin")} />
                    {status.label}
                  </Badge>
                );
              })()}
            </div>
            
            <Button
              variant="outline"
              onClick={() => crFileRef.current?.click()}
              disabled={processingStates.cr}
              className="w-full h-20 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                   <Upload className="h-6 w-6" />
                   <span>Upload CR Document (PDF, JPG, PNG)</span>
              </div>
            </Button>

            <input
              ref={crFileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'cr')}
              className="hidden"
            />

            {previewUrls.cr && (
              <div className="relative mt-4 overflow-hidden rounded-md border">
                <img
                  src={previewUrls.cr}
                  alt="Commercial registration preview"
                  className="h-48 w-full object-cover"
                />
                {processingStates.cr && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Analyzing with Gemini...</span>
                  </div>
                )}
               </div>
             )}

             {getDocumentStatus('cr').label === 'Needs Review' && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowFallbackEditor('cr')}
                 className="w-full"
               >
                 Enter Data Manually
               </Button>
             )}
           </div>

           {/* Bank IBAN Letter */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Bank IBAN Letter</Label>
              {(() => {
                const status = getDocumentStatus('iban');
                const IconComponent = status.icon;
                return (
                  <Badge className={cn("flex items-center gap-2", status.bgColor, status.color)}>
                    <IconComponent className={cn("h-4 w-4", processingStates.iban && "animate-spin")} />
                    {status.label}
                  </Badge>
                );
              })()}
            </div>
            
            <Button
              variant="outline"
              onClick={() => ibanFileRef.current?.click()}
              disabled={processingStates.iban}
              className="w-full h-20 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                <CreditCard className="h-6 w-6" />
                <span>Upload Bank IBAN Letter (PDF, JPG, PNG)</span>
              </div>
            </Button>

            <input
              ref={ibanFileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'iban')}
              className="hidden"
            />

            {previewUrls.iban && (
              <div className="relative mt-4 overflow-hidden rounded-md border">
                <img
                  src={previewUrls.iban}
                  alt="Bank letter preview"
                  className="h-48 w-full object-cover"
                />
                {processingStates.iban && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Analyzing with Gemini...</span>
                  </div>
                )}
               </div>
             )}

             {getDocumentStatus('iban').label === 'Needs Review' && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setShowFallbackEditor('iban')}
                 className="w-full"
               >
                 Enter Data Manually
               </Button>
             )}
           </div>
         </CardContent>
       </Card>

      {/* Reconciliation Section */}
      {(hasBusinessNameMismatch || hasBankNameMismatch || shouldShowContactPrompt || lead.extractedData?.cr || lead.extractedData?.iban) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Data Reconciliation & Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Business Name Mismatch */}
            {hasBusinessNameMismatch && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Business Name Mismatch Found</p>
                    <div className="text-sm space-y-1">
                      <p><strong>Current:</strong> {lead.companyName}</p>
                      <p><strong>From CR:</strong> {lead.extractedData?.cr?.officialBusinessName}</p>
                    </div>
                    <Button size="sm" onClick={onUseOfficialName}>
                      Use Official Name from CR
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Owner & Contact Information */}
            {lead.extractedData?.cr?.ownerName && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span><strong>Legal Owner:</strong> {lead.extractedData.cr.ownerName}</span>
                </div>

                {shouldShowContactPrompt && (
                  <Alert>
                    <User className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <p>The legal owner is <strong>'{lead.extractedData.cr.ownerName}'</strong>. Is this also your primary contact?</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleOwnerContactDecision(true)}>
                            Yes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOwnerContactDecision(false)}>
                            No
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!primaryContact && !shouldShowContactPrompt && (
                  <div className="space-y-2">
                    <Label>Primary Contact Name *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={primaryContactInput}
                        onChange={(e) => setPrimaryContactInput(e.target.value)}
                        placeholder="Enter primary contact name"
                        className="flex-1"
                      />
                      <Button onClick={handlePrimaryContactSave} disabled={!primaryContactInput.trim()}>
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {primaryContact && (
                  <div className="flex items-center gap-2 p-3 bg-success/10 rounded-md">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span><strong>Primary Contact:</strong> {primaryContact.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bank Account Name Mismatch */}
            {hasBankNameMismatch && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">⚠️ Bank Account Name Mismatch</p>
                    <div className="text-sm space-y-1">
                      <p><strong>Legal Name:</strong> {lead.officialLegalName}</p>
                      <p><strong>Bank Account:</strong> {lead.extractedData?.iban?.accountOwnerName}</p>
                    </div>
                    <p className="text-sm">The name on the bank account does not match the commercial registration. Please verify.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Extracted Data Display */}
            {lead.extractedData?.cr && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Extracted CR Data</Label>
                <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                  {lead.extractedData.cr.officialBusinessName && (
                    <p><strong>Business Name:</strong> {lead.extractedData.cr.officialBusinessName}</p>
                  )}
                  {lead.extractedData.cr.crNumber && (
                    <p><strong>CR Number:</strong> {lead.extractedData.cr.crNumber}</p>
                  )}
                  {lead.extractedData.cr.ownerName && (
                    <p><strong>Owner Name:</strong> {lead.extractedData.cr.ownerName}</p>
                  )}
                  {lead.extractedData.cr.taxNumber && (
                    <p><strong>Tax Number:</strong> {lead.extractedData.cr.taxNumber}</p>
                  )}
                  {lead.extractedData.cr.legalForm && (
                    <p><strong>Legal Form:</strong> {lead.extractedData.cr.legalForm}</p>
                  )}
                </div>
              </div>
            )}

            {lead.extractedData?.iban && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Extracted Bank Data</Label>
                <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                  {lead.extractedData.iban.ibanNumber && (
                    <p><strong>IBAN:</strong> {lead.extractedData.iban.ibanNumber}</p>
                  )}
                  {lead.extractedData.iban.accountOwnerName && (
                    <p><strong>Account Owner:</strong> {lead.extractedData.iban.accountOwnerName}</p>
                  )}
                  {lead.extractedData.iban.bankName && (
                    <p><strong>Bank Name:</strong> {lead.extractedData.iban.bankName}</p>
                  )}
                  {lead.extractedData.iban.swiftCode && (
                    <p><strong>SWIFT/BIC:</strong> {lead.extractedData.iban.swiftCode}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tax Number *</Label>
                <Input
                  value={taxNumberInput}
                  onChange={(e) => handleTaxNumberChange(e.target.value)}
                  placeholder="Enter tax number"
                />
                {!taxNumberInput && (
                  <p className="text-xs text-destructive">Tax number is required</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Legal Form *</Label>
                <Select value={legalFormInput} onValueChange={handleLegalFormChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select legal form" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!legalFormInput && (
                  <p className="text-xs text-destructive">Legal form is required</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bank Name *</Label>
                <Input
                  value={bankNameInput}
                  onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                />
                {!bankNameInput && (
                  <p className="text-xs text-destructive">Bank name is required</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">SWIFT / BIC *</Label>
                <Input
                  value={swiftCodeInput}
                  onChange={(e) => handleBankFieldChange('swiftCode', e.target.value)}
                  placeholder="Enter SWIFT/BIC code"
                />
                {!swiftCodeInput && (
                  <p className="text-xs text-destructive">SWIFT/BIC code is required</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Actions */}
      {showFallbackEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <OCRFallbackEditor
            documentType={showFallbackEditor}
            onSave={(data) => handleFallbackSave(showFallbackEditor, data)}
            onCancel={() => setShowFallbackEditor(null)}
            initialData={
              showFallbackEditor === 'cr' 
                ? lead.extractedData?.cr 
                : lead.extractedData?.iban
            }
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={onMarkComplete}
          disabled={!isComplete}
          className="bg-success hover:bg-success/90"
        >
          Complete Legal & Identity Verification
        </Button>
      </div>
    </div>
  );
}