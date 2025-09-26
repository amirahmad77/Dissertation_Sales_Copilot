import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check,
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  Upload, 
  Image as ImageIcon, 
  Camera, 
  Store, 
  Menu as MenuIcon,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Lead } from '@/store/useLeadStore';
import { InteractiveMenuEditor } from './InteractiveMenuEditor';

interface StorefrontMenuStageProps {
  lead: Lead;
  processingStates: Record<string, boolean>;
  onFileUpload: (file: File, documentType: string) => Promise<void>;
  onMarkComplete: () => void;
}

interface AssetUpload {
  type: 'logo' | 'coverPhoto' | 'storePhoto' | 'menu';
  label: string;
  icon: React.ReactNode;
  description: string;
  acceptedFormats: string;
  required: boolean;
}

const assetUploads: AssetUpload[] = [
  {
    type: 'logo',
    label: 'Business Logo',
    icon: <ImageIcon className="h-5 w-5" />,
    description: 'High-quality logo for branding',
    acceptedFormats: 'JPG, PNG',
    required: true
  },
  {
    type: 'coverPhoto',
    label: 'Cover Photo',
    icon: <Camera className="h-5 w-5" />,
    description: 'Attractive cover image for your business',
    acceptedFormats: 'JPG, PNG',
    required: true
  },
  {
    type: 'storePhoto',
    label: 'Storefront Photo',
    icon: <Store className="h-5 w-5" />,
    description: 'Clear photo of your business exterior',
    acceptedFormats: 'JPG, PNG',
    required: true
  },
  {
    type: 'menu',
    label: 'Menu',
    icon: <MenuIcon className="h-5 w-5" />,
        description: 'Menu with items, prices, and descriptions',
        acceptedFormats: 'PDF, JPG, PNG, CSV, XLSX, XLS (use Import for CSV/Excel)',
    required: true
  }
];

