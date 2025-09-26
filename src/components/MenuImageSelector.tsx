import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Image as ImageIcon, ExternalLink, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuImageSelectorProps {
  onSelectImage: (imageUrl: string) => void;
  onClose: () => void;
  itemName?: string;
}

const STOCK_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300', category: 'Pizza', keywords: ['pizza', 'italian', 'cheese'] },
  { id: 2, url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', category: 'Burger', keywords: ['burger', 'fast food', 'meat'] },
  { id: 3, url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300', category: 'Salad', keywords: ['salad', 'healthy', 'vegetables'] },
  { id: 4, url: 'https://images.unsplash.com/photo-1563379091339-03246963d675?w=300', category: 'Pasta', keywords: ['pasta', 'italian', 'noodles'] },
  { id: 5, url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300', category: 'Pancakes', keywords: ['pancakes', 'breakfast', 'sweet'] },
  { id: 6, url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300', category: 'Sandwich', keywords: ['sandwich', 'lunch', 'bread'] },
  { id: 7, url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300', category: 'Soup', keywords: ['soup', 'hot', 'comfort'] },
  { id: 8, url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300', category: 'Steak', keywords: ['steak', 'meat', 'grill'] },
  { id: 9, url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300', category: 'Tacos', keywords: ['tacos', 'mexican', 'spicy'] },
  { id: 10, url: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=300', category: 'Sushi', keywords: ['sushi', 'japanese', 'fish'] },
  { id: 11, url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', category: 'Coffee', keywords: ['coffee', 'drink', 'hot'] },
  { id: 12, url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300', category: 'Smoothie', keywords: ['smoothie', 'healthy', 'fruit'] },
];

export function MenuImageSelector({ onSelectImage, onClose, itemName }: MenuImageSelectorProps) {
  const [searchTerm, setSearchTerm] = useState(itemName || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customUrl, setCustomUrl] = useState('');

  const categories = [...new Set(STOCK_IMAGES.map(img => img.category))];

  const filteredImages = STOCK_IMAGES.filter(image => {
    const matchesSearch = searchTerm === '' || 
      image.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || image.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleImageSelect = (imageUrl: string) => {
    onSelectImage(imageUrl);
    onClose();
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      onSelectImage(customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Select Image {itemName && `for "${itemName}"`}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Search and Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search Images</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by food type or category..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom URL Input */}
          <div className="border-t pt-4">
            <Label htmlFor="customUrl" className="text-sm font-medium">Or use custom image URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="customUrl"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1"
              />
              <Button onClick={handleCustomUrl} disabled={!customUrl.trim()}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Use URL
              </Button>
            </div>
          </div>

          {/* Stock Images Grid */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Stock Images</Label>
            {filteredImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No images found matching your search.</p>
                <p className="text-sm">Try different keywords or browse all categories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                    onClick={() => handleImageSelect(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={image.category}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Select
                      </Button>
                    </div>
                    <Badge 
                      className="absolute top-1 left-1 text-xs bg-black/70 text-white border-none"
                      variant="secondary"
                    >
                      {image.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}