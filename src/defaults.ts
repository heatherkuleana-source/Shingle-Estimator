import type { Customer, Estimate, Material, Measurements, Settings } from './types';

/** Price list from the supplier material cost sheet (7/27). Edit under Settings → Price List. */
const materials: Material[] = [
  // Shingles — one field shingle is chosen per estimate
  { id: 'landmark-pro', name: 'CT Landmark PRO (3 bundles/sq)', category: 'Shingles', unit: 'BD', unitCost: 89.67, basis: 'area', coverage: 33.33 },
  { id: 'landmark-ar', name: 'CT Landmark AR (3 bundles/sq)', category: 'Shingles', unit: 'BD', unitCost: 81, basis: 'area', coverage: 33.33 },
  { id: 'landmark-pres', name: 'CT Presidential (5 bundles/sq)', category: 'Shingles', unit: 'BD', unitCost: 67, basis: 'area', coverage: 20 },
  { id: 'swiftstart', name: 'CertainTeed SwiftStart Starter (116.4 LF/bundle)', category: 'Starter & Ridge', unit: 'BD', unitCost: 82.5, basis: 'eavesRakes', coverage: 116.4, wastePct: 5 },
  { id: 'pres-starter', name: 'CertainTeed Presidential Starter (36 LF)', category: 'Starter & Ridge', unit: 'BD', unitCost: 111.5, basis: 'eavesRakes', coverage: 36, wastePct: 5 },
  { id: 'shadow-ridge', name: 'CertainTeed Shadow Hip & Ridge (45 LF/bundle)', category: 'Starter & Ridge', unit: 'BD', unitCost: 102.5, basis: 'ridgesHips', coverage: 45, wastePct: 10 },

  // Pipe jacks
  { id: 'lead-jack-3', name: 'Santa Lead Flashing (Pipe Jack) 3" Pitched 4/12', category: 'Pipe Jacks', unit: 'PC', unitCost: 44, basis: 'manual', coverage: 1 },
  { id: 'lead-jack-2', name: 'Santa Lead Flashing (Pipe Jack) 2" Pitched 4/12', category: 'Pipe Jacks', unit: 'PC', unitCost: 44, basis: 'pipeBoots', coverage: 1, wastePct: 0 },
  { id: 'lead-jack-15', name: 'Santa Lead Flashing (Pipe Jack) 1.5" Pitched 4/12', category: 'Pipe Jacks', unit: 'PC', unitCost: 39, basis: 'manual', coverage: 1 },
  { id: 'oately-flash', name: 'Oatey collar flash mill 1.5-3"', category: 'Pipe Jacks', unit: 'PC', unitCost: 10, basis: 'manual', coverage: 1 },

  // Flashing
  { id: 'galv-rtw', name: 'Galvanized Roof-to-Wall 26 Ga 4"x6" 4/12 Brown', category: 'Flashing', unit: 'PC', unitCost: 42, basis: 'manual', coverage: 10 },
  { id: 'alum-rtw', name: 'Alum RTW .032 4x6 110° Brown', category: 'Flashing', unit: 'PC', unitCost: 71.75, basis: 'wallFlashing', coverage: 10, wastePct: 5 },
  // Coverage matches the 7/27 order (21 LF → 15 BD); adjust if the bundle count differs.
  { id: 'step-flash', name: 'Step Flashing 50/bundle', category: 'Flashing', unit: 'BD', unitCost: 7.53, basis: 'stepFlashing', coverage: 1.5, wastePct: 5 },
  { id: 'lambro-cap', name: 'Lambro 107 10" Roof Cap w/ Flange', category: 'Flashing', unit: 'PC', unitCost: 75, basis: 'manual', coverage: 1 },

  // Nails
  { id: 'coil-34', name: '3/4" Coil Roofing Nails HDG — Eaves (none if soffits)', category: 'Nails', unit: 'BX', unitCost: 95, basis: 'perJob', coverage: 1, wastePct: 0 },
  { id: 'coil-1', name: '1" Coil Roofing Nails HDG (15 sq/box) — Field', category: 'Nails', unit: 'BX', unitCost: 95, basis: 'squares', coverage: 15, wastePct: 0 },
  { id: 'coil-114', name: '1 1/4" Coil Roofing Nails HDG — Ridge', category: 'Nails', unit: 'BX', unitCost: 95, basis: 'manual', coverage: 1 },
  { id: 'coil-134', name: '1 3/4" Coil Roofing Nails HDG — Ridge', category: 'Nails', unit: 'BX', unitCost: 125, basis: 'manual', coverage: 1 },
  { id: 'cap-nail-1', name: 'Nail ABC Plastic Cap 1" 3M/Pail (20 sq/pail)', category: 'Nails', unit: 'PA', unitCost: 46.25, basis: 'squares', coverage: 20, wastePct: 0 },
  { id: 'cap-nail-34', name: 'Nail ABC Plastic Cap 3/4" 3M/Pail (20 sq/pail)', category: 'Nails', unit: 'PA', unitCost: 27.5, basis: 'manual', coverage: 1 },
  { id: 'ss-34', name: 'Stainless Steel Nails 3/4"', category: 'Nails', unit: 'BX', unitCost: 220, basis: 'manual', coverage: 1 },
  { id: 'ss-1', name: 'Stainless Steel Nails 1"', category: 'Nails', unit: 'BX', unitCost: 255, basis: 'manual', coverage: 1 },
  { id: 'ss-114', name: 'Stainless Steel Nails 1 1/4"', category: 'Nails', unit: 'BX', unitCost: 275, basis: 'manual', coverage: 1 },
  { id: 'staples', name: 'Staples', category: 'Nails', unit: 'BX', unitCost: 7.5, basis: 'area', coverage: 800, wastePct: 0 },

  // Underlayment
  { id: 'felt-30', name: '30# ASTM Felt Underlayment (2 sq/roll)', category: 'Underlayment', unit: 'RL', unitCost: 60, basis: 'area', coverage: 200 },
  { id: 'roofrunner', name: 'CertainTeed RoofRunner Synthetic (10 sq/roll)', category: 'Underlayment', unit: 'RL', unitCost: 118.25, basis: 'area', coverage: 1000 },
  { id: 'winterguard', name: 'CertainTeed WinterGuard Granular 3x65 (2 sq/roll)', category: 'Underlayment', unit: 'RL', unitCost: 124, basis: 'iceWaterArea', coverage: 195, wastePct: 10 },
  { id: 'tileseal', name: 'Boral TileSeal (2x72x36")', category: 'Underlayment', unit: 'RL', unitCost: 155.5, basis: 'manual', coverage: 1 },
  { id: 'vycor', name: 'Grace Vycor (34"x70\') 30 mil', category: 'Underlayment', unit: 'RL', unitCost: 126, basis: 'manual', coverage: 1 },
  { id: 'geocel', name: 'Geocel Sealant Clear', category: 'Underlayment', unit: 'TB', unitCost: 11.5, basis: 'manual', coverage: 1 },

  // Drip edge
  { id: 'galv-drip', name: 'Galvanized Drip 1.5" (10\' LF)', category: 'Drip Edge', unit: 'PC', unitCost: 12.5, basis: 'manual', coverage: 10 },
  { id: 'alum-drip-15', name: 'Aluminum Nosing Drip 1.5" (10\' LF)', category: 'Drip Edge', unit: 'PC', unitCost: 26.25, basis: 'eavesRakes', coverage: 10, wastePct: 15 },
  { id: 'alum-drip-3', name: 'Aluminum Nosing Drip 3" (10\' LF)', category: 'Drip Edge', unit: 'PC', unitCost: 37.8, basis: 'manual', coverage: 10 },

  // Venting
  { id: 'ridge-vent', name: 'Ridge Vent (4 ft)', category: 'Venting', unit: 'EA', unitCost: 20, basis: 'ridges', coverage: 4, wastePct: 0 },
  { id: 'hood-vent', name: 'Hood Vent', category: 'Venting', unit: 'EA', unitCost: 20, basis: 'vents', coverage: 1, wastePct: 0 },
  { id: 'turbine', name: 'Turbine Vent (Lowe\'s)', category: 'Venting', unit: 'EA', unitCost: 196.67, basis: 'manual', coverage: 1 },

  // Flat roof (3-ply)
  { id: 'base-sheet', name: 'Base Sheet Mule-Hide (2 sq/RL)', category: 'Flat Roof (3 Ply)', unit: 'RL', unitCost: 165.24, basis: 'flatArea', coverage: 200, wastePct: 10 },
  { id: 'cap-sheet', name: 'Cap Sheet (1 sq/RL) — Black; colors available', category: 'Flat Roof (3 Ply)', unit: 'RL', unitCost: 155.44, basis: 'flatArea', coverage: 100, wastePct: 10 },
  { id: 'metal-cap-nail', name: 'Nail Metal Cap Ring 3/4" 25 LB Pail', category: 'Flat Roof (3 Ply)', unit: 'BX', unitCost: 105, basis: 'flatArea', coverage: 2500, wastePct: 0 },
  { id: 'asphalt-primer', name: 'Asphalt Primer', category: 'Flat Roof (3 Ply)', unit: 'Can', unitCost: 18.51, basis: 'manual', coverage: 1 },

  // Coatings
  { id: 'hs-primer', name: 'H/S Surebond Primer — 5 gal', category: 'Coatings', unit: '5 gal', unitCost: 210, basis: 'manual', coverage: 1 },
  { id: 'hs-base', name: 'H/S Acry Base Ct Summer — 5 gal', category: 'Coatings', unit: '5 gal', unitCost: 257, basis: 'manual', coverage: 1 },
  { id: 'hs-top', name: 'H/S Acry Top Ct White — 5 gal', category: 'Coatings', unit: '5 gal', unitCost: 243, basis: 'manual', coverage: 1 },
  { id: 'hs-butter', name: 'H/S Buttergrade', category: 'Coatings', unit: '5 gal', unitCost: 268, basis: 'manual', coverage: 1 },
  { id: 'hs-fabric', name: 'H/S Prem Coat Fabric 4"x300\'', category: 'Coatings', unit: 'RL', unitCost: 45, basis: 'manual', coverage: 1 },

  // Corrugated metal
  { id: 'corr-24', name: 'Corrugated Metal 24 Ga (per LF)', category: 'Corrugated Metal', unit: 'LF', unitCost: 11.5, basis: 'manual', coverage: 1 },
  { id: 'corr-26', name: 'Corrugated Metal 26 Ga (per LF)', category: 'Corrugated Metal', unit: 'LF', unitCost: 9.5, basis: 'manual', coverage: 1 },
  { id: 'corr-ridge', name: 'Ridge Cap (24 & 26 Ga)', category: 'Corrugated Metal', unit: 'PC', unitCost: 60, basis: 'manual', coverage: 1 },
  { id: 'corr-pitch', name: 'Pitch Change 10\' Lengths', category: 'Corrugated Metal', unit: 'PC', unitCost: 120, basis: 'manual', coverage: 1 },
  { id: 'corr-foam', name: 'Foam Closures 3\' Lengths', category: 'Corrugated Metal', unit: 'PC', unitCost: 3, basis: 'manual', coverage: 1 },
  { id: 'corr-screws', name: '2" Painted Screws Color Match (250/bag)', category: 'Corrugated Metal', unit: 'BG', unitCost: 247.5, basis: 'manual', coverage: 1 },
  { id: 'corr-drip', name: 'Drip Edge Galvanized 1-1/2" White', category: 'Corrugated Metal', unit: 'PC', unitCost: 42, basis: 'manual', coverage: 1 },
  { id: 'peel-seal-6', name: 'Peel & Seal Ridge 6"', category: 'Corrugated Metal', unit: 'RL', unitCost: 36, basis: 'manual', coverage: 1 },
  { id: 'peel-seal-9', name: 'Peel & Seal Ridge 9"', category: 'Corrugated Metal', unit: 'RL', unitCost: 55, basis: 'manual', coverage: 1 },
  { id: 'decktite', name: 'Pipe Jacks — Dektite', category: 'Corrugated Metal', unit: 'PC', unitCost: 31, basis: 'manual', coverage: 1 },

  // Decking — not on the supplier sheet yet; set the price under Settings → Price List
  { id: 'decking-sheet', name: 'Decking sheet (plywood/OSB)', category: 'Decking', unit: 'sheet', unitCost: 0, basis: 'manual', coverage: 1 },

  { id: 'delivery', name: 'Fuel Surcharge / Delivery', category: 'Delivery', unit: 'EA', unitCost: 100, basis: 'perJob', coverage: 1, wastePct: 0, alwaysInclude: true },
];