export function StorefrontMenuStage({ lead, processingStates, onFileUpload, onMarkComplete }: StorefrontMenuStageProps) {
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => () => {
    Object.values(previewUrls).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
  }, [previewUrls]);

  const handleFileSelect = async (file: File, documentType: string) => {
    if (file.type.startsWith('image/')) {
      setPreviewUrls(prev => {
        const existing = prev[documentType];
        if (existing) {
          URL.revokeObjectURL(existing);
        }
        return { ...prev, [documentType]: URL.createObjectURL(file) };
      });
    } else if (previewUrls[documentType]) {
      setPreviewUrls(prev => {
        const existing = prev[documentType];
        if (existing) {
          URL.revokeObjectURL(existing);
        }
        const { [documentType]: _removed, ...rest } = prev;
        return rest;
      });
    }

    await onFileUpload(file, documentType);
  };

  const getAssetStatus = (type: string) => {
    if (processingStates[type]) return 'processing';
    
    // Check document status instead of assets for consistency with isStageComplete
    const documentStatus = lead.documents[type as keyof typeof lead.documents];
    return documentStatus === 'Verified' ? 'completed' : 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Processing...</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Needs Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Menu Health Calculations
  const menuItems = lead.menu ? Object.values(lead.menu).flat() : [];
  const totalItems = menuItems.length;
  const itemsWithDescriptions = menuItems.filter(item => item.description && item.description.trim().length > 0).length;
  const itemsWithPhotos = menuItems.filter(item => item.hasPhoto || item.photoUrl).length;
  
  const descriptionProgress = totalItems > 0 ? (itemsWithDescriptions / totalItems) * 100 : 0;
  const photoProgress = totalItems > 0 ? (itemsWithPhotos / totalItems) * 100 : 0;
  
  const meetsDescriptionRule = descriptionProgress >= 80;
  const meetsPhotoRule = photoProgress >= 50;
  const meetsItemCountRule = totalItems >= 15;
  
  const menuHealthScore = (
    (meetsDescriptionRule ? 1 : 0) +
    (meetsPhotoRule ? 1 : 0) +
    (meetsItemCountRule ? 1 : 0)
  ) / 3 * 100;

  const assetsComplete = assetUploads.every(asset => getAssetStatus(asset.type) === 'completed');
  const menuHealthComplete = meetsDescriptionRule && meetsPhotoRule && meetsItemCountRule;
  const isComplete = assetsComplete && menuHealthComplete;

  return (
    <div className="space-y-6">
      {/* Asset Upload Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Business Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assetUploads.map((asset) => {
              const status = getAssetStatus(asset.type);
              return (
                <div
                  key={asset.type}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                    status === 'completed' ? "border-success bg-success/5" : 
                    status === 'processing' ? "border-primary bg-primary/5" :
                    "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-center mb-2">
                    {asset.icon}
                    <div className="ml-2">{getStatusIcon(status)}</div>
                  </div>
                  
                  <h3 className="font-medium mb-1">{asset.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{asset.description}</p>
                  
                  <div className="mb-3">{getStatusBadge(status)}</div>
                  
                  <input
                    type="file"
                    id={`upload-${asset.type}`}
                    className="hidden"
                    accept={asset.type === 'menu' ? '.pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls' : '.jpg,.jpeg,.png'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileSelect(file, asset.type);
                      e.target.value = '';
                    }}
                    disabled={processingStates[asset.type]}
                  />
                  {asset.type === 'menu' && (
                    <input
                      type="file"
                      id="upload-menu-csv"
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileSelect(file, asset.type);
                        e.target.value = '';
                      }}
                      disabled={processingStates[asset.type]}
                    />
                  )}

                  <Button
                    variant={status === 'completed' ? 'outline' : 'default'}
                    size="sm"
                    disabled={processingStates[asset.type]}
                    onClick={() => document.getElementById(`upload-${asset.type}`)?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {status === 'completed' ? 'Replace' : 'Upload'}
                  </Button>

                  {asset.type === 'menu' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processingStates[asset.type]}
                      onClick={() => document.getElementById('upload-menu-csv')?.click()}
                      className="w-full mt-2"
                    >
                      Import from CSV/Excel
                    </Button>
                  )}

                  {previewUrls[asset.type] && (
                    <div className="relative mt-4 overflow-hidden rounded-md border">
                      <img
                        src={previewUrls[asset.type]}
                        alt={`${asset.label} preview`}
                        className="h-32 w-full object-cover"
                      />
                      {processingStates[asset.type] && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs font-medium">Analyzing with Gemini...</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Formats: {asset.type === 'menu' ? 'PDF, JPG, PNG, CSV, XLSX, XLS' : asset.acceptedFormats}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Menu Health Dashboard */}
      {(menuItems.length > 0 || lead.documents.menu === 'Verified') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Menu Health Score</CardTitle>
              <Badge 
                className={cn(
                  "text-sm",
                  menuHealthScore >= 100 ? "bg-success/10 text-success border-success/20" :
                  menuHealthScore >= 60 ? "bg-warning/10 text-warning border-warning/20" :
                  "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {Math.round(menuHealthScore)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Item Descriptions Rule */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Items with Descriptions</span>
                  <span className={cn(meetsDescriptionRule ? "text-success" : "text-muted-foreground")}>
                    {itemsWithDescriptions}/{totalItems} ({Math.round(descriptionProgress)}%)
                  </span>
                </div>
                <Progress value={descriptionProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Requirement: At least 80% of items must have descriptions
                </p>
              </div>

              {/* Item Photos Rule */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Items with Photos</span>
                  <span className={cn(meetsPhotoRule ? "text-success" : "text-muted-foreground")}>
                    {itemsWithPhotos}/{totalItems} ({Math.round(photoProgress)}%)
                  </span>
                </div>
                <Progress value={photoProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Requirement: At least 50% of items must have photos
                </p>
              </div>

              {/* Item Count Rule */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Menu Items</span>
                  <span className={cn(meetsItemCountRule ? "text-success" : "text-muted-foreground")}>
                    {totalItems}
                  </span>
                </div>
                <Progress value={Math.min((totalItems / 15) * 100, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Requirement: Minimum 15 items on the menu
                </p>
              </div>
            </div>

            {!menuHealthComplete && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your menu doesn't meet all quality requirements yet. Use the Menu Editor to enhance items with descriptions and photos.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={() => setShowMenuEditor(true)}
              className="w-full"
            >
              <MenuIcon className="h-4 w-4 mr-2" />
              Open Menu Editor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu Editor Modal */}
      {showMenuEditor && (
        <InteractiveMenuEditor
          lead={lead}
          onClose={() => setShowMenuEditor(false)}
          onSave={() => setShowMenuEditor(false)}
        />
      )}

      {/* Stage Completion */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
        <div className="space-y-1">
          <h3 className="font-medium">Stage Requirements</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className={cn("flex items-center gap-1", assetsComplete ? "text-success" : "")}>
              {assetsComplete ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              All Assets Uploaded
            </span>
            <span className={cn("flex items-center gap-1", menuHealthComplete ? "text-success" : "")}>
              {menuHealthComplete ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              Menu Health Complete
            </span>
          </div>
        </div>
        
        <Button 
          onClick={onMarkComplete}
          disabled={!isComplete}
          className={cn(
            "bg-success hover:bg-success/90 text-success-foreground",
            !isComplete && "opacity-50 cursor-not-allowed"
          )}
        >
          {isComplete ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Complete Storefront & Menu
            </>
          ) : (
            'Requirements Not Met'
          )}
        </Button>
      </div>
    </div>
  );
}