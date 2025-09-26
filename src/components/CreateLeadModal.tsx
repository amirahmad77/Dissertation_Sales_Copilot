import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeadStore, BusinessType, type Contact } from '@/store/useLeadStore';
import { GooglePlacesService } from '@/services/GooglePlacesService';
import { Search, Building2, MapPin, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LeadForm } from './LeadForm';

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadModal({ open, onOpenChange }: CreateLeadModalProps) {
  const { addLead } = useLeadStore();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await GooglePlacesService.searchPlaces(value);
      
      // Sort results by match percentage (descending), then by rating (descending)
      const sortedResults = results.slice(0, 10).sort((a, b) => {
        const matchA = GooglePlacesService.calculateMatchPercentage(value, a);
        const matchB = GooglePlacesService.calculateMatchPercentage(value, b);
        
        // First sort by match percentage (descending)
        if (matchB !== matchA) {
          return matchB - matchA;
        }
        
        // Then sort by rating (descending), treating no rating as 0
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
      
      setSearchResults(sortedResults.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for places. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceSelect = async (place: PlaceResult) => {
    setSelectedPlace(place);
    setIsSearching(true);
    
    try {
      const details = await GooglePlacesService.getPlaceDetails(place.place_id);
      const businessType = GooglePlacesService.classifyBusinessType(place.types) || 'Restaurant';

      if (!details) {
        toast({
          title: "Limited Place Details",
          description: "We couldn't retrieve the full business profile. The form will be pre-filled with available information.",
        });
      }

      // Pre-populate form with API data
      const initialFormData = {
        companyName: place.name,
        address: details?.formatted_address || place.vicinity,
        primaryContactPhone: details?.formatted_phone_number || '',
        businessType,
        primaryContactName: '',
        primaryContactEmail: '',
        openingHours: details?.opening_hours?.weekday_text || null
      };

      setFormInitialData(initialFormData);
      setShowForm(true);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to get place details:', error);
      toast({
        title: "Place Details Error",
        description: "We couldn't fetch the detailed profile for this business. You can still proceed with manual entry.",
        variant: "destructive",
      });
      // Fallback to basic data
      const businessType = GooglePlacesService.classifyBusinessType(place.types) || 'Restaurant';
      const initialFormData = {
        companyName: place.name,
        address: place.vicinity,
        primaryContactPhone: '',
        businessType,
        primaryContactName: '',
        primaryContactEmail: '',
        openingHours: null
      };
      setFormInitialData(initialFormData);
      setShowForm(true);
      setSearchResults([]);
      setSearchQuery('');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    console.log('CreateLeadModal: Form submission received', formData);
    setIsSubmitting(true);
    
    try {
      // For now, just console.log the data as per specifications
      console.log('Lead Form Data:', {
        companyName: formData.companyName,
        primaryContactName: formData.primaryContactName,
        primaryContactPhone: formData.primaryContactPhone,
        primaryContactEmail: formData.primaryContactEmail,
        address: formData.address,
        businessType: formData.businessType,
        // Additional data from selected place if available
        placeId: selectedPlace?.place_id,
        rating: selectedPlace?.rating,
      });
      
      // Save lead to store
      console.log('Adding lead to store...');
      const newLeadContacts: Contact[] = (formData.primaryContactName || formData.primaryContactPhone || formData.primaryContactEmail)
        ? [{
            id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: formData.primaryContactName || 'Primary Contact',
            role: 'Primary',
            phone: formData.primaryContactPhone,
            email: formData.primaryContactEmail
          }]
        : [];

      addLead({
        companyName: formData.companyName,
        contactName: formData.primaryContactName || '',
        phone: formData.primaryContactPhone,
        email: formData.primaryContactEmail,
        address: formData.address,
        businessType: formData.businessType as BusinessType,
        rating: selectedPlace?.rating,
        priority: 'Medium',
        value: 10000, // Default value
        placeId: selectedPlace?.place_id,
        openingHours: formData.openingHours ? GooglePlacesService.parseOpeningHours(formData.openingHours) : undefined,
        contacts: newLeadContacts,
      });
      
      console.log('Lead added successfully');
      toast({
        title: "Lead Created",
        description: `Lead for ${formData.companyName} created.`,
      });
      
      resetModal();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowForm(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setFormInitialData(null);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetModal(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create a New Lead
          </DialogTitle>
          <DialogDescription>
            Search for existing businesses or enter lead information manually to start the activation process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Smart Search Section */}
          {!showForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Smart Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Enter company name or keywords..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-12 text-base border-2 focus:border-primary"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.length >= 3 && searchResults.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select a company:</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((place, index) => {
                      const matchPercentage = GooglePlacesService.calculateMatchPercentage(searchQuery, place);
                      const businessType = GooglePlacesService.classifyBusinessType(place.types);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handlePlaceSelect(place)}
                          className="w-full p-4 text-left bg-card border rounded-lg hover:bg-muted/50 transition-colors duration-200 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                  {place.name}
                                </p>
                                {place.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm text-muted-foreground">
                                      {place.rating} ({place.user_ratings_total})
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span>{place.vicinity}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                matchPercentage >= 85 ? 'bg-green-100 text-green-700' :
                                matchPercentage >= 75 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {matchPercentage}% match
                              </span>
                              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                {businessType}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results Found */}
              {searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No results found</p>
                  <p className="text-sm">Try a different search term or enter manually</p>
                </div>
              )}

              {/* Manual Entry Button */}
              <Button
                variant="outline"
                onClick={() => setShowForm(true)}
                className="w-full h-12 text-base"
              >
                Enter Manually
              </Button>
            </div>
          )}

          {/* Lead Form */}
          {showForm && (
            <LeadForm
              initialData={formInitialData}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}