export const defaultSettings = (): Settings => ({
  company: {
    name: 'Your Roofing Company',
    license: 'Lic. #',
    address: '',
    phone: '',
    email: '',
  },
  materials,
  labor: {
    hoursPerSquare: 5.7,
    hoursPerWeek: 40,
    extraLayerHoursPerSquare: 0.5,
    pitchMultipliers: [
      { minPitch: 0, multiplier: 1 },
      { minPitch: 8, multiplier: 1.15 },
      { minPitch: 10, multiplier: 1.3 },
      { minPitch: 12, multiplier: 1.5 },
    ],
    extraStoryPct: 10,
    hoursPerDay: 8,
    crew: [
      { id: 'foreman', name: 'Foreman (Barnaby)', weeklyCost: 3562, defaultOnCrew: false },
      { id: 'lead', name: 'Lead Roofer (Barnaby)', weeklyCost: 2222, defaultOnCrew: true },
      { id: 'skilled', name: 'Skilled Roofer (Peter)', weeklyCost: 1969, defaultOnCrew: false },
      { id: 'appr-nick', name: 'Apprentice Roofer (Nick)', weeklyCost: 1616, defaultOnCrew: true },
      { id: 'appr-gio', name: 'Apprentice Roofer (Giovanni)', weeklyCost: 1485, defaultOnCrew: true },
    ],
  },
  jobCosts: [
    { id: 'dump-time', name: 'Dump — Wholesale 850 or 875', description: 'Waste removal time', unitCost: 475, unitLabel: 'trip', squaresPerUnit: 16, defaultQty: 0 },
    { id: 'dump-fees', name: 'Dump fees', description: 'Landfill + haul-off', unitCost: 121, unitLabel: 'load', squaresPerUnit: 8, defaultQty: 0 },
    { id: 'equipment', name: 'Equipment rental', description: 'Lift, compressor, trailer, etc.', unitCost: 0, unitLabel: 'job', defaultQty: 0 },
    { id: 'subs', name: 'Subcontractors', description: 'Specialty work (if any)', unitCost: 0, unitLabel: 'job', defaultQty: 0 },
    { id: 'per-diem', name: 'Travel / per diem (+$6/hr/pp)', description: 'For off-island jobs', unitCost: 144, unitLabel: 'person-day', defaultQty: 0 },
    { id: 'lodging', name: 'Accommodation', description: 'Out of area', unitCost: 100, unitLabel: 'night', defaultQty: 0 },
    { id: 'contingency', name: 'Contingency', description: 'Optional buffer', unitCost: 1500, unitLabel: 'job', defaultQty: 0 },
  ],
  pricing: {
    materialTaxPct: 0.5,
    overheadPct: 0,
    grossMarginPct: 30,
    minMarginPct: 30,
    salesTaxPct: 4.712,
    depositPct: 50,
  },
  scopeOptions: [
    {
      id: 'tearoff', label: 'Tear off existing roofing', defaultOn: true, materialIds: [],
      contractText: 'Remove all existing roofing down to the roof deck and haul away all debris.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'decking', label: 'Replace damaged decking (per sheet)', defaultOn: true, materialIds: ['decking-sheet'],
      contractText: 'Inspect the roof deck after tear-off and replace rotted or damaged decking at the per-sheet price listed.',
      charge: { type: 'perUnit', amount: 35, unitLabel: 'sheet' },
    },
    {
      id: 'felt', label: '30# felt underlayment', defaultOn: true, materialIds: ['felt-30', 'staples'],
      contractText: 'Install 30# ASTM felt underlayment over the entire roof deck.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'synthetic', label: 'Synthetic underlayment (instead of felt)', defaultOn: false, materialIds: ['roofrunner', 'cap-nail-1'],
      contractText: 'Install CertainTeed RoofRunner synthetic underlayment over the entire roof deck.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'icewater', label: 'WinterGuard at eaves and valleys', defaultOn: false, materialIds: ['winterguard'],
      contractText: 'Install CertainTeed WinterGuard self-adhered membrane along eaves and in all valleys.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'dripedge', label: 'New aluminum drip edge', defaultOn: true, materialIds: ['alum-drip-15'],
      contractText: 'Install new 1.5" aluminum nosing drip edge along all eaves and rakes.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'shingles', label: 'Shingles, starter and hip & ridge', defaultOn: true,
      materialIds: ['landmark-pro', 'landmark-ar', 'landmark-pres', 'swiftstart', 'shadow-ridge', 'coil-1'],
      contractText: 'Install starter strip, field shingles and hip & ridge cap per manufacturer specifications.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'open-eaves', label: 'Exposed eaves (no soffits) — 3/4" nails', defaultOn: true, materialIds: ['coil-34'],
      contractText: 'Use short nails at exposed eaves so no fasteners show through the overhang.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'flashing', label: 'Replace step & roof-to-wall flashing', defaultOn: true, materialIds: ['step-flash', 'alum-rtw'],
      contractText: 'Replace step flashing and roof-to-wall flashing at all roof-to-wall transitions.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'pipejacks', label: 'Replace pipe jacks (lead)', defaultOn: true, materialIds: ['lead-jack-2'],
      contractText: 'Replace all plumbing pipe jacks with new lead flashings.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'ridgevent', label: 'Ridge vent', defaultOn: true, materialIds: ['ridge-vent'],
      contractText: 'Cut in and install ridge vent.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'hoodvents', label: 'Replace hood vents', defaultOn: false, materialIds: ['hood-vent'],
      contractText: 'Replace existing hood vents.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'flatroof', label: 'Flat roof — 3-ply system', defaultOn: false, materialIds: ['base-sheet', 'cap-sheet', 'metal-cap-nail'],
      contractText: 'Install a 3-ply modified flat roof system (base sheet and cap sheet) on low-slope areas.',
      charge: { type: 'none', amount: 0 },
    },
    {
      id: 'skylight', label: 'Re-flash skylights', defaultOn: false, materialIds: [],
      contractText: 'Re-flash skylight(s).',
      charge: { type: 'perUnit', amount: 250, unitLabel: 'skylight' },
    },
    {
      id: 'permit', label: 'Building permit', defaultOn: false, materialIds: [],
      contractText: 'Obtain the required building permit and schedule inspections.',
      charge: { type: 'fixed', amount: 350 },
    },
    {
      id: 'cleanup', label: 'Daily cleanup & magnetic nail sweep', defaultOn: true, materialIds: [],
      contractText: 'Clean the job site daily and run a magnetic nail sweep of the yard, driveway and landscaping at completion.',
      charge: { type: 'none', amount: 0 },
    },
  ],
  contractTerms: [
    'Any rotted or damaged decking discovered after tear-off will be replaced at the per-sheet price listed in this agreement and added to the final invoice.',
    'Work not listed in the scope of work is excluded unless added by a written change order signed by both parties.',
    'Start date is an estimate and may move because of weather, material availability, or permit timing. Contractor will notify the customer of any change.',
    'Customer agrees to provide access to the property, driveway space for materials and debris removal, and electrical power.',
    'Contractor carries general liability and workers\' compensation insurance. Certificates are available on request.',
    'Balance is due upon completion. Unpaid balances over 30 days accrue 1.5% interest per month.',
    'This agreement may be cancelled by the customer in writing within 3 business days of signing.',
  ].join('\n'),
  warranty: '5-year workmanship warranty from the date of completion. Shingle manufacturer warranty per the manufacturer\'s terms.',
});

