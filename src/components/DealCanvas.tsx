import { useLeadStore, type MenuCategory, type MenuItem } from '@/store/useLeadStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OCRService } from '@/services/OCRService';
import { OCRDocumentType } from '@/types/ocr';
import { 
  X, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CreditCard,
  Upload,
  Image,
  Camera,
  Menu,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Package,
  Truck,
  Zap,
  Star,
  Calculator,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';

// Tariff and Package Types
interface Tariff {
  id: string;
  name: string;
  type: 'Own Delivery' | 'Platform Delivery' | 'Hybrid';
  minOrders: number;
  commission: number;
  description: string;
  recommended?: boolean;
}

interface PackageItem {
  id: string;
  name: string;
  type: 'commission' | 'charge' | 'asset';
  amount: number;
  description?: string;
}

interface PackageConfig {
  tariffId: string;
  items: PackageItem[];
  totalPrice: number;
  estimatedCommission: number;
}

// Mock Tariff Data
const mockTariffs: Tariff[] = [
  {
    id: '1',
    name: 'OD Basic Own Delivery',
    type: 'Own Delivery',
    minOrders: 10,
    commission: 12,
    description: 'Perfect for restaurants with existing delivery infrastructure'
  },
  {
    id: '2', 
    name: 'OD Premium Own Delivery',
    type: 'Own Delivery',
    minOrders: 50,
    commission: 15,
    description: 'Enhanced features for high-volume restaurants'
  },
  {
    id: '3',
    name: 'PD Standard Platform Delivery',
    type: 'Platform Delivery',
    minOrders: 5,
    commission: 18,
    description: 'Let us handle delivery while you focus on cooking'
  },
  {
    id: '4',
    name: 'PD Express Platform Delivery',
    type: 'Platform Delivery', 
    minOrders: 25,
    commission: 20,
    description: 'Priority delivery with premium support'
  },
  {
    id: '5',
    name: 'Hybrid Flex Solution',
    type: 'Hybrid',
    minOrders: 15,
    commission: 16,
    description: 'Best of both worlds - own and platform delivery'
  }
];

export function DealCanvas() {
  // This component is now deprecated - replaced by AgentCoPilotCanvas
  return null;
}

export function DealCanvasLegacy() {
  const { 
    selectedLeadId, 
    setSelectedLeadId, 
    leads, 
    updateDocumentStatus, 
    updateExtractedData, 
    updateMenu,
    updateLeadStatus,
    getActivationScore,
    getMenuHealthScore
  } = useLeadStore();
  const { toast } = useToast();
  const [processingStates, setProcessingStates] = useState<{ [key: string]: boolean }>({});
  const [editingMenu, setEditingMenu] = useState(false);
  
  // Package Builder State
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);
  const [deliveryModel, setDeliveryModel] = useState<'Own Delivery' | 'Platform Delivery' | 'Hybrid'>('Own Delivery');
  const [expectedOrders, setExpectedOrders] = useState([50]);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  const crFileRef = useRef<HTMLInputElement>(null);
  const ibanFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const coverPhotoFileRef = useRef<HTMLInputElement>(null);
  const storePhotoFileRef = useRef<HTMLInputElement>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);
  
  const selectedLead = selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) : null;

  if (!selectedLeadId || !selectedLead) {
    return null;
  }

  const handleClose = () => {
    setSelectedLeadId(null);
  };

  // File upload handler - Now using OCR Service
  const handleFileUpload = async (file: File, documentType: OCRDocumentType) => {
    if (!file || !selectedLeadId) return;

    const result = await OCRService.processDocument(file, documentType, selectedLead?.companyName);
    
    if (!result.success) {
      toast({
        title: "Processing Failed",
        description: result.error || "Failed to process the file. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setProcessingStates(prev => ({ ...prev, [documentType]: true }));
    updateDocumentStatus(selectedLeadId, documentType, "Processing...");

    try {
      if (result.data) {
        if (documentType === 'cr' || documentType === 'iban') {
          updateExtractedData(selectedLeadId, documentType, result.data);
          updateDocumentStatus(selectedLeadId, documentType, "Verified");
          toast({
            title: "Document Processed Successfully",
            description: `${documentType === 'cr' ? 'Commercial Registration' : 'Bank IBAN Letter'} has been analyzed and data extracted.`,
          });
        } else if (documentType === 'menu') {
          if (result.data) {
            updateMenu(selectedLeadId, result.data);
            updateDocumentStatus(selectedLeadId, documentType, "Verified");
            toast({
              title: "Menu Processed Successfully",
              description: `Menu has been processed successfully. Found ${Object.keys(result.data).length} categories.`,
            });
          }
        } else {
          // For logo, coverPhoto, storePhoto - handle suitability check
          const isValid = result.data.isSuitable !== false && result.data.isMatch !== false;
          updateDocumentStatus(selectedLeadId, documentType, isValid ? "Verified" : "Needs Review");
          toast({
            title: isValid ? "Image Verified" : "Image Needs Review",
            description: result.data.reason || "Image has been processed.",
            variant: isValid ? "default" : "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      updateDocumentStatus(selectedLeadId, documentType, "Needs Review");
      toast({
        title: "Processing Failed",
        description: "Failed to process the file. Please try again or review manually.",
        variant: "destructive"
      });
    } finally {
      setProcessingStates(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const getReconciliationStatus = (contactName: string, extractedOwnerName?: string) => {
    if (!extractedOwnerName) return null;
    
    const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedContact = normalize(contactName);
    const normalizedOwner = normalize(extractedOwnerName);
    
    return normalizedContact.includes(normalizedOwner) || normalizedOwner.includes(normalizedContact);
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'Restaurant':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Retail':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Services':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium': 
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddMenuItem = (category: string) => {
    if (!selectedLead?.menu || !selectedLeadId) return;
    
    const updatedMenu = { ...selectedLead.menu };
    if (!updatedMenu[category]) {
      updatedMenu[category] = [];
    }
    updatedMenu[category].push({ name: "New Item", price: 0, description: "", hasPhoto: false });
    updateMenu(selectedLeadId, updatedMenu);
  };

  const handleUpdateMenuItem = (category: string, index: number, field: keyof MenuItem, value: string | number) => {
    if (!selectedLead?.menu || !selectedLeadId) return;
    
    const updatedMenu = { ...selectedLead.menu };
    updatedMenu[category][index] = { ...updatedMenu[category][index], [field]: value };
    updateMenu(selectedLeadId, updatedMenu);
  };

  const handleDeleteMenuItem = (category: string, index: number) => {
    if (!selectedLead?.menu || !selectedLeadId) return;
    
        const updatedMenu = { ...selectedLead.menu };
    updatedMenu[category].splice(index, 1);
    if (updatedMenu[category].length === 0) {
      delete updatedMenu[category];
    }
    updateMenu(selectedLeadId, updatedMenu);
  };

  const handleAddCategory = () => {
    if (!selectedLeadId) return;
    
    const updatedMenu = selectedLead?.menu ? { ...selectedLead.menu } : {};
    const newCategoryName = `New Category ${Object.keys(updatedMenu).length + 1}`;
    updatedMenu[newCategoryName] = [];
    updateMenu(selectedLeadId, updatedMenu);
  };

  // Dynamic calculations
  const activationScore = selectedLeadId ? getActivationScore(selectedLeadId) : 0;
  const menuHealthScores = selectedLeadId ? getMenuHealthScore(selectedLeadId) : { menuHealth: 0, itemOptimization: 0, pricingEfficiency: 0 };
  const totalMenuItems = selectedLead?.menu ? Object.values(selectedLead.menu).flat().length : 0;

  // Package Builder Functions
  const filteredTariffs = mockTariffs.filter(tariff => 
    tariff.type === deliveryModel && tariff.minOrders <= expectedOrders[0]
  );

  const recommendedTariff = filteredTariffs.length > 0 ? filteredTariffs.reduce((prev, current) => 
    current.minOrders > prev.minOrders ? current : prev
  , filteredTariffs[0]) : null;

  const calculatePackageTotal = () => {
    const tariffBase = selectedTariff?.commission || 0;
    const itemsTotal = packageItems.reduce((sum, item) => sum + item.amount, 0);
    return tariffBase + itemsTotal;
  };

  const calculateEstimatedCommission = () => {
    const total = calculatePackageTotal();
    const commissionRate = selectedTariff?.commission || 0;
    return Math.round((total * commissionRate) / 100);
  };

  const handleContinueToPackageBuilder = () => {
    if (activationScore >= 100) {
      setShowPackageBuilder(true);
    }
  };

  const handleBackToOnboarding = () => {
    setShowPackageBuilder(false);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const addPackageItem = (type: 'commission' | 'charge' | 'asset', name: string, amount: number, description?: string) => {
    const newItem: PackageItem = {
      id: `${type}_${Date.now()}`,
      name,
      type,
      amount,
      description
    };
    setPackageItems(prev => [...prev, newItem]);
    
    // Intelligent dependency resolution
    if (type === 'asset' && name.toLowerCase().includes('printer')) {
      const hasDeliveryFee = packageItems.some(item => 
        item.type === 'charge' && item.name.toLowerCase().includes('delivery')
      );
      if (!hasDeliveryFee) {
        toast({
          title: "Dependency Notice",
          description: "This asset requires a delivery fee. Please add one from 'Additional Charges'.",
          variant: "default"
        });
      }
    }
  };

  const removePackageItem = (itemId: string) => {
    setPackageItems(prev => prev.filter(item => item.id !== itemId));
  };

  const generateAndSendProposal = () => {
    const contractData = generateContractData();
    
    if (contractData) {
      sendForSignature(contractData);
    }
  };

  const generateContractData = () => {
    if (!selectedLead || !selectedTariff) return null;

    const contractData = {
      // Lead Information
      lead: {
        id: selectedLead.id,
        companyName: selectedLead.companyName,
        contactName: selectedLead.contactName,
        phone: selectedLead.phone,
        email: selectedLead.email,
        address: selectedLead.address,
        businessType: selectedLead.businessType,
        priority: selectedLead.priority,
        value: selectedLead.value
      },
      
      // Verified Legal Data from OCR
      legalData: {
        commercialRegistration: selectedLead.extractedData?.cr || null,
        bankDetails: selectedLead.extractedData?.iban || null
      },
      
      // Complete Menu Structure
      menuStructure: selectedLead.menu || null,
      
      // Package Configuration
      packageConfiguration: {
        selectedTariff: {
          id: selectedTariff.id,
          name: selectedTariff.name,
          type: selectedTariff.type,
          commission: selectedTariff.commission,
          description: selectedTariff.description
        },
        additionalItems: packageItems,
        totalValue: calculatePackageTotal(),
        estimatedCommission: calculateEstimatedCommission(),
        deliveryModel: deliveryModel,
        expectedDailyOrders: expectedOrders[0]
      },
      
      // Contract Metadata
      metadata: {
        generatedAt: new Date().toISOString(),
        agentId: 'current-agent', // In real app, this would be actual agent ID
        contractVersion: '1.0'
      }
    };

    return contractData;
  };

  const sendForSignature = async (contractData: any) => {
    console.log('📄 Contract Data Generated:', contractData);
    console.log('📧 Sending contract for e-signature via DocuSign API...');
    
    try {
      // Send contract email via Resend
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: { contractData }
      });

      if (error) {
        console.error('Error sending contract email:', error);
        toast({
          title: "Error Sending Contract",
          description: "Failed to send contract email. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (selectedLeadId) {
        // Update lead status to Awaiting Signature
        updateLeadStatus(selectedLeadId, 'Awaiting Signature');
        
        // Show success notification
        toast({
          title: "Contract Sent Successfully",
          description: `Contract has been sent to ${selectedLead?.companyName} for signature via email.`,
        });
        
        // Close the DealCanvas panel
        setSelectedLeadId(null);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-background shadow-xl animate-slide-in-right">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-foreground">
              Deal Canvas - {selectedLead.companyName}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Onboarding Hub View */}
            {!showPackageBuilder && (
              <div className="p-6 space-y-6">
                {/* Lead Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Lead Information</span>
                      <div className="flex gap-2">
                        <Badge className={cn("text-xs", getBusinessTypeColor(selectedLead.businessType))}>
                          {selectedLead.businessType}
                        </Badge>
                        <Badge className={cn("text-xs", getPriorityColor(selectedLead.priority))}>
                          {selectedLead.priority}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Company Name</p>
                        <p className="font-medium">{selectedLead.companyName}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Contact Name</p>
                        <p className="font-medium">{selectedLead.contactName}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.address}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedLead.email}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Value</span>
                        <span className="text-lg font-bold text-primary">
                          ${(selectedLead.value / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Master Progress Bar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Activation Readiness Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-muted-foreground">{activationScore}%</span>
                      </div>
                      <Progress value={activationScore} className="h-3" />
                      <p className="text-xs text-muted-foreground">
                        Complete all sections below to improve activation readiness
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Legal & Identity Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Legal & Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Commercial Registration */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={crFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'cr');
                          }}
                          className="hidden"
                        />
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-sm mb-1">Commercial Registration</h4>
                        <p className="text-xs text-muted-foreground mb-3">Upload CR document</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => crFileRef.current?.click()}
                          disabled={processingStates.cr}
                        >
                          {processingStates.cr ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Choose File'
                          )}
                        </Button>
                        <div className="mt-2">
                          <Badge variant={
                            selectedLead.documents.cr === "Verified" ? "default" :
                            selectedLead.documents.cr === "Processing..." ? "secondary" :
                            selectedLead.documents.cr === "Needs Review" ? "destructive" : "secondary"
                          }>
                            {selectedLead.documents.cr || "Pending"}
                          </Badge>
                        </div>
                      </div>

                      {/* Bank IBAN Letter */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={ibanFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'iban');
                          }}
                          className="hidden"
                        />
                        <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-sm mb-1">Bank IBAN Letter</h4>
                        <p className="text-xs text-muted-foreground mb-3">Upload IBAN document</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => ibanFileRef.current?.click()}
                          disabled={processingStates.iban}
                        >
                          {processingStates.iban ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Choose File'
                          )}
                        </Button>
                        <div className="mt-2">
                          <Badge variant={
                            selectedLead.documents.iban === "Verified" ? "default" :
                            selectedLead.documents.iban === "Processing..." ? "secondary" :
                            selectedLead.documents.iban === "Needs Review" ? "destructive" : "secondary"
                          }>
                            {selectedLead.documents.iban || "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Reconciliation UI */}
                    {selectedLead.extractedData && (selectedLead.extractedData.cr || selectedLead.extractedData.iban) && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium text-sm mb-3">Data Reconciliation</h4>
                        <div className="space-y-2">
                          {selectedLead.extractedData.cr && (
                            <div className="flex items-center justify-between text-sm">
                              <span>Owner Name Match:</span>
                              <div className="flex items-center gap-2">
                                {getReconciliationStatus(selectedLead.contactName, selectedLead.extractedData.cr.ownerName) ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-orange-600" />
                                )}
                                <span className="font-medium">
                                  {selectedLead.contactName} vs {selectedLead.extractedData.cr.ownerName}
                                </span>
                                {!getReconciliationStatus(selectedLead.contactName, selectedLead.extractedData.cr.ownerName) && (
                                  <Button size="sm" variant="outline" className="ml-2">
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {selectedLead.extractedData.iban && (
                            <div className="flex items-center justify-between text-sm">
                              <span>Account Owner Match:</span>
                              <div className="flex items-center gap-2">
                                {getReconciliationStatus(selectedLead.contactName, selectedLead.extractedData.iban.accountOwnerName) ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-orange-600" />
                                )}
                                <span className="font-medium">
                                  {selectedLead.contactName} vs {selectedLead.extractedData.iban.accountOwnerName}
                                </span>
                                {!getReconciliationStatus(selectedLead.contactName, selectedLead.extractedData.iban.accountOwnerName) && (
                                  <Button size="sm" variant="outline" className="ml-2">
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Storefront & Menu Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5 text-primary" />
                      Storefront & Menu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Logo */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={logoFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'logo');
                          }}
                          className="hidden"
                        />
                        <Image className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-xs mb-1">Logo</h4>
                        <p className="text-xs text-muted-foreground mb-2">Brand logo</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => logoFileRef.current?.click()}
                          disabled={processingStates.logo}
                        >
                          {processingStates.logo ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Upload'
                          )}
                        </Button>
                        <Badge 
                          variant={
                            selectedLead.documents.logo === "Verified" ? "default" :
                            selectedLead.documents.logo === "Processing..." ? "secondary" :
                            selectedLead.documents.logo === "Needs Review" ? "destructive" : "secondary"
                          }
                          className="mt-1 text-xs"
                        >
                          {selectedLead.documents.logo || "Pending"}
                        </Badge>
                      </div>

                      {/* Cover Photo */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={coverPhotoFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'coverPhoto');
                          }}
                          className="hidden"
                        />
                        <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-xs mb-1">Cover Photo</h4>
                        <p className="text-xs text-muted-foreground mb-2">Hero image</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => coverPhotoFileRef.current?.click()}
                          disabled={processingStates.coverPhoto}
                        >
                          {processingStates.coverPhoto ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Upload'
                          )}
                        </Button>
                        <Badge 
                          variant={
                            selectedLead.documents.coverPhoto === "Verified" ? "default" :
                            selectedLead.documents.coverPhoto === "Processing..." ? "secondary" :
                            selectedLead.documents.coverPhoto === "Needs Review" ? "destructive" : "secondary"
                          }
                          className="mt-1 text-xs"
                        >
                          {selectedLead.documents.coverPhoto || "Pending"}
                        </Badge>
                      </div>

                      {/* Store Front Photo */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={storePhotoFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'storePhoto');
                          }}
                          className="hidden"
                        />
                        <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-xs mb-1">Store Front</h4>
                        <p className="text-xs text-muted-foreground mb-2">Exterior photo</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => storePhotoFileRef.current?.click()}
                          disabled={processingStates.storePhoto}
                        >
                          {processingStates.storePhoto ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Upload'
                          )}
                        </Button>
                        <Badge 
                          variant={
                            selectedLead.documents.storePhoto === "Verified" ? "default" :
                            selectedLead.documents.storePhoto === "Processing..." ? "secondary" :
                            selectedLead.documents.storePhoto === "Needs Review" ? "destructive" : "secondary"
                          }
                          className="mt-1 text-xs"
                        >
                          {selectedLead.documents.storePhoto || "Pending"}
                        </Badge>
                      </div>

                      {/* Menu */}
                      <div className="border border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          ref={menuFileRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'menu');
                          }}
                          className="hidden"
                        />
                        <Menu className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="font-medium text-xs mb-1">Menu</h4>
                        <p className="text-xs text-muted-foreground mb-2">Menu image</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => menuFileRef.current?.click()}
                          disabled={processingStates.menu}
                        >
                          {processingStates.menu ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Upload'
                          )}
                        </Button>
                        <Badge 
                          variant={
                            selectedLead.documents.menu === "Verified" ? "default" :
                            selectedLead.documents.menu === "Processing..." ? "secondary" :
                            selectedLead.documents.menu === "Needs Review" ? "destructive" : "secondary"
                          }
                          className="mt-1 text-xs"
                        >
                          {selectedLead.documents.menu || "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* Menu Editor */}
                    {selectedLead.menu && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-sm">Menu Editor</h4>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handleAddCategory}>
                              <Plus className="w-3 h-3 mr-1" />
                              Add Category
                            </Button>
                            <Button 
                              size="sm" 
                              variant={editingMenu ? "default" : "outline"}
                              onClick={() => setEditingMenu(!editingMenu)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              {editingMenu ? 'Done' : 'Edit'}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {Object.entries(selectedLead.menu).map(([category, items]) => (
                            <div key={category} className="border border-border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-sm">{category}</h5>
                                {editingMenu && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleAddMenuItem(category)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                {items.map((item, index) => (
                                  <div key={index} className="grid grid-cols-4 gap-2 items-center text-sm">
                                    {editingMenu ? (
                                      <>
                                        <Input 
                                          value={item.name}
                                          onChange={(e) => handleUpdateMenuItem(category, index, 'name', e.target.value)}
                                          className="text-xs"
                                          placeholder="Item name"
                                        />
                                        <Input 
                                          type="number"
                                          value={item.price}
                                          onChange={(e) => handleUpdateMenuItem(category, index, 'price', parseFloat(e.target.value) || 0)}
                                          className="text-xs"
                                          placeholder="Price"
                                        />
                                        <Input 
                                          value={item.description}
                                          onChange={(e) => handleUpdateMenuItem(category, index, 'description', e.target.value)}
                                          className="text-xs"
                                          placeholder="Description"
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleDeleteMenuItem(category, index)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-primary">${item.price}</span>
                                        <span className="text-muted-foreground text-xs col-span-2">{item.description}</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Menu Health Dashboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Menu Health Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Menu Health Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Menu Health Score</span>
                        <span className="text-sm text-muted-foreground">{menuHealthScores.menuHealth}%</span>
                      </div>
                      <Progress value={menuHealthScores.menuHealth} className="h-2" />
                    </div>

                    {/* Item Optimization */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item Optimization</span>
                        <span className="text-sm text-muted-foreground">{menuHealthScores.itemOptimization}%</span>
                      </div>
                      <Progress value={menuHealthScores.itemOptimization} className="h-2" />
                    </div>

                    {/* Pricing Efficiency */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pricing Efficiency</span>
                        <span className="text-sm text-muted-foreground">{menuHealthScores.pricingEfficiency}%</span>
                      </div>
                      <Progress value={menuHealthScores.pricingEfficiency} className="h-2" />
                    </div>

                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
                            <Users className="w-4 h-4" />
                            {totalMenuItems}
                          </div>  
                          <p className="text-xs text-muted-foreground">Menu Items</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            18%
                          </div>
                          <p className="text-xs text-muted-foreground">Profit Margin</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-600">
                            <Clock className="w-4 h-4" />
                            12m
                          </div>
                          <p className="text-xs text-muted-foreground">Avg Prep Time</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Readiness Gate */}
                <Card>
                  <CardContent className="pt-6">
                    <Button 
                      disabled={activationScore < 100}
                      className={cn(
                        "w-full bg-gradient-primary",
                        activationScore < 100 ? "opacity-50 cursor-not-allowed" : ""
                      )}
                      onClick={handleContinueToPackageBuilder}
                    >
                      Continue to Package Builder
                      {activationScore < 100 && (
                        <span className="ml-2 text-xs">({activationScore}% Complete)</span>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Complete all required sections above to continue
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Package Builder View */}
            {showPackageBuilder && (
              <div className="p-6 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToOnboarding}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Onboarding
                  </Button>
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Package className="w-6 h-6 text-primary" />
                      Interactive Package Builder
                    </h3>
                    <p className="text-sm text-muted-foreground">Configure the perfect package for {selectedLead.companyName}</p>
                  </div>
                </div>

                {/* Guided Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Guided Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Delivery Model */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Delivery Model</Label>
                      <RadioGroup
                        value={deliveryModel}
                        onValueChange={(value) => setDeliveryModel(value as typeof deliveryModel)}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Own Delivery" id="own" />
                          <Label htmlFor="own" className="flex items-center gap-2 cursor-pointer">
                            <Truck className="w-4 h-4" />
                            Own Delivery - Restaurant handles delivery
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Platform Delivery" id="platform" />
                          <Label htmlFor="platform" className="flex items-center gap-2 cursor-pointer">
                            <Package className="w-4 h-4" />
                            Platform Delivery - We handle delivery
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Hybrid" id="hybrid" />
                          <Label htmlFor="hybrid" className="flex items-center gap-2 cursor-pointer">
                            <Zap className="w-4 h-4" />
                            Hybrid - Mix of both models
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Expected Daily Orders */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Expected Daily Orders</Label>
                      <div className="px-4">
                        <Slider
                          value={expectedOrders}
                          onValueChange={setExpectedOrders}
                          max={500}
                          min={10}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>10</span>
                          <span className="font-medium text-primary">{expectedOrders[0]} orders/day</span>
                          <span>500+</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tariff Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Recommended Tariffs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {filteredTariffs.map((tariff) => (
                        <div
                          key={tariff.id}
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all",
                            selectedTariff?.id === tariff.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50",
                            tariff.id === recommendedTariff?.id && "ring-2 ring-orange-200 border-orange-300"
                          )}
                          onClick={() => setSelectedTariff(tariff)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{tariff.name}</h4>
                                {tariff.id === recommendedTariff?.id && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{tariff.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Min Orders: {tariff.minOrders}/day</span>
                                <span>Commission: {tariff.commission}%</span>
                              </div>
                            </div>
                            {selectedTariff?.id === tariff.id && (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Package Configuration */}
                {selectedTariff && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Your Package Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Commissions */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Commissions
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSection('commissions')}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <span>Base Commission Rate</span>
                            <span className="font-medium">{selectedTariff.commission}%</span>
                          </div>
                          
                          {expandedSections.commissions && (
                            <div className="space-y-2 animate-fade-in">
                              <div className="flex gap-2">
                                <Input placeholder="Commission name" className="text-xs" />
                                <Input placeholder="Rate %" type="number" className="text-xs w-20" />
                                <Button size="sm" onClick={() => addPackageItem('commission', 'Custom Commission', 5)}>
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {packageItems.filter(item => item.type === 'commission').map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.amount}%</span>
                                <button onClick={() => removePackageItem(item.id)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Charges */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Additional Charges
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSection('charges')}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        {expandedSections.charges && (
                          <div className="space-y-2 animate-fade-in mb-3">
                            <div className="flex gap-2">
                              <Input placeholder="Charge name" className="text-xs" />  
                              <Input placeholder="Amount SAR" type="number" className="text-xs w-24" />
                              <Button size="sm" onClick={() => addPackageItem('charge', 'Registration Fee', 500)}>
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {packageItems.filter(item => item.type === 'charge').map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.amount} SAR</span>
                                <button onClick={() => removePackageItem(item.id)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assets & Branding */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Assets & Branding
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSection('assets')}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        {expandedSections.assets && (
                          <div className="space-y-2 animate-fade-in mb-3">
                            <div className="flex gap-2">
                              <Input placeholder="Asset name" className="text-xs" />
                              <Input placeholder="Cost SAR" type="number" className="text-xs w-24" />
                              <Button size="sm" onClick={() => addPackageItem('asset', 'Thermal Printer', 1200)}>
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {packageItems.filter(item => item.type === 'asset').map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                              <span>{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.amount} SAR</span>
                                <button onClick={() => removePackageItem(item.id)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Live Quote Summary - Sticky at bottom when in Package Builder */}
          {showPackageBuilder && selectedTariff && (
            <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-4 animate-slide-in-right">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Package Value</p>
                      <p className="text-xl font-bold text-primary animate-pulse">
                        {calculatePackageTotal().toLocaleString()} SAR
                      </p>
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Agent Commission</p>
                    <p className="text-lg font-semibold text-green-600 animate-pulse">
                      {calculateEstimatedCommission().toLocaleString()} SAR
                    </p>
                  </div>
                </div>
                
                <Button
                  size="lg"
                  className="bg-gradient-primary"
                  onClick={generateAndSendProposal}
                  disabled={!selectedTariff || packageItems.length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Generate & Send for Signature
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}