import { OCRDocumentType, OCRPromptConfig } from '@/types/ocr';

/**
 * Centralized OCR Prompt Management Service
 * 
 * This service provides easy-to-update prompts for different OCR document types.
 * To update a prompt, simply modify the corresponding entry in the PROMPT_CONFIGS object.
 * 
 * Adding a new document type:
 * 1. Add the new type to OCRDocumentType in types/ocr.ts
 * 2. Add a new entry to PROMPT_CONFIGS below
 * 3. The rest of the system will automatically handle it
 */

const PROMPT_CONFIGS: Record<OCRDocumentType, OCRPromptConfig> = {
  cr: {
    prompt: `Analyze this image of a Commercial Registration document. 
    
    Extract the following fields and return them as a valid JSON object:
    - 'officialBusinessName': The official registered business name
    - 'ownerName': The name of the business owner
    
    If any field is not clearly visible or readable, set its value to null.
    Return only the JSON object, no additional text.`,
    expectedFields: ['officialBusinessName', 'ownerName'],
    maxOutputTokens: 1024,
    temperature: 0.1
  },

  iban: {
    prompt: `Analyze this image of a bank document or IBAN certificate.
    
    Extract the following fields and return them as a valid JSON object:
    - 'accountOwnerName': The name of the account holder
    - 'ibanNumber': The IBAN number (format: country code + check digits + account number)
    
    If any field is not clearly visible or readable, set its value to null.
    Ensure the IBAN format is correct if found.
    Return only the JSON object, no additional text.`,
    expectedFields: ['accountOwnerName', 'ibanNumber'],
    maxOutputTokens: 1024,
    temperature: 0.1
  },

  logo: {
    prompt: `Analyze this image to determine if it is suitable as a business logo.
    
    Check for the following criteria:
    - Image quality (resolution, clarity)
    - Professional appearance
    - Appropriate content (no inappropriate or offensive material)
    - Logo-like characteristics (not a random photo)
    
    Return a JSON object with:
    - 'isSuitable': boolean (true if suitable, false if not)
    - 'reason': string explaining why it is or isn't suitable
    - 'suggestions': string with improvement suggestions if not suitable (optional)
    
    Return only the JSON object, no additional text.`,
    expectedFields: ['isSuitable', 'reason'],
    maxOutputTokens: 1024,
    temperature: 0.2
  },

  coverPhoto: {
    prompt: `Analyze this image to determine if it is suitable as a business cover photo.
    
    Check for the following criteria:
    - Image quality (high resolution, good lighting)
    - Professional appearance and relevance to business
    - Appropriate content (no inappropriate or offensive material)
    - Visual appeal for marketing purposes
    
    Return a JSON object with:
    - 'isSuitable': boolean (true if suitable, false if not)
    - 'reason': string explaining why it is or isn't suitable
    - 'suggestions': string with improvement suggestions if not suitable (optional)
    
    Return only the JSON object, no additional text.`,
    expectedFields: ['isSuitable', 'reason'],
    maxOutputTokens: 1024,
    temperature: 0.2
  },

  storePhoto: {
    prompt: `Analyze this image to verify if it shows a legitimate storefront.
    
    Check if the image clearly shows:
    - A physical business location/storefront
    - Business signage or identifying features
    - Professional appearance suitable for a business listing
    
    {{COMPANY_NAME_CONTEXT}}
    
    Return a JSON object with:
    - 'isMatch': boolean (true if it's a legitimate storefront, false if not)
    - 'reason': string explaining your assessment
    - 'confidence': number from 0-100 indicating confidence level
    
    Return only the JSON object, no additional text.`,
    expectedFields: ['isMatch', 'reason', 'confidence'],
    maxOutputTokens: 1024,
    temperature: 0.2
  },

  menu: {
    prompt: `Analyze this menu image and extract all food and drink items with their details.
    
    Structure the output as a single valid JSON object where:
    - Root object keys represent menu categories (e.g., 'Appetizers', 'Main Courses', 'Beverages', 'Desserts')
    - Each category value is an array of item objects
    - Each item object must have:
      * 'name': string (item name)
      * 'price': number (convert to number, extract from any currency format)
      * 'description': string (item description if available, empty string if not)
    
    Guidelines:
    - Group items logically by category
    - If categories aren't clear, use generic ones like 'Food Items', 'Beverages'
    - Extract prices accurately, converting to numbers (e.g., "$12.99" becomes 12.99)
    - If no price is visible, set price to 0
    - If no description, use empty string ""
    
    Return only the JSON object, no additional text.`,
    expectedFields: ['categories with items'],
    maxOutputTokens: 2048,
    temperature: 0.1
  }
};

export class OCRPromptService {
  /**
   * Get the prompt configuration for a specific document type
   */
  static getPromptConfig(documentType: OCRDocumentType): OCRPromptConfig {
    const config = PROMPT_CONFIGS[documentType];
    if (!config) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }
    return config;
  }

  /**
   * Get a formatted prompt with company context if needed
   */
  static getFormattedPrompt(documentType: OCRDocumentType, companyName?: string): string {
    const config = this.getPromptConfig(documentType);
    let prompt = config.prompt;

    // Replace company name placeholder for storePhoto type
    if (documentType === 'storePhoto' && companyName) {
      const companyContext = `The business name to verify is: "${companyName}". Check if this storefront matches or could reasonably belong to this business.`;
      prompt = prompt.replace('{{COMPANY_NAME_CONTEXT}}', companyContext);
    } else {
      prompt = prompt.replace('{{COMPANY_NAME_CONTEXT}}', '');
    }

    return prompt.trim();
  }

  /**
   * Get all available document types
   */
  static getAvailableTypes(): OCRDocumentType[] {
    return Object.keys(PROMPT_CONFIGS) as OCRDocumentType[];
  }

  /**
   * Get expected fields for a document type
   */
  static getExpectedFields(documentType: OCRDocumentType): string[] {
    return this.getPromptConfig(documentType).expectedFields || [];
  }

  /**
   * Update a prompt configuration (useful for testing different prompts)
   */
  static updatePromptConfig(documentType: OCRDocumentType, updates: Partial<OCRPromptConfig>): void {
    if (!PROMPT_CONFIGS[documentType]) {
      throw new Error(`Cannot update non-existent document type: ${documentType}`);
    }
    
    PROMPT_CONFIGS[documentType] = {
      ...PROMPT_CONFIGS[documentType],
      ...updates
    };
  }
}