interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  business_status?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesSearchResult {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GooglePlacesResponse {
  results: PlacesSearchResult[];
  status: string;
}

export class GooglePlacesService {
  private static readonly BASE_URL = 'https://maps.googleapis.com/maps/api/place';
  
  static async searchPlaces(query: string): Promise<PlacesSearchResult[]> {
    if (!query || query.length < 2) return [];
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('places-search', {
        body: { query }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Places search failed: ${error.message}`);
      }

      if (data?.error) {
        console.error('Google Places API error:', data.error);
        throw new Error(`Google Places API error: ${data.error}`);
      }
      
      if (!data?.results) {
        console.warn('No results returned from places search');
        return this.getMockResults(query);
      }

      return data.results;
    } catch (error) {
      console.error('Error searching places:', error);
      
      // Fallback to mock data for development
      return this.getMockResults(query);
    }
  }
  
  static async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('places-details', {
        body: { placeId }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Place details fetch failed: ${error.message}`);
      }

      if (data?.error) {
        console.error('Google Places API error:', data.error);
        throw new Error(`Google Places API error: ${data.error}`);
      }
      
      if (!data?.result) {
        console.warn('No result returned from place details');
        return null;
      }

      return data.result;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }
  
  static classifyBusinessType(types: string[]): 'Restaurant' | 'Retail' | 'Services' | null {
    const businessTypes = types.map(type => type.toLowerCase());
    
    // Restaurant classification
    if (businessTypes.some(type => 
      ['restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'cafe', 'bar', 'bakery'].includes(type)
    )) {
      return 'Restaurant';
    }
    
    // Retail classification
    if (businessTypes.some(type => 
      ['store', 'shopping_mall', 'clothing_store', 'electronics_store', 'grocery_or_supermarket', 'department_store'].includes(type)
    )) {
      return 'Retail';
    }
    
    // Services classification
    if (businessTypes.some(type => 
      ['services', 'establishment', 'point_of_interest'].includes(type)
    )) {
      return 'Services';
    }
    
    // Return null if can't determine - will default to Restaurant
    return null;
  }

  static parseOpeningHours(weekdayText: string[]): any {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const openingHours: any = {};
    
    days.forEach((day, index) => {
      const dayText = weekdayText.find(text => text.toLowerCase().includes(day.toLowerCase()));
      if (dayText) {
        const isOpen = !dayText.toLowerCase().includes('closed');
        let openTime = '09:00';
        let closeTime = '22:00';
        
        if (isOpen) {
          // Try to extract time from text like "Monday: 9:00 AM – 10:00 PM"
          const timeMatch = dayText.match(/(\d{1,2}):(\d{2})\s*(AM|PM).*?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeMatch;
            openTime = GooglePlacesService.convertTo24Hour(openHour, openMin, openPeriod);
            closeTime = GooglePlacesService.convertTo24Hour(closeHour, closeMin, closePeriod);
          }
        }
        
        openingHours[day] = {
          isOpen,
          openTime,
          closeTime
        };
      } else {
        openingHours[day] = {
          isOpen: true,
          openTime: '09:00',
          closeTime: '22:00'
        };
      }
    });
    
    return openingHours;
  }

  private static convertTo24Hour(hour: string, minute: string, period: string): string {
    let hourNum = parseInt(hour);
    if (period.toUpperCase() === 'PM' && hourNum !== 12) {
      hourNum += 12;
    } else if (period.toUpperCase() === 'AM' && hourNum === 12) {
      hourNum = 0;
    }
    
    return `${hourNum.toString().padStart(2, '0')}:${minute}`;
  }
  static calculateMatchPercentage(query: string, place: PlacesSearchResult): number {
    const queryLower = query.toLowerCase();
    const nameLower = place.name.toLowerCase();
    
    // Exact match
    if (nameLower === queryLower) return 95;
    
    // Starts with
    if (nameLower.startsWith(queryLower)) return 85;
    
    // Contains
    if (nameLower.includes(queryLower)) return 75;
    
    // Word match
    const queryWords = queryLower.split(' ');
    const nameWords = nameLower.split(' ');
    const matchingWords = queryWords.filter(word => 
      nameWords.some(nameWord => nameWord.includes(word))
    );
    
    if (matchingWords.length > 0) {
      return 60 + (matchingWords.length / queryWords.length) * 15;
    }
    
    return 50;
  }
  
  private static getMockResults(query: string): PlacesSearchResult[] {
    const mockResults = [
      {
        place_id: 'mock_1',
        name: "Mario's Italian Restaurant",
        vicinity: '123 Main Street, Downtown',
        types: ['restaurant', 'food', 'establishment'],
        rating: 4.5,
        user_ratings_total: 127,
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 40.7128, lng: -74.0060 }
        }
      },
      {
        place_id: 'mock_2',
        name: 'Fresh Bites Cafe',
        vicinity: '456 Oak Avenue, Midtown',
        types: ['cafe', 'restaurant', 'food'],
        rating: 4.2,
        user_ratings_total: 89,
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 40.7589, lng: -73.9851 }
        }
      },
      {
        place_id: 'mock_3',
        name: 'TechNova Solutions',
        vicinity: '789 Business Plaza, Tech District',
        types: ['establishment', 'point_of_interest'],
        rating: 4.8,
        user_ratings_total: 45,
        business_status: 'OPERATIONAL',
        geometry: {
          location: { lat: 40.7505, lng: -73.9934 }
        }
      }
    ];
    
    return mockResults.filter(result => 
      result.name.toLowerCase().includes(query.toLowerCase()) ||
      result.vicinity.toLowerCase().includes(query.toLowerCase())
    );
  }
}