/**
 * How a material's quantity is derived from the roof measurements.
 * Each basis maps to one measurement (area in sq ft, a length in LF, or a count).
 */
export type QuantityBasis =
  | 'area' // pitched roof area, sq ft
  | 'squares' // pitched roof area / 100
  | 'flatArea' // low-slope / flat area, sq ft
  | 'eaves'
  | 'rakes'
  | 'eavesRakes' // drip edge, starter
  | 'ridges'
  | 'hips'
  | 'ridgesHips' // hip & ridge cap
  | 'valleys'
  | 'stepFlashing'
  | 'wallFlashing'
  | 'iceWaterArea' // eaves + valleys strips, sq ft (see Measurements.iceWaterRows)
  | 'pipeBoots'
  | 'vents'
  | 'chimneys'
  | 'skylights'
  | 'perJob' // one per job (delivery, etc.)
  | 'manual'; // quantity typed in on the estimate

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string; // purchase unit: BD, RL, PC, BX...
  unitCost: number;
  basis: QuantityBasis;
  /** Measurement units covered by one purchase unit (e.g. 33.33 sq ft per bundle, 10 LF per drip edge piece). */
  coverage: number;
  /** Item-specific waste %. Leave undefined to use the estimate's waste % for area items and 0 otherwise. */
  wastePct?: number;
  /** Put on every estimate, regardless of scope (e.g. delivery charge). */
  alwaysInclude?: boolean;
}

export interface CrewMember {
  id: string;
  name: string;
  /** Loaded weekly cost. */
  weeklyCost: number;
  /** On the crew for new estimates. */
  defaultOnCrew: boolean;
}

export interface LaborSettings {
  hoursPerSquare: number;
  hoursPerWeek: number;
  /** Extra tear-off hours per square for each layer above the first. */
  extraLayerHoursPerSquare: number;
  /** Labor multiplier by pitch (rise over 12). */
  pitchMultipliers: { minPitch: number; multiplier: number }[];
  /** Added % of hours for each story above the first. */
  extraStoryPct: number;
  hoursPerDay: number;
  crew: CrewMember[];
}

/** Non-material job costs: dump runs, landfill, equipment, per diem, contingency... */
export interface JobCostItem {
  id: string;
  name: string;
  description: string;
  unitCost: number;
  unitLabel: string;
  /** If set, the default quantity is roof squares ÷ this (rounded up). */
  squaresPerUnit?: number;
  defaultQty: number;
}

export interface PricingSettings {
  /** Supplier sales tax on materials. */
  materialTaxPct: number;
  /** Indirect overhead added to job cost. */
  overheadPct: number;
  /** Target gross profit margin on the pre-tax bid. */
  grossMarginPct: number;
  /** Warn when margin is set below this. */
  minMarginPct: number;
  /** Tax charged to the customer on the bid (e.g. Hawaii GET). */
  salesTaxPct: number;
  depositPct: number;
}

export interface ScopeOption {
  id: string;
  label: string;
  /** Text that goes into the contract's scope of work. */
  contractText: string;
  defaultOn: boolean;
  /** Materials that are included when this scope item is selected. */
  materialIds: string[];
  /** Extra charge (your cost) for this scope item. */
  charge: { type: 'none' | 'fixed' | 'perSquare' | 'perUnit'; amount: number; unitLabel?: string };
}

export interface CompanyInfo {
  name: string;
  license: string;
  address: string;
  phone: string;
  email: string;
  logoDataUrl?: string;
}

export interface Measurements {
  areaSqFt: number; // pitched area
  flatAreaSqFt: number;
  pitch: number; // predominant pitch, rise per 12
  stories: number;
  layers: number; // existing layers to tear off
  eaves: number;
  rakes: number;
  ridges: number;
  hips: number;
  valleys: number;
  stepFlashing: number;
  wallFlashing: number;
  pipeBoots: number;
  vents: number;
  chimneys: number;
  skylights: number;
  /** Rows of 3 ft ice & water shield at the eaves. */
  iceWaterRows: number;
}

export interface Customer {
  type: 'homeowner' | 'contractor';
  name: string;
  company: string;
  phone: string;
  email: string;
  propertyAddress: string;
  billingAddress: string;
}

export interface MaterialOverride {
  /** Removed from this job. */
  off?: boolean;
  /** Added from the price list even though no selected scope item uses it. */
  add?: boolean;
  qty?: number;
}

export interface Estimate {
  id: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  estimator: string;
  customer: Customer;
  measurements: Measurements;
  wastePct: number;
  scope: Record<string, { on: boolean; qty: number }>;
  materialOverrides: Record<string, MaterialOverride>;
  /** Which field-shingle product (Shingles category, area basis) to use. */
  shingleId?: string;
  shingleColor: string;
  /** Crew member ids on this job. */
  crewIds: string[];
  /** Per-job hours/square override. */
  hoursPerSquare?: number;
  /** Quantity (and optional cost override) for each other job cost. Missing = default qty. */
  jobCosts: Record<string, { qty: number; unitCost?: number }>;
  /** Per-job margin override. */
  grossMarginPct?: number;
  startDate: string; // yyyy-mm-dd
  durationDaysOverride?: number;
  notes: string;
  paymentTerms: string;
  /** Contract layout: list materials with quantities, and show per-line prices. */
  showMaterialList: boolean;
  showItemizedPrices: boolean;
  status: 'draft' | 'sent' | 'signed';
}

export interface Settings {
  company: CompanyInfo;
  materials: Material[];
  labor: LaborSettings;
  jobCosts: JobCostItem[];
  pricing: PricingSettings;
  scopeOptions: ScopeOption[];
  contractTerms: string;
  warranty: string;
}
