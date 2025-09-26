import { create } from 'zustand';
import { PackageConfiguration } from '@/types/package';

export type LeadStatus = 'New Leads' | 'Contacted' | 'Proposal Sent' | 'Awaiting Signature' | 'Closed-Won' | 'Closed-Lost';
export type BusinessType = 'Restaurant' | 'Retail' | 'Services';
export type Package = 'Basic Package' | 'Standard Package' | 'Premium Package';
export type ActivationStage = 'vendor-profile' | 'legal-identity' | 'storefront-menu' | 'package-builder' | 'finalize-sign';
export type StageStatus = 'completed' | 'in-progress' | 'pending' | 'needs-review';

export interface OpeningHours {
  [day: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  hasPhoto?: boolean;
  photoUrl?: string;
  category?: string;
}

export interface MenuCategory {
  [categoryName: string]: MenuItem[];
}

export interface BusinessAssets {
  logo?: string;
  coverPhoto?: string;
  storePhoto?: string;
}

export interface Owner {
  fullName: string;
  isPrimaryContact: boolean;
}

export interface Contact {
  id: string;
  name: string;
  role: 'Owner' | 'Decision Maker' | 'Finance' | 'Primary';
  phone?: string;
  email?: string;
}

export interface BankDetails {
  iban: string;
  accountOwnerName: string;
  bankName?: string;
  swiftCode?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  officialLegalName?: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  businessType: BusinessType;
  rating?: number;
  priority: 'High' | 'Medium' | 'Low';
  value: number;
  status: LeadStatus;
  statusUpdatedAt?: Date;
  contacts: Contact[];

  // Opening Hours
  openingHours?: OpeningHours;

  // Legal & Identity Data
  crNumber?: string;
  owner?: Owner;
  bankDetails?: BankDetails;
  taxNumber?: string;
  legalForm?: string;

  // Documents Status
  documents: {
    cr: string | null;
    iban: string | null;
    logo: string | null;
    coverPhoto: string | null;
    storePhoto: string | null;
    menu: string | null;
  };
  
  // OCR Extracted Data
  extractedData?: {
    cr?: {
      officialBusinessName: string;
      crNumber: string;
      ownerName: string;
      taxNumber?: string | null;
      legalForm?: string | null;
    };
    iban?: {
      accountOwnerName: string;
      ibanNumber: string;
      bankName?: string | null;
      swiftCode?: string | null;
    };
  };
  
  // Menu Structure
  menu?: MenuCategory;
  
  // Business Assets
  assets?: BusinessAssets;
  
  // Activation Tracking
  currentStage: ActivationStage;
  stageStatus: { [K in ActivationStage]: StageStatus };
  
