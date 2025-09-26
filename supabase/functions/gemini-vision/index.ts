/**
 * Supabase Edge Function that uses Gemini Vision to assess marketing assets and return quality feedback.
 * It powers storefront readiness checks for images uploaded through the onboarding flow.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentType, companyName } = await req.json();

    if (!imageBase64 || !documentType) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or documentType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let prompt = '';
    if (documentType === 'logo') {
      prompt = "Analyze this image and determine if it is a suitable logo for a business. Check for low resolution, blurriness, inappropriate content, or unprofessional appearance. Answer with a JSON object: { \"isSuitable\": boolean, \"reason\": \"your explanation\" }.";
    } else if (documentType === 'coverPhoto') {
      prompt = "Analyze this image and determine if it is a suitable cover photo for a business. Check for low resolution, blurriness, inappropriate content, or unprofessional appearance. Answer with a JSON object: { \"isSuitable\": boolean, \"reason\": \"your explanation\" }.";
    } else if (documentType === 'storePhoto') {
      prompt = `Analyze this image. Does it clearly show an external storefront for a business named '${companyName}'? Look for visible business signage, storefront architecture, and clear identification of the business. Answer with a JSON object: { \"isMatch\": boolean, \"reason\": \"your explanation\" }.`;
    } else if (documentType === 'menu') {
      prompt = "Analyze this menu image. Extract all food and drink items with their prices and descriptions. Structure the output as a single valid JSON object with the following format: { \"categories\": [ { \"name\": \"category name\", \"items\": [ { \"name\": \"item name\", \"price\": number, \"description\": \"item description if available\" } ] } ] }. If you cannot clearly read the menu, return { \"error\": \"Could not read menu clearly\" }.";
    } else {
      return new Response(JSON.stringify({ error: 'Invalid document type. Supported types: logo, coverPhoto, storePhoto, menu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove data:image/...;base64, prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log(`Processing ${documentType} image for ${companyName || 'unknown company'}`);

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
                mime_type: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to process image with Gemini API', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;

    if (!generatedText) {
      console.error('No text generated from image');
      return new Response(JSON.stringify({ error: 'No text generated from image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generated text:', generatedText);

    // Try to parse JSON from the response
    let extractedData;
    try {
      // Remove potential markdown code blocks
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', generatedText);
      
      // For vision tasks, return a fallback response
      if (documentType === 'logo' || documentType === 'coverPhoto') {
        extractedData = {
          isSuitable: false,
          reason: "Could not automatically verify image quality. Please review manually."
        };
      } else if (documentType === 'storePhoto') {
        extractedData = {
          isMatch: false,
          reason: "Could not automatically verify storefront match. Please review manually."
        };
      } else if (documentType === 'menu') {
        extractedData = {
          error: "Could not automatically read menu. Please build it manually using the editor."
        };
      } else {
        return new Response(JSON.stringify({ error: 'Failed to parse extracted data as JSON' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Successfully processed', documentType, 'for', companyName);

    return new Response(JSON.stringify({ extractedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in gemini-vision function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});