/**
 * Supabase Edge Function that proxies Google Places search suggestions so the frontend can
 * surface location autocomplete without exposing API keys.
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
    const { query } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    
    console.log(`Places search request: "${query}"`)
    
    if (!apiKey) {
      console.error('Google Places API key not configured')
      throw new Error('Google Places API key not configured')
    }

    // Use Places API (New) v1
    const url = 'https://places.googleapis.com/v1/places:searchText'
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.businessStatus'
    }
    
    const body = {
      textQuery: `${query} Saudi Arabia`,
      languageCode: 'en',
      pageSize: 10,
      locationBias: {
        rectangle: {
          low: { latitude: 16.0, longitude: 34.0 },
          high: { latitude: 32.5, longitude: 55.7 }
        }
      }
    }
    
    console.log('Making request to Google Places API v1...')
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    console.log(`Google API response status: ${response.status}`)
    
    if (!response.ok) {
      console.error('Google Places API error:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Places search failed', 
          details: data.error?.message || 'Unknown error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        }
      )
    }

    // Map Google Places API v1 response to legacy format for frontend compatibility
    const mappedResults = {
      results: (data.places || []).map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || '',
        vicinity: place.formattedAddress || '',
        types: (place.types || []).map((t: string) => t.toLowerCase()),
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        business_status: place.businessStatus,
        geometry: {
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0
          }
        }
      })),
      status: 'OK'
    }
    
    console.log(`Returning ${mappedResults.results.length} results`)
    
    return new Response(
      JSON.stringify(mappedResults),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Places search error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})