import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Info, Package, TrendingUp, Calculator, Check, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@/store/useLeadStore';
import {
  Tariff,
  Commission,
  AdditionalCharge,
  Asset,
  PackageConfiguration,
  PackageSummary,
  GuidedFilters,
  DELIVERY_MODELS,
  COMMISSION_OPTIONS,
  CHARGE_OPTIONS,
  ASSET_OPTIONS
} from '@/types/package';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Sample tariff data - in a real app, this would come from an API
const SAMPLE_TARIFFS: Tariff[] = [
  {
    id: 'restaurant-standard',
    name: 'Restaurant Standard',
    type: 'Platform Delivery',
    businessTypes: ['Restaurant'],
    minOrderVolume: 0,
    maxOrderVolume: 500,
    baseCommission: 15,
    isRecommended: true,
    description: 'Perfect for new restaurants getting started with food delivery'
  },
  {
    id: 'restaurant-premium',
    name: 'Restaurant Premium',
    type: 'Hybrid',
    businessTypes: ['Restaurant'],
    minOrderVolume: 200,
    maxOrderVolume: 1000,
    baseCommission: 12,
    description: 'For established restaurants with higher order volumes'
  },
  {
    id: 'retail-basic',
    name: 'Retail Basic',
    type: 'Platform Delivery',
    businessTypes: ['Retail'],
    minOrderVolume: 0,
    maxOrderVolume: 300,
    baseCommission: 18,
    description: 'Ideal for retail businesses starting online delivery'
  }
];

interface PackageBuilderStageProps {
  lead: Lead;
  onMarkComplete: (packageConfig: PackageConfiguration) => void;
}