  // Additional fields
  package?: Package;
  packageConfiguration?: PackageConfiguration;
  placeId?: string;
  website?: string;
  createdAt: Date;
  lastContact?: Date;
}

interface LeadStore {
  leads: Lead[];
  selectedLeadId: string | null;
  monthlyGoal: number;
  addLead: (
    lead: Omit<Lead, 'id' | 'createdAt' | 'documents' | 'status' | 'currentStage' | 'stageStatus' | 'contactName' | 'contacts'> & {
      contactName?: string;
      contacts?: Contact[];
    }
  ) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  updateLeadPackage: (leadId: string, packageType: Package) => void;
  updateLeadValue: (leadId: string, value: number) => void;
  setSelectedLeadId: (leadId: string | null) => void;
  updateDocumentStatus: (leadId: string, docType: keyof Lead['documents'], status: string) => void;
  updateExtractedData: (leadId: string, docType: 'cr' | 'iban', data: any) => void;
  updateMenu: (leadId: string, menu: MenuCategory) => void;
  updateOpeningHours: (leadId: string, openingHours: OpeningHours) => void;
  updateStageStatus: (leadId: string, stage: ActivationStage, status: StageStatus) => void;
  setCurrentStage: (leadId: string, stage: ActivationStage) => void;
  updateOfficialLegalName: (leadId: string, name: string) => void;
  updatePrimaryContact: (leadId: string, name: string, useOwnerAsContact: boolean) => void;
  updateContacts: (leadId: string, contacts: Contact[]) => void;
  updateBankDetails: (leadId: string, details: Partial<BankDetails>) => void;
  updateLegalIdentifiers: (leadId: string, data: { taxNumber?: string | null; legalForm?: string | null }) => void;
  updateCRNumber: (leadId: string, crNumber: string | null) => void;
  updatePackageConfiguration: (leadId: string, packageConfig: PackageConfiguration) => void;
  getSelectedLead: () => Lead | null;
  getPipelineValue: () => number;
  getConversionRate: () => number;
  getAvgCloseTime: () => number;
  getMonthlyProgress: () => { current: number; target: number; percentage: number };
  getActivationScore: (leadId: string) => number;
  getMenuHealthScore: (leadId: string) => { menuHealth: number; itemOptimization: number; pricingEfficiency: number; totalItems: number; itemsWithDescription: number; itemsWithPhoto: number };
  isStageComplete: (leadId: string, stage: ActivationStage) => boolean;
  canAccessStage: (leadId: string, stage: ActivationStage) => boolean;
}

// Default opening hours structure
const defaultOpeningHours: OpeningHours = {
  Sunday: { isOpen: false, openTime: '09:00', closeTime: '22:00' },
  Monday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  Tuesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  Wednesday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  Thursday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  Friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
  Saturday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
};

// Default stage status for new leads
const defaultStageStatus = {
  'vendor-profile': 'pending' as StageStatus,
  'legal-identity': 'pending' as StageStatus,
  'storefront-menu': 'pending' as StageStatus,
  'package-builder': 'pending' as StageStatus,
  'finalize-sign': 'pending' as StageStatus,
};

// Initial mock data with enhanced properties
const initialLeads: Lead[] = [
  {
    id: '1',
    companyName: 'Fresh Bites Cafe',
    contactName: 'John Smith',
    phone: '555-0123',
    email: 'john@freshbites.com',
    address: '123 Main St, Downtown',
    businessType: 'Restaurant',
    status: 'New Leads',
    rating: 4.5,
    value: 8500,
    priority: 'High',
    currentStage: 'vendor-profile',
    stageStatus: { ...defaultStageStatus },
    contacts: [
      {
        id: 'contact-1-primary',
        name: 'John Smith',
        role: 'Primary',
        phone: '555-0123',
        email: 'john@freshbites.com'
      }
    ],
    openingHours: { ...defaultOpeningHours },
    documents: {
      cr: null,
      iban: null,
      logo: null,
      coverPhoto: null,
      storePhoto: null,
      menu: null
    },
    createdAt: new Date('2024-09-20'),
    lastContact: new Date('2024-09-22')
  },
  {
    id: '2',
    companyName: 'Tech Solutions Inc',
    contactName: 'Sarah Johnson',
    phone: '555-0456',
    email: 'sarah@techsolutions.com',
    address: '456 Business Ave, Tech District',
    businessType: 'Services',
    status: 'Contacted',
    package: 'Standard Package',
    rating: 4.2,
    value: 12000,
    priority: 'Medium',
    currentStage: 'legal-identity',
    stageStatus: {
      'vendor-profile': 'completed',
      'legal-identity': 'in-progress',
      'storefront-menu': 'pending',
      'package-builder': 'pending',
      'finalize-sign': 'pending'
    },
    contacts: [
      {
        id: 'contact-2-primary',
        name: 'Sarah Johnson',
        role: 'Primary',
        phone: '555-0456',
        email: 'sarah@techsolutions.com'
      },
      {
        id: 'contact-2-finance',
        name: 'David Lin',
        role: 'Finance',
        email: 'finance@techsolutions.com'
      }
    ],
    openingHours: { ...defaultOpeningHours },
    documents: {
      cr: null,
      iban: null,
      logo: null,
      coverPhoto: null,
      storePhoto: null,
      menu: null
    },
    createdAt: new Date('2024-09-18'),
    lastContact: new Date('2024-09-23')
  },
  {
    id: '3',
    companyName: 'Style Boutique',
    contactName: 'Mike Davis',
    phone: '555-0789',
    email: 'mike@styleboutique.com',
    address: '789 Fashion Blvd, Shopping Center',
    businessType: 'Retail',
    status: 'Proposal Sent',
    package: 'Premium Package',
    rating: 4.8,
    value: 15000,
    priority: 'High',
    currentStage: 'package-builder',
    stageStatus: {
      'vendor-profile': 'completed',
      'legal-identity': 'completed',
      'storefront-menu': 'completed',
      'package-builder': 'in-progress',
      'finalize-sign': 'pending'
    },
    contacts: [
      {
        id: 'contact-3-primary',
        name: 'Mike Davis',
        role: 'Primary',
        phone: '555-0789',
        email: 'mike@styleboutique.com'
      },
      {
        id: 'contact-3-decision',
        name: 'Elena Garcia',
        role: 'Decision Maker',
        phone: '555-0790'
      }
    ],
    openingHours: { ...defaultOpeningHours },
    documents: {
      cr: 'Verified',
      iban: 'Verified',
      logo: 'Verified',
      coverPhoto: 'Verified',
      storePhoto: 'Verified',
      menu: 'Verified'
    },
    createdAt: new Date('2024-09-15'),
    lastContact: new Date('2024-09-21')
  }
];

/**
 * Global lead store powering the onboarding workspace. It manages lead records, document status,
 * activation progress, and supporting analytics that drive the UI.
 */
export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: initialLeads,
  selectedLeadId: null,
  monthlyGoal: 50000,
  
