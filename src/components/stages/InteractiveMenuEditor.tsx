import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  GripVertical,
  Utensils
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Lead, type MenuItem, type MenuCategory } from '@/store/useLeadStore';

interface InteractiveMenuEditorProps {
  lead: Lead;
  onClose: () => void;
  onSave: () => void;
}

interface EditingItem extends MenuItem {
  id: string;
  isNew?: boolean;
  category?: string;
}

export function InteractiveMenuEditor({ lead, onClose, onSave }: InteractiveMenuEditorProps) {
  // Convert old menu structure to new format for editing
  const [categories, setCategories] = useState<{ name: string; items: MenuItem[] }[]>(() => {
    if (!lead.menu) return [
      { name: 'Appetizers', items: [] },
      { name: 'Main Courses', items: [] },
      { name: 'Desserts', items: [] },
      { name: 'Beverages', items: [] }
    ];
    
    return Object.entries(lead.menu).map(([name, items]) => ({
      name,
      items: items || []
    }));
  });
  
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const addCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([...categories, { name: newCategoryName.trim(), items: [] }]);
      setNewCategoryName('');
    }
  };

  const removeCategory = (categoryName: string) => {
    setCategories(categories.filter(cat => cat.name !== categoryName));
  };

  const addItem = (categoryName: string) => {
    const newItem: EditingItem = {
      id: `new-${Date.now()}`,
      name: '',
      price: 0,
      description: '',
      category: categoryName,
      isNew: true
    };
    setEditingItem(newItem);
  };

  const editItem = (item: MenuItem, categoryName: string) => {
    setEditingItem({
      ...item,
      id: `${categoryName}-${item.name}`,
      category: categoryName
    });
  };

  const saveItem = () => {
    if (!editingItem || !editingItem.name.trim()) return;

    const updatedCategories = categories.map(category => {
      if (category.name === editingItem.category) {
        const existingItemIndex = category.items.findIndex(item => 
          item.name === editingItem.name && !editingItem.isNew
        );
        
        const itemToSave: MenuItem = {
          name: editingItem.name,
          price: editingItem.price,
          description: editingItem.description || '',
          hasPhoto: !!editingItem.photoUrl,
          photoUrl: editingItem.photoUrl
        };

        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...category.items];
          updatedItems[existingItemIndex] = itemToSave;
          return { ...category, items: updatedItems };
        } else {
          // Add new item
          return { ...category, items: [...category.items, itemToSave] };
        }
      }
      return category;
    });

    setCategories(updatedCategories);
    setEditingItem(null);
  };

  const removeItem = (categoryName: string, itemName: string) => {
    const updatedCategories = categories.map(category => {
      if (category.name === categoryName) {
        return {
          ...category,
          items: category.items.filter(item => item.name !== itemName)
        };
      }
      return category;
    });
    setCategories(updatedCategories);
  };

  const handlePhotoUpload = (file: File) => {
    // In a real implementation, this would upload to storage and return a URL
    const photoUrl = URL.createObjectURL(file);
    setEditingItem(prev => prev ? { ...prev, photoUrl, hasPhoto: true } : null);
  };

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const itemsWithDescriptions = categories.reduce((sum, cat) => 
    sum + cat.items.filter(item => item.description && item.description.trim().length > 0).length, 0
  );
  const itemsWithPhotos = categories.reduce((sum, cat) => 
    sum + cat.items.filter(item => item.hasPhoto || item.photoUrl).length, 0
  );

  const descriptionProgress = totalItems > 0 ? (itemsWithDescriptions / totalItems) * 100 : 0;
  const photoProgress = totalItems > 0 ? (itemsWithPhotos / totalItems) * 100 : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Interactive Menu Editor - {lead.companyName}
          </DialogTitle>
          <DialogDescription className="sr-only">Use this editor to manage menu items, descriptions, photos, and categories.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Health Dashboard */}
          <Card className="mb-4">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Menu Health Status</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{totalItems} items</Badge>
                  <Badge 
                    className={cn(
                      descriptionProgress >= 80 ? "bg-success/10 text-success border-success/20" : 
                      "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {Math.round(descriptionProgress)}% descriptions
                  </Badge>
                  <Badge 
                    className={cn(
                      photoProgress >= 50 ? "bg-success/10 text-success border-success/20" : 
                      "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {Math.round(photoProgress)}% photos
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Category Management */}
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addCategory} disabled={!newCategoryName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Menu Categories */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {categories.map((category) => (
              <Card key={category.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {category.items.length} items
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addItem(category.name)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCategory(category.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.items.map((item) => (
                      <div
                        key={item.name}
                        className="p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors"
                        onClick={() => editItem(item, category.name)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(category.name, item.name);
                              }}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium">${item.price}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 mt-2">
                            {item.description ? (
                              <Badge className="text-xs bg-success/10 text-success border-success/20">
                                Has Description
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No Description
                              </Badge>
                            )}
                            
                            {(item.hasPhoto || item.photoUrl) ? (
                              <Badge className="text-xs bg-success/10 text-success border-success/20">
                                Has Photo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No Photo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-success hover:bg-success/90">
            Save Menu Changes
          </Button>
        </DialogFooter>

        {/* Item Editor Modal */}
        {editingItem && (
          <Dialog open onOpenChange={() => setEditingItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem.isNew ? 'Add New Item' : 'Edit Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem.isNew 
                    ? 'Add a new menu item with pricing and description'
                    : 'Update the item details below'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item Name</Label>
                  <Input
                    id="item-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="Enter item name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-price">Price</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-description">Description</Label>
                  <Textarea
                    id="item-description"
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Describe this menu item..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="item-photo"
                      className="hidden"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('item-photo')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {editingItem.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {editingItem.photoUrl && (
                      <ImageIcon className="h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveItem}
                  disabled={!editingItem.name.trim()}
                >
                  Save Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}