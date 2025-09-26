export type OCRDocumentType = 'cr' | 'iban' | 'logo' | 'coverPhoto' | 'storePhoto' | 'menu';

export interface OCRRequest {
  imageBase64: string;
  documentType: OCRDocumentType;
  companyName?: string;
}

export interface OCRResponse {
  extractedData: any;
  error?: string;
  details?: string;
}

export interface OCRPromptConfig {
  prompt: string;
  expectedFields?: string[];
  maxOutputTokens?: number;
  temperature?: number;
}

export interface OCRProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
}