  /**
   * Registers a new lead with default onboarding metadata and contact scaffolding.
   *
   * @param lead - Partial lead payload collected from intake forms.
   */
  addLead: (lead) => set(state => {
    const generatedId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseContacts = lead.contacts && lead.contacts.length > 0
      ? lead.contacts.map(contact => ({ ...contact }))
      : lead.contactName
        ? [{
            id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: lead.contactName,
            role: 'Primary' as const,
            phone: lead.phone,
            email: lead.email
          }]
        : [];
    const primaryContactName = baseContacts.find(contact => contact.role === 'Primary')?.name || lead.contactName || '';

    return {
      leads: [...state.leads, {
        ...lead,
        id: generatedId,
        contacts: baseContacts,
        contactName: primaryContactName,
        status: 'New Leads',
        currentStage: 'vendor-profile',
        stageStatus: { ...defaultStageStatus },
        openingHours: lead.openingHours || { ...defaultOpeningHours },
        documents: {
          cr: null,
          iban: null,
          logo: null,
          coverPhoto: null,
          storePhoto: null,
          menu: null
        },
        createdAt: new Date()
      }]
    };
  }),
  
  /**
   * Updates the pipeline status for a lead and refreshes timestamp metadata.
   *
   * @param leadId - Identifier for the lead to update.
   * @param status - New pipeline stage to assign.
   */
  updateLeadStatus: (leadId, status) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { ...lead, status, statusUpdatedAt: new Date(), lastContact: new Date() } : lead
    )
  })),
  
  /**
   * Assigns a catalog package to the lead record.
   *
   * @param leadId - Identifier for the lead to update.
   * @param packageType - Package selection to store.
   */
  updateLeadPackage: (leadId, packageType) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { ...lead, package: packageType } : lead
    )
  })),

  /**
   * Persists the projected revenue value of a lead.
   *
   * @param leadId - Identifier for the lead to update.
   * @param value - Estimated monetary value of the opportunity.
   */
  updateLeadValue: (leadId, value) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { ...lead, value } : lead
    )
  })),
  
  /**
   * Sets the currently focused lead for the UI.
   *
   * @param leadId - Lead identifier or null to clear selection.
   */
  setSelectedLeadId: (leadId) => set({ selectedLeadId: leadId }),
  
  /**
   * Updates the processing status for an uploaded document.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param docType - Document key (cr, iban, logo, etc.).
   * @param status - Human readable status string to display.
   */
  updateDocumentStatus: (leadId, docType, status) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { 
        ...lead, 
        documents: { ...lead.documents, [docType]: status }
      } : lead
    )
  })),

  /**
   * Stores structured OCR results for a document type.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param docType - OCR document type key.
   * @param data - Parsed payload returned from the OCR service.
   */
  updateExtractedData: (leadId, docType, data) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { 
        ...lead, 
        extractedData: { 
          ...lead.extractedData, 
          [docType]: data 
        }
      } : lead
    )
  })),

  /**
   * Replaces the structured menu assigned to a lead.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param menu - Categorised menu items captured from OCR or manual input.
   */
  updateMenu: (leadId, menu) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { ...lead, menu } : lead
    )
  })),

  /**
   * Persists opening hours information for the lead's business.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param openingHours - Weekly schedule data keyed by day.
   */
  updateOpeningHours: (leadId, openingHours) => set(state => ({
    leads: state.leads.map(lead => 
      lead.id === leadId ? { ...lead, openingHours } : lead
    )
  })),

  /**
   * Updates the status of a specific onboarding stage for a lead.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param stage - Stage identifier being updated.
   * @param status - New stage status value.
   */
  updateStageStatus: (leadId, stage, status) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId ? {
        ...lead,
        stageStatus: { ...lead.stageStatus, [stage]: status }
      } : lead
    )
  })),

  /**
   * Sets which onboarding stage is currently active for a lead.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param stage - Stage identifier to mark as current.
   */
  setCurrentStage: (leadId, stage) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId ? { ...lead, currentStage: stage } : lead
    )
  })),

  /**
   * Updates the official legal name recorded for a lead.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param name - New legal name to store.
   */
  updateOfficialLegalName: (leadId, name) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId ? { ...lead, officialLegalName: name } : lead
    )
  })),

  /**
   * Updates the primary contact for a lead while ensuring roles remain unique.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param name - Display name for the primary contact.
   * @param useOwnerAsContact - When true, synchronizes the owner record with the contact.
   */
  updatePrimaryContact: (leadId, name, useOwnerAsContact) => set(state => ({
    leads: state.leads.map(lead => {
      if (lead.id !== leadId) return lead;

      const contacts = lead.contacts || [];
      const existingPrimary = contacts.find(contact => contact.role === 'Primary');
      const primaryContact: Contact = {
        id: existingPrimary?.id || `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        role: 'Primary',
        phone: existingPrimary?.phone,
        email: existingPrimary?.email
      };

      const updatedContacts = [
        ...contacts
          .filter(contact => contact.id !== primaryContact.id)
          .map(contact =>
            contact.role === 'Primary'
              ? { ...contact, role: 'Decision Maker' as const }
              : contact
          ),
        primaryContact
      ];

      return {
        ...lead,
        contactName: name,
        contacts: updatedContacts,
        owner: lead.owner
          ? { ...lead.owner, isPrimaryContact: useOwnerAsContact }
          : useOwnerAsContact
            ? { fullName: name, isPrimaryContact: true }
            : lead.owner
      };
    })
  })),

  /**
   * Replaces the contact list for a lead and updates the cached primary contact name.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param contacts - New array of contacts captured from the UI.
   */
  updateContacts: (leadId, contacts) => set(state => ({
    leads: state.leads.map(lead => {
      if (lead.id !== leadId) return lead;
      const normalizedContacts = contacts.map(contact => ({ ...contact }));
      const primaryContact = normalizedContacts.find(contact => contact.role === 'Primary');

      return {
        ...lead,
        contacts: normalizedContacts,
        contactName: primaryContact?.name || ''
      };
    })
  })),

  /**
   * Merges bank detail updates into the stored lead record.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param details - Partial bank details to merge.
   */
  updateBankDetails: (leadId, details) => set(state => ({
    leads: state.leads.map(lead => {
      if (lead.id !== leadId) return lead;
      const currentDetails = lead.bankDetails ?? { iban: '', accountOwnerName: '' };

      return {
        ...lead,
        bankDetails: {
          ...currentDetails,
          ...details
        }
      };
    })
  })),

  /**
   * Stores tax number and legal form attributes extracted from compliance checks.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param data - Object containing optional legal identifiers.
   */
  updateLegalIdentifiers: (leadId, data) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId
        ? {
            ...lead,
            taxNumber: data.taxNumber ?? lead.taxNumber,
            legalForm: data.legalForm ?? lead.legalForm
          }
        : lead
    )
  })),

  /**
   * Updates the commercial registration number for a lead.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param crNumber - Commercial registration number or null to clear.
   */
  updateCRNumber: (leadId, crNumber) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId ? { ...lead, crNumber: crNumber || undefined } : lead
    )
  })),

  /**
   * Saves the detailed package configuration assembled in the package builder.
   *
   * @param leadId - Identifier for the lead to mutate.
   * @param packageConfig - Structured package configuration including pricing.
   */
  updatePackageConfiguration: (leadId, packageConfig) => set(state => ({
    leads: state.leads.map(lead =>
      lead.id === leadId ? { ...lead, packageConfiguration: packageConfig } : lead
    )
  })),
  
  /**
   * Retrieves the currently selected lead or null when nothing is active.
   *
   * @returns The selected lead entity or null.
   */
  getSelectedLead: () => {
    const { leads, selectedLeadId } = get();
    return selectedLeadId ? leads.find(lead => lead.id === selectedLeadId) || null : null;
  },

  /**
   * Calculates the total pipeline value across all non-closed leads.
   *
   * @returns Aggregate monetary value of open opportunities.
   */
  getPipelineValue: () => {
    const { leads } = get();
    return leads
      .filter(lead => lead.status !== 'Closed-Won' && lead.status !== 'Closed-Lost')
      .reduce((total, lead) => total + (lead.value || 0), 0);
  },

  /**
   * Calculates the percentage of leads that have converted to Closed-Won.
   *
   * @returns Conversion rate as a percentage.
   */
  getConversionRate: () => {
    const { leads } = get();
    const engagedLeads = leads.filter(lead => lead.status !== 'New Leads');
    const closedWonLeads = leads.filter(lead => lead.status === 'Closed-Won');
    return engagedLeads.length > 0 ? (closedWonLeads.length / engagedLeads.length) * 100 : 0;
  },

  /**
   * Estimates the average number of days between lead creation and close for won deals.
   *
   * @returns Average close time in days.
   */
  getAvgCloseTime: () => {
    const { leads } = get();
    const closedWonLeads = leads.filter(lead => lead.status === 'Closed-Won' && lead.statusUpdatedAt);
    if (closedWonLeads.length === 0) return 0;
    
    const totalDays = closedWonLeads.reduce((total, lead) => {
      const daysDiff = Math.floor((lead.statusUpdatedAt!.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return total + daysDiff;
    }, 0);
    
    return Math.round(totalDays / closedWonLeads.length);
  },

  /**
   * Aggregates closed-won value for the current month to compare against the monthly goal.
   *
   * @returns Object containing current value, target, and completion percentage.
   */
  getMonthlyProgress: () => {
    const { leads, monthlyGoal } = get();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyValue = leads
      .filter(lead => {
        const statusDate = lead.statusUpdatedAt || lead.createdAt;
        return lead.status === 'Closed-Won' && 
               statusDate.getMonth() === currentMonth && 
               statusDate.getFullYear() === currentYear;
      })
      .reduce((total, lead) => total + (lead.value || 0), 0);
    
    return {
      current: monthlyValue,
      target: monthlyGoal,
      percentage: Math.min((monthlyValue / monthlyGoal) * 100, 100)
    };
  },

  /**
   * Calculates an activation score based on the number of verified documents for a lead.
   *
   * @param leadId - Identifier for the lead to inspect.
   * @returns Percentage completion score for document verification.
   */
  getActivationScore: (leadId) => {
    const { leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return 0;

    const documentTypes = ['cr', 'iban', 'logo', 'coverPhoto', 'storePhoto', 'menu'] as const;
    const verifiedDocs = documentTypes.filter(type => lead.documents[type] === 'Verified').length;
    
    return Math.round((verifiedDocs / documentTypes.length) * 100);
  },

  /**
   * Evaluates menu completeness metrics used to gate storefront progress.
   *
   * @param leadId - Identifier for the lead to inspect.
   * @returns Menu health metrics summarizing quality indicators.
   */
  getMenuHealthScore: (leadId) => {
    const { leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead?.menu) return { 
      menuHealth: 0, 
      itemOptimization: 0, 
      pricingEfficiency: 0, 
      totalItems: 0, 
      itemsWithDescription: 0, 
      itemsWithPhoto: 0 
    };

    const allItems = Object.values(lead.menu).flat();
    const totalItems = allItems.length;
    const itemsWithDescription = allItems.filter(item => item.description && item.description.trim().length > 0).length;
    const itemsWithPhoto = allItems.filter(item => item.hasPhoto).length;
    const itemsWithPrice = allItems.filter(item => item.price > 0).length;
    
    const itemOptimization = totalItems > 0 ? Math.round((itemsWithDescription / totalItems) * 100) : 0;
    const pricingEfficiency = totalItems > 0 ? Math.round((itemsWithPrice / totalItems) * 100) : 0;
    const menuHealth = Math.round((itemOptimization + pricingEfficiency) / 2);

    return { 
      menuHealth, 
      itemOptimization, 
      pricingEfficiency, 
      totalItems, 
      itemsWithDescription, 
      itemsWithPhoto 
    };
  },

  /**
   * Determines whether a lead has satisfied the requirements for a given onboarding stage.
   *
   * @param leadId - Identifier for the lead to inspect.
   * @param stage - Stage identifier to evaluate.
   * @returns True when the stage's completion criteria are met.
   */
  isStageComplete: (leadId, stage) => {
    const { leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return false;

    switch (stage) {
      case 'vendor-profile':
        return !!(lead.companyName && lead.contactName && lead.phone && lead.address && lead.openingHours);
      
      case 'legal-identity':
        const primaryContact = lead.contacts?.find(contact => contact.role === 'Primary' && contact.name.trim().length > 0);
        const hasCompleteBankDetails = !!(
          lead.bankDetails?.iban &&
          lead.bankDetails?.accountOwnerName &&
          lead.bankDetails?.bankName &&
          lead.bankDetails?.swiftCode
        );
        return !!(
          lead.documents.cr === 'Verified' &&
          lead.documents.iban === 'Verified' &&
          lead.officialLegalName &&
          lead.crNumber &&
          primaryContact &&
          hasCompleteBankDetails &&
          lead.taxNumber &&
          lead.legalForm
        );
      
      case 'storefront-menu':
        const menuScores = get().getMenuHealthScore(leadId);
        return !!(
          lead.documents.logo === 'Verified' &&
          lead.documents.coverPhoto === 'Verified' &&
          lead.documents.storePhoto === 'Verified' &&
          lead.documents.menu === 'Verified' &&
          lead.menu &&
          Object.keys(lead.menu).length > 0 &&
          menuScores.totalItems >= 15 &&
          (menuScores.itemsWithDescription / menuScores.totalItems) >= 0.8 &&
          (menuScores.itemsWithPhoto / menuScores.totalItems) >= 0.5
        );
      
      case 'package-builder':
        return lead.stageStatus['package-builder'] === 'completed';
      
      case 'finalize-sign':
        return lead.status === 'Awaiting Signature' || lead.status === 'Closed-Won';
      
      default:
        return false;
    }
  },

  /**
   * Checks whether the operator is allowed to open a given stage based on prior completions.
   *
   * @param leadId - Identifier for the lead to inspect.
   * @param stage - Stage identifier to evaluate.
   * @returns True when the stage can be opened.
   */
  canAccessStage: (leadId, stage) => {
    const { leads, isStageComplete } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return false;

    const stageOrder: ActivationStage[] = ['vendor-profile', 'legal-identity', 'storefront-menu', 'package-builder', 'finalize-sign'];
    const stageIndex = stageOrder.indexOf(stage);
    
    // Always allow access to stages except the final stage
    if (stage !== 'finalize-sign') return true;

    // For finalize-sign ONLY, require all previous stages to be complete
    for (let i = 0; i < stageIndex; i++) {
      if (!isStageComplete(leadId, stageOrder[i])) return false;
    }
    return true;
  }
}));