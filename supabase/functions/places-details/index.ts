/**
 * Supabase Edge Function that proxies Google Places Details lookups to enrich lead locations
 * with formatted addresses, coordinates, and contact data.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { placeId } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    console.log(`Places details request: "${placeId}"`)
    
    if (!apiKey) {
      console.error('Google Places API key not configured')
      throw new Error('Google Places API key not configured')
    }

    // Use Places API (New) v1
    const placePath = placeId.startsWith('places/') ? placeId : `places/${placeId}`
    const url = `https://places.googleapis.com/v1/${placePath}`
    const headers = {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,location,types,rating,userRatingCount,priceLevel,businessStatus'
    }
    
    console.log('Making request to Google Places API v1 for details...')
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    
    const data = await response.json()
    console.log(`Google API details response status: ${response.status}`)
    
    if (!response.ok) {
      console.error('Google Places API details error:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Place details fetch failed', 
          details: data.error?.message || 'Unknown error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        }
      )
    }

    // Map Google Places API v1 response to legacy format for frontend compatibility
    const mappedResult = {
      result: {
        place_id: data.id,
        name: data.displayName?.text || '',
        formatted_address: data.formattedAddress || '',
        formatted_phone_number: data.nationalPhoneNumber || '',
        international_phone_number: data.internationalPhoneNumber || '',
        website: data.websiteUri || '',
        opening_hours: data.regularOpeningHours ? {
          open_now: data.regularOpeningHours.openNow,
          weekday_text: data.regularOpeningHours.weekdayDescriptions || []
        } : undefined,
        geometry: {
          location: {
            lat: data.location?.latitude || 0,
            lng: data.location?.longitude || 0
          }
        },
        types: (data.types || []).map((t: string) => t.toLowerCase()),
        rating: data.rating,
        user_ratings_total: data.userRatingCount,
        price_level: data.priceLevel,
        business_status: data.businessStatus
      },
      status: 'OK'
    }
    
    console.log('Returning place details')
    
    return new Response(
      JSON.stringify(mappedResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Places details error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})