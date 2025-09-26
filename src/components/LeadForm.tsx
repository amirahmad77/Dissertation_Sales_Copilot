import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessType } from '@/store/useLeadStore';
import { usePhoneValidation } from '@/hooks/use-phone-validation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface FormData {
  companyName: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  address: string;
  businessType: BusinessType | '';
  openingHours?: string[] | null;
}

interface ValidationErrors {
  companyName?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  address?: string;
  businessType?: string;
}

interface LeadFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function LeadForm({ initialData, onSubmit, onCancel, isSubmitting }: LeadFormProps) {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    primaryContactName: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    address: '',
    businessType: '',
    ...initialData
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'companyName':
        if (!value) return 'Company name is required.';
        if (value.length < 3) return 'Company name must be at least 3 characters.';
        break;
      case 'primaryContactName':
        // Optional during lead creation, will be required later in activation
        break;
      case 'primaryContactPhone':
        if (!value) return 'Please enter a valid phone number.';
        // Basic phone validation - clean the input first
        const cleanedPhone = value.replace(/[-\s\(\)]/g, '');
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(cleanedPhone)) {
          return 'Please enter a valid phone number.';
        }
        break;
      case 'primaryContactEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address.';
        }
        break;
      case 'address':
        if (!value) return 'Address is required.';
        break;
      case 'businessType':
        if (!value) return 'Please select a business type.';
        break;
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    if (touched[field]) {
      const fieldValue = typeof value === 'string' ? value : '';
      const error = validateField(field, fieldValue);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldValue = typeof formData[field] === 'string' ? formData[field] as string : '';
    const error = validateField(field, fieldValue);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const isFormValid = (): boolean => {
    const requiredFields: (keyof FormData)[] = ['companyName', 'primaryContactPhone', 'address', 'businessType'];
    
    // Check all required fields are filled and have no errors
    const requiredFieldsValid = requiredFields.every(field => {
      const fieldValue = typeof formData[field] === 'string' ? formData[field] as string : '';
      const error = validateField(field, fieldValue);
      return fieldValue && !error;
    });

    // Check email is valid if provided (optional field)
    const emailError = validateField('primaryContactEmail', typeof formData.primaryContactEmail === 'string' ? formData.primaryContactEmail : '');
    
    return requiredFieldsValid && !emailError;
  };

  const handleSubmit = () => {
    console.log('Form submission started');
    console.log('Current form data:', formData);
    console.log('Form valid?', isFormValid());
    
    // Validate all fields before submission
    const newErrors: ValidationErrors = {};
    const allFields: (keyof FormData)[] = ['companyName', 'primaryContactName', 'primaryContactPhone', 'primaryContactEmail', 'address', 'businessType'];
    
    allFields.forEach(field => {
      const fieldValue = typeof formData[field] === 'string' ? formData[field] as string : '';
      const error = validateField(field, fieldValue);
      if (error) newErrors[field] = error;
    });

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    setTouched(Object.fromEntries(allFields.map(field => [field, true])));

    if (Object.keys(newErrors).length === 0 && isFormValid()) {
      console.log('Form is valid, submitting...');
      onSubmit(formData);
    } else {
      console.log('Form validation failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Lead Information</Label>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Back to Search
        </Button>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="company-name">Company Name *</Label>
        <Input
          id="company-name"
          value={formData.companyName}
          onChange={(e) => handleFieldChange('companyName', e.target.value)}
          onBlur={() => handleFieldBlur('companyName')}
          placeholder="Enter company name"
          className={errors.companyName ? 'border-destructive' : ''}
        />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName}</p>
        )}
      </div>

      {/* Primary Contact Name */}
      <div className="space-y-2">
        <Label htmlFor="contact-name">Primary Contact Name</Label>
        <Input
          id="contact-name"
          value={formData.primaryContactName}
          onChange={(e) => handleFieldChange('primaryContactName', e.target.value)}
          onBlur={() => handleFieldBlur('primaryContactName')}
          placeholder="Enter contact name"
          className={errors.primaryContactName ? 'border-destructive' : ''}
        />
        {errors.primaryContactName && (
          <p className="text-sm text-destructive">{errors.primaryContactName}</p>
        )}
      </div>

      {/* Primary Contact Phone with Country Code */}
      <div className="space-y-2">
        <Label htmlFor="contact-phone">Primary Contact Phone *</Label>
        <div className="flex gap-2">
          <Select defaultValue="+966">
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+966">+966</SelectItem>
              <SelectItem value="+1">+1</SelectItem>
              <SelectItem value="+44">+44</SelectItem>
              <SelectItem value="+971">+971</SelectItem>
            </SelectContent>
          </Select>
          <Input
            id="contact-phone"
            value={formData.primaryContactPhone}
            onChange={(e) => handleFieldChange('primaryContactPhone', e.target.value)}
            onBlur={() => handleFieldBlur('primaryContactPhone')}
            placeholder="Enter phone number"
            className={`flex-1 ${errors.primaryContactPhone ? 'border-destructive' : ''}`}
          />
        </div>
        {errors.primaryContactPhone && (
          <p className="text-sm text-destructive">{errors.primaryContactPhone}</p>
        )}
      </div>

      {/* Primary Contact Email */}
      <div className="space-y-2">
        <Label htmlFor="contact-email">Primary Contact Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={formData.primaryContactEmail}
          onChange={(e) => handleFieldChange('primaryContactEmail', e.target.value)}
          onBlur={() => handleFieldBlur('primaryContactEmail')}
          placeholder="Enter email address (optional)"
          className={errors.primaryContactEmail ? 'border-destructive' : ''}
        />
        {errors.primaryContactEmail && (
          <p className="text-sm text-destructive">{errors.primaryContactEmail}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          onBlur={() => handleFieldBlur('address')}
          placeholder="Enter business address"
          className={errors.address ? 'border-destructive' : ''}
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address}</p>
        )}
      </div>

      {/* Business Type */}
      <div className="space-y-2">
        <Label htmlFor="business-type">Business Type *</Label>
        <Select
          value={formData.businessType}
          onValueChange={(value: BusinessType) => {
            handleFieldChange('businessType', value);
            if (touched.businessType) {
              const error = validateField('businessType', value);
              setErrors(prev => ({ ...prev, businessType: error }));
            }
          }}
        >
          <SelectTrigger className={errors.businessType ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Restaurant">Restaurant</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Services">Services</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.businessType && (
          <p className="text-sm text-destructive">{errors.businessType}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isFormValid() || isSubmitting}
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity duration-200"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            Creating Lead...
          </div>
        ) : (
          'Create Lead'
        )}
      </Button>
    </div>
  );
}