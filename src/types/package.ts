export interface Tariff {
  id: string;
  name: string;
  type: 'Own Delivery' | 'Platform Delivery' | 'Hybrid';
  businessTypes: string[];
  minOrderVolume?: number;
  maxOrderVolume?: number;
  baseCommission: number;
  isRecommended?: boolean;
  description: string;
}

export interface Commission {
  id: string;
  name: string;
  serviceType: string;
  percentage: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface AdditionalCharge {
  id: string;
  name: string;
  price: number;
  type?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Asset {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  deliveryOption?: string;
  requiresDelivery: boolean;
}

export interface PackageConfiguration {
  tariffId: string;
  commissions: Commission[];
  additionalCharges: AdditionalCharge[];
  assets: Asset[];
}

export interface PackageSummary {
  totalOneTimeFees: number;
  estimatedAgentCommission: number;
  selectedTariff?: Tariff;
}

export interface GuidedFilters {
  deliveryModel: 'Own Delivery' | 'Platform Delivery' | 'Hybrid';
  expectedOrderVolume: number;
}

// Predefined options
export const DELIVERY_MODELS = [
  { value: 'Own Delivery', label: 'Own Delivery', description: 'Restaurant handles all deliveries' },
  { value: 'Platform Delivery', label: 'Platform Delivery', description: 'Platform handles all deliveries' },
  { value: 'Hybrid', label: 'Hybrid', description: 'Mix of own and platform delivery' }
] as const;

export const COMMISSION_OPTIONS = [
  { name: 'Order Commission', serviceType: 'Order Processing' },
  { name: 'Delivery Commission', serviceType: 'Delivery Service' },
  { name: 'Payment Processing', serviceType: 'Payment Gateway' },
  { name: 'Marketing Commission', serviceType: 'Marketing Services' }
];

export const CHARGE_OPTIONS = [
  { name: 'Registration Fee', type: 'setup' },
  { name: 'Delivery Fee', type: 'delivery' },
  { name: 'Setup Fee', type: 'setup' },
  { name: 'Monthly Subscription', type: 'recurring' },
  { name: 'Transaction Fee', type: 'processing' }
];

export const ASSET_OPTIONS = [
  { productName: 'Printer 700 SAR', price: 700, requiresDelivery: true },
  { productName: 'Tablet Stand 200 SAR', price: 200, requiresDelivery: true },
  { productName: 'Digital Menu Display', price: 1500, requiresDelivery: true },
  { productName: 'POS Terminal', price: 800, requiresDelivery: true },
  { productName: 'Marketing Package', price: 500, requiresDelivery: false },
  { productName: 'Training Program', price: 300, requiresDelivery: false }
];