export const emptyMeasurements = (): Measurements => ({
  areaSqFt: 0, flatAreaSqFt: 0, pitch: 4, stories: 1, layers: 1,
  eaves: 0, rakes: 0, ridges: 0, hips: 0, valleys: 0,
  stepFlashing: 0, wallFlashing: 0,
  pipeBoots: 0, vents: 0, chimneys: 0, skylights: 0,
  iceWaterRows: 1,
});

export const emptyCustomer = (): Customer => ({
  type: 'homeowner', name: '', company: '', phone: '', email: '', propertyAddress: '', billingAddress: '',
});

export const newEstimate = (settings: Settings, number: string): Estimate => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    number,
    createdAt: now,
    updatedAt: now,
    estimator: '',
    customer: emptyCustomer(),
    measurements: emptyMeasurements(),
    wastePct: 10,
    scope: Object.fromEntries(settings.scopeOptions.map((o) => [o.id, { on: o.defaultOn, qty: 0 }])),
    materialOverrides: {},
    shingleId: settings.materials.find((m) => m.category === 'Shingles' && m.basis === 'area')?.id,
    shingleColor: '',
    crewIds: settings.labor.crew.filter((c) => c.defaultOnCrew).map((c) => c.id),
    jobCosts: {},
    startDate: '',
    notes: '',
    paymentTerms: '',
    showMaterialList: true,
    showItemizedPrices: false,
    status: 'draft',
  };
};
