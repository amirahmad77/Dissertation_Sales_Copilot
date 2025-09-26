import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Save, X } from 'lucide-react';

interface OCRFallbackEditorProps {
  documentType: 'cr' | 'iban';
  onSave: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const LEGAL_FORM_OPTIONS = [
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Limited Liability Company', label: 'Limited Liability Company (LLC)' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Joint Stock Company', label: 'Joint Stock Company' },
  { value: 'Nonprofit Organization', label: 'Nonprofit Organization' }
];

export function OCRFallbackEditor({ documentType, onSave, onCancel, initialData }: OCRFallbackEditorProps) {
  // CR Data
  const [crData, setCrData] = useState({
    officialBusinessName: initialData?.officialBusinessName || '',
    ownerName: initialData?.ownerName || '',
    taxNumber: initialData?.taxNumber || '',
    legalForm: initialData?.legalForm || '',
    crNumber: initialData?.crNumber || ''
  });

  // IBAN Data
  const [ibanData, setIbanData] = useState({
    accountOwnerName: initialData?.accountOwnerName || '',
    ibanNumber: initialData?.ibanNumber || '',
    bankName: initialData?.bankName || '',
    swiftCode: initialData?.swiftCode || ''
  });

  const handleSave = () => {
    const dataToSave = documentType === 'cr' ? crData : ibanData;
    onSave(dataToSave);
  };

  const isValid = () => {
    if (documentType === 'cr') {
      return crData.officialBusinessName && crData.ownerName && crData.taxNumber && crData.legalForm;
    } else {
      return ibanData.accountOwnerName && ibanData.ibanNumber && ibanData.bankName;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Manual Data Entry - {documentType === 'cr' ? 'Commercial Registration' : 'Bank Details'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          OCR could not extract data automatically. Please enter the information manually.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {documentType === 'cr' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="businessName">Official Business Name *</Label>
              <Input
                id="businessName"
                value={crData.officialBusinessName}
                onChange={(e) => setCrData(prev => ({ ...prev, officialBusinessName: e.target.value }))}
                placeholder="Enter the official registered business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input
                id="ownerName"
                value={crData.ownerName}
                onChange={(e) => setCrData(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Enter the business owner's name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxNumber">Tax Number *</Label>
              <Input
                id="taxNumber"
                value={crData.taxNumber}
                onChange={(e) => setCrData(prev => ({ ...prev, taxNumber: e.target.value }))}
                placeholder="Enter the tax identification number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crNumber">CR Number</Label>
              <Input
                id="crNumber"
                value={crData.crNumber}
                onChange={(e) => setCrData(prev => ({ ...prev, crNumber: e.target.value }))}
                placeholder="Enter the commercial registration number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalForm">Legal Form *</Label>
              <Select value={crData.legalForm} onValueChange={(value) => setCrData(prev => ({ ...prev, legalForm: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the legal entity type" />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_FORM_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="accountOwner">Account Owner Name *</Label>
              <Input
                id="accountOwner"
                value={ibanData.accountOwnerName}
                onChange={(e) => setIbanData(prev => ({ ...prev, accountOwnerName: e.target.value }))}
                placeholder="Enter the bank account holder's name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN Number *</Label>
              <Input
                id="iban"
                value={ibanData.ibanNumber}
                onChange={(e) => setIbanData(prev => ({ ...prev, ibanNumber: e.target.value.toUpperCase() }))}
                placeholder="Enter the IBAN number (e.g., SA44 2000 0001 2345 6789 1234)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={ibanData.bankName}
                onChange={(e) => setIbanData(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="Enter the bank name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swiftCode">SWIFT/BIC Code</Label>
              <Input
                id="swiftCode"
                value={ibanData.swiftCode}
                onChange={(e) => setIbanData(prev => ({ ...prev, swiftCode: e.target.value.toUpperCase() }))}
                placeholder="Enter the SWIFT/BIC code (optional)"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            <Save className="h-4 w-4 mr-2" />
            Save Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}