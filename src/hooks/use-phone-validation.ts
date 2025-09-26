import { useMemo } from 'react';

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

export function usePhoneValidation() {
  const validatePhone = useMemo(() => {
    return (phone: string): PhoneValidationResult => {
      if (!phone || phone.trim().length === 0) {
        return {
          isValid: false,
          formatted: '',
          error: 'Phone number is required'
        };
      }

      // Remove all non-digit characters except + at the start
      const cleaned = phone.replace(/[^\d+]/g, '');
      
      // Check for international format (starts with +)
      if (cleaned.startsWith('+')) {
        const digits = cleaned.slice(1);
        
        // International number should have 7-15 digits after +
        if (digits.length >= 7 && digits.length <= 15) {
          return {
            isValid: true,
            formatted: `+${digits}`,
          };
        } else {
          return {
            isValid: false,
            formatted: cleaned,
            error: 'International numbers should have 7-15 digits after country code'
          };
        }
      }
      
      // Check for Saudi numbers (common patterns)
      if (cleaned.startsWith('966')) {
        // Remove country code and validate
        const localNumber = cleaned.slice(3);
        if (localNumber.length === 9 && localNumber.startsWith('5')) {
          return {
            isValid: true,
            formatted: `+966${localNumber}`,
          };
        }
      }
      
      // Local Saudi format (starts with 05)
      if (cleaned.startsWith('05') && cleaned.length === 10) {
        return {
          isValid: true,
          formatted: `+966${cleaned.slice(1)}`,
        };
      }
      
      // Local format without leading 0 (starts with 5)
      if (cleaned.startsWith('5') && cleaned.length === 9) {
        return {
          isValid: true,
          formatted: `+966${cleaned}`,
        };
      }
      
      // US format (10 digits)
      if (cleaned.length === 10 && /^[2-9]\d{9}$/.test(cleaned)) {
        return {
          isValid: true,
          formatted: `+1${cleaned}`,
        };
      }
      
      // Generic validation for other formats (6-15 digits)
      if (/^\d{6,15}$/.test(cleaned)) {
        return {
          isValid: true,
          formatted: cleaned.length >= 10 ? `+${cleaned}` : cleaned,
        };
      }
      
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Please enter a valid phone number (with country code if international)'
      };
    };
  }, []);

  const formatPhoneForDisplay = useMemo(() => {
    return (phone: string): string => {
      const result = validatePhone(phone);
      return result.formatted;
    };
  }, [validatePhone]);

  return {
    validatePhone,
    formatPhoneForDisplay
  };
}