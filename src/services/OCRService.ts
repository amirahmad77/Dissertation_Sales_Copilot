import { supabase } from '@/integrations/supabase/client';
import { OCRRequest, OCRResponse, OCRProcessingResult, OCRDocumentType } from '@/types/ocr';
import { OCRPromptService } from './OCRPromptService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * OCR Service for handling document processing
 * 
 * This service provides a clean interface for OCR operations and handles:
 * - File validation
 * - Base64 conversion
 * - API communication with the edge function
 * - Error handling and logging
 */

export class OCRService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_TYPES = {
    menu: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    cr: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    iban: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    logo: ['image/jpeg', 'image/png', 'image/webp'],
    coverPhoto: ['image/jpeg', 'image/png', 'image/webp'],
    storePhoto: ['image/jpeg', 'image/png', 'image/webp']
  };

  /**
   * Convert a file to base64 string or process CSV
   */
  private static async processFile(file: File, documentType: OCRDocumentType): Promise<{ base64?: string; csvData?: any }> {
    // Handle CSV/Excel files for menu
    if (documentType === 'menu' && (
      file.type === 'text/csv' || 
      file.type === 'application/vnd.ms-excel' || 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )) {
      return { csvData: await this.processCSVFile(file) };
    }
    
    // Handle other files as base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve({ base64: reader.result as string });
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Process CSV file for menu data
   */
  private static async processCSVFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        try {
          const csvText = reader.result as string;
          const menuData = this.parseCSVToMenu(csvText);
          resolve(menuData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Process Excel file for menu data (.xlsx, .xls)
   */
  private static async processExcelFile(file: File): Promise<any> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    // Normalize headers to lowercase
    const normalizedRows = rows.map((row) => {
      const obj: any = {};
      Object.keys(row).forEach((key) => {
        obj[key.trim().toLowerCase()] = String(row[key]).trim();
      });
      return obj;
    });

    // Convert to menu structure similar to CSV parser
    const menuData: { [category: string]: any[] } = {};
    normalizedRows.forEach((row) => {
      const category = row.category || 'uncategorized';
      const name = row.name || row.item || '';
      const priceStr = row.price || '';
      const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.\-]/g, '')) : 0;
      const description = row.description || '';
      if (name) {
        if (!menuData[category]) menuData[category] = [];
        menuData[category].push({ name, price: isNaN(price) ? 0 : price, description });
      }
    });

    return menuData;
  }

  /**
   * Parse CSV text to menu format using Papa Parse for better CSV handling
   */
  private static parseCSVToMenu(csvText: string): any {
    try {
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
        transform: (value) => value.trim()
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      const menuData: { [category: string]: any[] } = {};
      
      parseResult.data.forEach((row: any) => {
        const category = row.category || row.Category || 'Uncategorized';
        const name = row.name || row.Name || row.item;
        const price = parseFloat(row.price || row.Price || '0') || 0;
        const description = row.description || row.Description || '';

        if (name && category) {
          if (!menuData[category]) {
            menuData[category] = [];
          }

          menuData[category].push({
            name,
            price,
            description
          });
        }
      });

      return menuData;
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      throw new Error('Invalid CSV format');
    }
  }

  /**
   * Validate file before processing
   */
  private static validateFile(file: File, documentType: OCRDocumentType): { isValid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    const supportedTypes = this.SUPPORTED_TYPES[documentType];
    if (!supportedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Unsupported file type. Supported types for ${documentType}: ${supportedTypes.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Log processing details for debugging
   */
  private static logProcessingDetails(
    file: File, 
    documentType: OCRDocumentType, 
    companyName?: string
  ) {
    console.log('OCR Processing Details:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(2)}KB`,
      fileType: file.type,
      documentType,
      companyName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Make request to OCR edge function with enhanced error recovery
   */
  private static async makeOCRRequest(request: OCRRequest): Promise<OCRResponse> {
    const retryOperation = async (operation: () => Promise<any>, attempts = 3): Promise<any> => {
      let lastError: Error | null = null;
      
      for (let i = 0; i < attempts; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.warn(`OCR attempt ${i + 1} failed:`, lastError.message);
          
          if (i < attempts - 1) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
      }
      
      throw lastError || new Error('All retry attempts failed');
    };

    const response = await retryOperation(() => 
      supabase.functions.invoke('gemini-ocr', {
        body: request
      })
    );

    if (response.error) {
      throw new Error(response.error.message || 'OCR processing failed');
    }

    return response.data;
  }

  /**
   * Main method to process a document
   */
  static async processDocument(
    file: File, 
    documentType: OCRDocumentType, 
    companyName?: string
  ): Promise<OCRProcessingResult> {
    try {
      // Log processing details
      this.logProcessingDetails(file, documentType, companyName);

      // Validate file
      const validation = this.validateFile(file, documentType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Process file based on type
      const processedFile = await this.processFile(file, documentType);

      // Handle CSV files differently
      if (processedFile.csvData) {
        return {
          success: true,
          data: processedFile.csvData
        };
      }

      // For non-CSV files, proceed with OCR
      if (!processedFile.base64) {
        return {
          success: false,
          error: 'Failed to process file'
        };
      }

      const request: OCRRequest = {
        imageBase64: processedFile.base64,
        documentType,
        companyName
      };

      const result = await this.makeOCRRequest(request);

      if (result.error) {
        return {
          success: false,
          error: result.error,
          details: result.details
        };
      }

      return {
        success: true,
        data: result.extractedData
      };

    } catch (error) {
      console.error('OCR Service Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      };
    }
  }

  /**
   * Get supported file types for a document type
   */
  static getSupportedTypes(documentType: OCRDocumentType): string[] {
    return [...this.SUPPORTED_TYPES[documentType]];
  }

  /**
   * Get all supported file types across all document types
   */
  static getAllSupportedTypes(): string[] {
    const allTypes = new Set<string>();
    Object.values(this.SUPPORTED_TYPES).forEach(types => {
      types.forEach(type => allTypes.add(type));
    });
    return Array.from(allTypes);
  }
}