export function PackageBuilderStage({ lead, onMarkComplete }: PackageBuilderStageProps) {
  const { toast } = useToast();
  
  // State management
  const [filters, setFilters] = useState<GuidedFilters>({
    deliveryModel: 'Platform Delivery',
    expectedOrderVolume: 100
  });
  
  const [selectedTariffId, setSelectedTariffId] = useState<string>('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [commissionStartDate, setCommissionStartDate] = useState<Date | undefined>();
  const [commissionEndDate, setCommissionEndDate] = useState<Date | undefined>();
  const [chargeStartDate, setChargeStartDate] = useState<Date | undefined>();
  const [chargeEndDate, setChargeEndDate] = useState<Date | undefined>();

  // New item forms
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);

  const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate && !endDate) return null;
    if (startDate && endDate) return `Active: ${startDate} to ${endDate}`;
    if (startDate) return `Active from ${startDate}`;
    return `Active until ${endDate}`;
  };

  // Filter tariffs based on business type and filters
  const filteredTariffs = useMemo(() => {
    return SAMPLE_TARIFFS.filter(tariff => {
      const matchesBusinessType = tariff.businessTypes.includes(lead.businessType);
      const matchesDeliveryModel = tariff.type === filters.deliveryModel || tariff.type === 'Hybrid';
      const matchesVolume = filters.expectedOrderVolume >= (tariff.minOrderVolume || 0) && 
                           filters.expectedOrderVolume <= (tariff.maxOrderVolume || Infinity);
      
      return matchesBusinessType && matchesDeliveryModel && matchesVolume;
    });
  }, [lead.businessType, filters]);

  // Calculate package summary
  const packageSummary = useMemo((): PackageSummary => {
    const totalOneTimeFees = additionalCharges.reduce((sum, charge) => sum + charge.price, 0) +
                            assets.reduce((sum, asset) => sum + (asset.price * asset.quantity), 0);
    
    const estimatedMonthlyRevenue = filters.expectedOrderVolume * 50; // Assuming 50 SAR average order
    const totalCommissionRate = commissions.reduce((sum, commission) => sum + commission.percentage, 0);
    const estimatedAgentCommission = (estimatedMonthlyRevenue * totalCommissionRate) / 100;
    
    const selectedTariff = SAMPLE_TARIFFS.find(t => t.id === selectedTariffId);
    
    return {
      totalOneTimeFees,
      estimatedAgentCommission,
      selectedTariff
    };
  }, [additionalCharges, assets, commissions, filters.expectedOrderVolume, selectedTariffId]);

  // Check for delivery dependencies
  const hasDeliveryAssets = assets.some(asset => asset.requiresDelivery);
  const hasDeliveryFee = additionalCharges.some(charge => charge.type === 'delivery');
  const needsDeliveryFee = hasDeliveryAssets && !hasDeliveryFee;

  // Remove item handlers
  const removeCommission = (id: string) => {
    setCommissions(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Commission Removed",
      description: "Commission has been removed from the package."
    });
  };

  const removeCharge = (id: string) => {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Charge Removed", 
      description: "Additional charge has been removed from the package."
    });
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Asset Removed",
      description: "Business asset has been removed from the package."
    });
  };

  // Form handlers
  const handleAddCommission = (formData: FormData) => {
    const name = formData.get('commissionName') as string;
    const percentage = parseFloat(formData.get('percentage') as string);
    
    if (!name || !percentage || percentage < 0 || percentage > 100) {
      toast({
        title: "Invalid Commission",
        description: "Please enter a valid commission percentage (0-100).",
        variant: "destructive"
      });
      return;
    }

    const serviceType = COMMISSION_OPTIONS.find(opt => opt.name === name)?.serviceType || 'Other';

    const startDate = commissionStartDate ? format(commissionStartDate, 'yyyy-MM-dd') : null;
    const endDate = commissionEndDate ? format(commissionEndDate, 'yyyy-MM-dd') : null;

    const newCommission: Commission = {
      id: Date.now().toString(),
      name,
      serviceType,
      percentage,
      startDate,
      endDate
    };

    setCommissions(prev => [...prev, newCommission]);
    setCommissionStartDate(undefined);
    setCommissionEndDate(undefined);
    setShowCommissionForm(false);
    toast({
      title: "Commission Added",
      description: `${name} (${percentage}%) added successfully.`
    });
  };

  const handleAddCharge = (formData: FormData) => {
    const name = formData.get('chargeName') as string;
    const price = parseFloat(formData.get('price') as string);
    
    if (!name || !price || price < 0) {
      toast({
        title: "Invalid Charge",
        description: "Please enter a valid price for the charge.",
        variant: "destructive"
      });
      return;
    }

    const type = CHARGE_OPTIONS.find(opt => opt.name === name)?.type;

    const startDate = chargeStartDate ? format(chargeStartDate, 'yyyy-MM-dd') : null;
    const endDate = chargeEndDate ? format(chargeEndDate, 'yyyy-MM-dd') : null;

    const newCharge: AdditionalCharge = {
      id: Date.now().toString(),
      name,
      price,
      type,
      startDate,
      endDate
    };

    setAdditionalCharges(prev => [...prev, newCharge]);
    setChargeStartDate(undefined);
    setChargeEndDate(undefined);
    setShowChargeForm(false);
    toast({
      title: "Charge Added",
      description: `${name} (${price} SAR) added successfully.`
    });
  };

  const handleAddAsset = (formData: FormData) => {
    const productName = formData.get('productName') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const deliveryOption = formData.get('deliveryOption') as string;
    
    if (!productName || !quantity || quantity < 1) {
      toast({
        title: "Invalid Asset",
        description: "Quantity must be at least 1.",
        variant: "destructive"
      });
      return;
    }

    const assetTemplate = ASSET_OPTIONS.find(opt => opt.productName === productName);
    if (!assetTemplate) return;

    if (assetTemplate.requiresDelivery && !deliveryOption) {
      toast({
        title: "Missing Delivery Option",
        description: "Please select a delivery option for this asset.",
        variant: "destructive"
      });
      return;
    }

    const newAsset: Asset = {
      id: Date.now().toString(),
      productName: assetTemplate.productName,
      price: assetTemplate.price,
      quantity,
      deliveryOption: assetTemplate.requiresDelivery ? deliveryOption : undefined,
      requiresDelivery: assetTemplate.requiresDelivery
    };

    setAssets(prev => [...prev, newAsset]);
    setShowAssetForm(false);
    toast({
      title: "Asset Added",
      description: `${productName} (${quantity}x) added successfully.`
    });
  };

  const handleFinalize = () => {
    if (!selectedTariffId) {
      toast({
        title: "Missing Tariff",
        description: "Please select a tariff to continue.",
        variant: "destructive"
      });
      return;
    }

    if (needsDeliveryFee) {
      toast({
        title: "Missing Delivery Fee",
        description: "Please add a delivery fee for the assets that require delivery.",
        variant: "destructive"
      });
      return;
    }

    const packageConfig: PackageConfiguration = {
      tariffId: selectedTariffId,
      commissions,
      additionalCharges,
      assets
    };

    onMarkComplete(packageConfig);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Interactive Package Builder
        </h2>
        <p className="text-muted-foreground">
          Build a complete commercial package for {lead.companyName}
        </p>
      </div>

      {/* Guided Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guided Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Model */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Delivery Model</Label>
            <RadioGroup
              value={filters.deliveryModel}
              onValueChange={(value: string) =>
                setFilters((prev) => ({ ...prev, deliveryModel: value as GuidedFilters['deliveryModel'] }))
              }
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {DELIVERY_MODELS.map((model) => (
                <div key={model.value} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={model.value} id={model.value} />
                  <div className="flex-1">
                    <Label htmlFor={model.value} className="font-medium cursor-pointer">
                      {model.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Expected Order Volume */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Expected Monthly Orders: {filters.expectedOrderVolume}
            </Label>
            <Slider
              value={[filters.expectedOrderVolume]}
              onValueChange={([value]) => setFilters(prev => ({ ...prev, expectedOrderVolume: value }))}
              max={1000}
              min={10}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 orders</span>
              <span>1000+ orders</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tariff Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Tariff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTariffs.map((tariff) => (
              <div
                key={tariff.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTariffId === tariff.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedTariffId(tariff.id)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{tariff.name}</h3>
                    {tariff.isRecommended && (
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{tariff.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{tariff.type}</span>
                    <span className="font-medium text-primary">{tariff.baseCommission}% commission</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTariffs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tariffs match your current filters</p>
              <p className="text-sm">Try adjusting your delivery model or order volume</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Configuration */}
      {selectedTariffId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Commissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Commissions
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommissionForm(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commissions.map((commission) => (
                <div key={commission.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{commission.name}</p>
                      <p className="text-xs text-muted-foreground">{commission.serviceType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{commission.percentage}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCommission(commission.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {formatDateRange(commission.startDate, commission.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(commission.startDate, commission.endDate)}
                    </p>
                  )}
                </div>
              ))}

              {commissions.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No commissions added yet</p>
                  <p className="text-xs">Click the + button to add commission rates</p>
                </div>
              )}

              {showCommissionForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddCommission(new FormData(e.currentTarget));
                  }}
                  className="space-y-3 p-3 border rounded-lg"
                >
                  <Select name="commissionName" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select commission type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMISSION_OPTIONS.map((option) => (
                        <SelectItem key={option.name} value={option.name}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    name="percentage"
                    type="number"
                    placeholder="Percentage (0-100)"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !commissionStartDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {commissionStartDate ? format(commissionStartDate, 'yyyy-MM-dd') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={commissionStartDate}
                            onSelect={(date) => setCommissionStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !commissionEndDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {commissionEndDate ? format(commissionEndDate, 'yyyy-MM-dd') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={commissionEndDate}
                            onSelect={(date) => setCommissionEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Add</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCommissionForm(false);
                        setCommissionStartDate(undefined);
                        setCommissionEndDate(undefined);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Additional Charges
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChargeForm(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {additionalCharges.map((charge) => (
                <div key={charge.id} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{charge.name}</p>
                      {charge.type && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {charge.type.replace(/-/g, ' ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{charge.price} SAR</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCharge(charge.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {formatDateRange(charge.startDate, charge.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(charge.startDate, charge.endDate)}
                    </p>
                  )}
                </div>
              ))}

              {additionalCharges.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No additional charges added yet</p>
                  <p className="text-xs">Add setup fees, subscriptions, or other charges</p>
                </div>
              )}

              {showChargeForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddCharge(new FormData(e.currentTarget));
                  }}
                  className="space-y-3 p-3 border rounded-lg"
                >
                  <Select name="chargeName" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select charge type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARGE_OPTIONS.map((option) => (
                        <SelectItem key={option.name} value={option.name}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    name="price"
                    type="number"
                    placeholder="Price (SAR)"
                    min="0"
                    step="0.01"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !chargeStartDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {chargeStartDate ? format(chargeStartDate, 'yyyy-MM-dd') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={chargeStartDate}
                            onSelect={(date) => setChargeStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End Date (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !chargeEndDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {chargeEndDate ? format(chargeEndDate, 'yyyy-MM-dd') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={chargeEndDate}
                            onSelect={(date) => setChargeEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Add</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowChargeForm(false);
                        setChargeStartDate(undefined);
                        setChargeEndDate(undefined);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Business Assets
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssetForm(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {needsDeliveryFee && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    This asset requires a delivery fee. Please add one from the 'Additional Charges' section to complete the configuration.
                  </p>
                </div>
              )}

              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{asset.productName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Qty: {asset.quantity}
                      </span>
                      {asset.deliveryOption && (
                        <Badge variant="outline" className="text-xs">
                          {asset.deliveryOption}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{asset.price * asset.quantity} SAR</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(asset.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {assets.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No business assets added yet</p>
                  <p className="text-xs">Add hardware, equipment, or services</p>
                </div>
              )}

              {showAssetForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddAsset(new FormData(e.currentTarget));
                  }}
                  className="space-y-3 p-3 border rounded-lg"
                >
                  <Select name="productName" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_OPTIONS.map((option) => (
                        <SelectItem key={option.productName} value={option.productName}>
                          {option.productName} - {option.price} SAR
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    name="quantity"
                    type="number"
                    placeholder="Quantity"
                    min="1"
                    required
                  />
                  <Select name="deliveryOption">
                    <SelectTrigger>
                      <SelectValue placeholder="Delivery option (if required)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Delivery</SelectItem>
                      <SelectItem value="express">Express Delivery</SelectItem>
                      <SelectItem value="pickup">Store Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Add</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssetForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Button */}
      {selectedTariffId && (
        <div className="flex justify-end">
          <Button onClick={handleFinalize} className="bg-gradient-primary hover:opacity-90">
            <Check className="w-4 h-4 mr-2" />
            Finalize Package
          </Button>
        </div>
      )}

      {/* Live Summary (Sticky Footer) */}
      {selectedTariffId && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center min-w-[120px]">
                  <p className="text-xs text-muted-foreground">Total One-Time Fees</p>
                  <p className="text-lg font-bold text-primary">
                    {packageSummary.totalOneTimeFees.toLocaleString()} SAR
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden md:block" />
                <div className="text-center min-w-[140px]">
                  <p className="text-xs text-muted-foreground">Est. Monthly Commission</p>
                  <p className="text-lg font-bold text-green-600">
                    {packageSummary.estimatedAgentCommission.toLocaleString()} SAR
                  </p>
                </div>
                {packageSummary.selectedTariff && (
                  <>
                    <Separator orientation="vertical" className="h-8 hidden lg:block" />
                    <div className="text-center min-w-[120px]">
                      <p className="text-xs text-muted-foreground">Selected Tariff</p>
                      <p className="text-sm font-medium">{packageSummary.selectedTariff.name}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Based on {filters.expectedOrderVolume} monthly orders
                </span>
                <span className="sm:hidden">
                  {filters.expectedOrderVolume} orders/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add bottom padding when summary is visible */}
      {selectedTariffId && <div className="h-20" />}
    </div>
  );
}