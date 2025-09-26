/**
 * Supabase Edge Function that submits uploaded documents to the Gemini API for OCR and quality checks.
 * It normalises responses for CR, IBAN, and branding assets so the frontend can update onboarding data.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OCR Prompt Configuration - Easy to update and maintain
const OCR_PROMPTS = {
  cr: {
    prompt: `Analyze this image of a Commercial Registration document.

    Extract the following fields and return them as a valid JSON object:
    - 'officialBusinessName': The official registered business name
    - 'ownerName': The name of the business owner
    - 'taxNumber': The registered tax identification number
    - 'legalForm': The legal entity type of the business (e.g., Sole Proprietorship, LLC)

    If any field is not clearly visible or readable, set its value to null.
    Return only the JSON object, no additional text.`,
    maxOutputTokens: 1024,
    temperature: 0.1
  },

  iban: {
    prompt: `Analyze this image of a bank document or IBAN certificate.

    Extract the following fields and return them as a valid JSON object:
    - 'accountOwnerName': The name of the account holder
    - 'ibanNumber': The IBAN number (format: country code + check digits + account number)
    - 'bankName': The bank name on the document
    - 'swiftCode': The SWIFT/BIC code if present

    If any field is not clearly visible or readable, set its value to null.
    Ensure the IBAN format is correct if found.
    Return only the JSON object, no additional text.`,
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
    maxOutputTokens: 2048,
    temperature: 0.1
  }
};

// Helper function to get formatted prompt
function getFormattedPrompt(documentType: string, companyName?: string): string {
  const config = OCR_PROMPTS[documentType as keyof typeof OCR_PROMPTS];
  if (!config) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentType, companyName } = await req.json();

    console.log(`Processing OCR request - Type: ${documentType}, Company: ${companyName || 'N/A'}`);

    if (!imageBase64 || !documentType) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or documentType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the appropriate prompt configuration
    const config = OCR_PROMPTS[documentType as keyof typeof OCR_PROMPTS];
    if (!config) {
      return new Response(JSON.stringify({ error: `Invalid document type: ${documentType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = getFormattedPrompt(documentType, companyName);

    // Detect file type and extract base64 data
    let mimeType = "image/jpeg"; // default
    let cleanBase64 = imageBase64;

    // Check if it's a data URL and extract mime type
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.*)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      cleanBase64 = dataUrlMatch[2];
    } else {
      // If it's already clean base64, just use it
      cleanBase64 = imageBase64;
    }

    // Validate base64 string
    try {
      atob(cleanBase64);
    } catch (e) {
      console.error('Invalid base64 string');
      return new Response(JSON.stringify({ 
        error: 'Invalid base64 string provided',
        details: 'The image data must be a valid base64 encoded string'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing file with mime type:', mimeType);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: config.temperature,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: config.maxOutputTokens,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to process image with Gemini API', 
        details: errorText.substring(0, 500) // Log first 500 chars
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;

    if (!generatedText) {
      return new Response(JSON.stringify({ error: 'No text generated from image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse JSON from the response
    let extractedData;
    try {
      // Remove potential markdown code blocks
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanedText);
      
      console.log(`OCR processing successful for ${documentType}:`, JSON.stringify(extractedData, null, 2));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response text:', generatedText);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse extracted data as JSON',
        details: `Parse error: ${(parseError as Error).message}. Raw response: ${generatedText.substring(0, 200)}...`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in gemini-ocr function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      details: 'Unexpected error in OCR processing'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});