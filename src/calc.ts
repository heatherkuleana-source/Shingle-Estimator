import type { CrewMember, Estimate, JobCostItem, Material, Measurements, QuantityBasis, ScopeOption, Settings } from './types';

export const BASIS_LABELS: Record<QuantityBasis, string> = {
  area: 'Roof area (sq ft)',
  squares: 'Roof squares',
  flatArea: 'Flat roof area (sq ft)',
  eaves: 'Eaves (LF)',
  rakes: 'Rakes (LF)',
  eavesRakes: 'Eaves + rakes (LF)',
  ridges: 'Ridges (LF)',
  hips: 'Hips (LF)',
  ridgesHips: 'Ridges + hips (LF)',
  valleys: 'Valleys (LF)',
  stepFlashing: 'Step flashing (LF)',
  wallFlashing: 'Wall flashing (LF)',
  iceWaterArea: 'Ice & water area (sq ft)',
  pipeBoots: 'Pipe jacks (count)',
  vents: 'Vents (count)',
  chimneys: 'Chimneys (count)',
  skylights: 'Skylights (count)',
  perJob: 'One per job',
  manual: 'Manual quantity',
};

/** Width of one ice & water shield course, in feet. */
const ICE_WATER_WIDTH_FT = 3;

export function basisValue(m: Measurements, basis: QuantityBasis): number {
  switch (basis) {
    case 'area': return m.areaSqFt;
    case 'squares': return m.areaSqFt / 100;
    case 'flatArea': return m.flatAreaSqFt;
    case 'eaves': return m.eaves;
    case 'rakes': return m.rakes;
    case 'eavesRakes': return m.eaves + m.rakes;
    case 'ridges': return m.ridges;
    case 'hips': return m.hips;
    case 'ridgesHips': return m.ridges + m.hips;
    case 'valleys': return m.valleys;
    case 'stepFlashing': return m.stepFlashing;
    case 'wallFlashing': return m.wallFlashing;
    case 'iceWaterArea': return (m.eaves * m.iceWaterRows + m.valleys) * ICE_WATER_WIDTH_FT;
    case 'pipeBoots': return m.pipeBoots;
    case 'vents': return m.vents;
    case 'chimneys': return m.chimneys;
    case 'skylights': return m.skylights;
    case 'perJob': return 1;
    case 'manual': return 0;
  }
}

/** Suggested waste % from roof shape: more hips/valleys means more cuts. */
export function suggestedWastePct(m: Measurements): number {
  if (m.areaSqFt <= 0) return 10;
  const cutLf = m.hips + m.valleys;
  const ratio = cutLf / (m.areaSqFt / 100); // LF of cut lines per square
  if (ratio < 2) return 10; // simple gable
  if (ratio < 5) return 12;
  if (ratio < 8) return 15;
  return 17; // cut-up hip roof
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Field shingle products: only the one chosen on the estimate is ordered. */
export const isShingleProduct = (m: Material) => m.category === 'Shingles' && m.basis === 'area';

export interface MaterialLine {
  material: Material;
  measure: number;
  wastePct: number;
  qty: number;
  manual: boolean;
  cost: number;
}

function scopeOptionsFor(materialId: string, settings: Settings) {
  return settings.scopeOptions.filter((o) => o.materialIds.includes(materialId));
}

/** True when a selected scope item (or the material's always-include flag) brings it onto the job. */
export function isMaterialInScope(material: Material, estimate: Estimate, settings: Settings): boolean {
  if (material.alwaysInclude) return true;
  if (isShingleProduct(material) && estimate.shingleId && material.id !== estimate.shingleId) return false;
  return scopeOptionsFor(material.id, settings).some((o) => estimate.scope[o.id]?.on);
}

export function materialLines(estimate: Estimate, settings: Settings): MaterialLine[] {
  const lines: MaterialLine[] = [];
  for (const material of settings.materials) {
    const override = estimate.materialOverrides[material.id];
    if (override?.off) continue;
    if (!override?.add && !isMaterialInScope(material, estimate, settings)) continue;

    const measure = basisValue(estimate.measurements, material.basis);
    const wastePct = material.wastePct ?? (material.basis === 'area' || material.basis === 'flatArea' ? estimate.wastePct : 0);
    let qty: number;
    let manual = false;
    if (override?.qty !== undefined) {
      qty = override.qty;
      manual = true;
    } else if (material.basis === 'manual') {
      // Manual items pick up the quantity entered on their per-unit scope item (e.g. decking sheets).
      const perUnit = scopeOptionsFor(material.id, settings).find((o) => o.charge.type === 'perUnit' && estimate.scope[o.id]?.on);
      qty = perUnit ? estimate.scope[perUnit.id]?.qty ?? 0 : 0;
    } else {
      const coverage = material.coverage > 0 ? material.coverage : 1;
      // Small epsilon so 30.0000001 bundles from float math doesn't round up to 31.
      qty = Math.max(0, Math.ceil((measure * (1 + wastePct / 100)) / coverage - 1e-9));
    }
    // Keep explicitly added items visible (qty 0) so a quantity can be typed in.
    if (qty <= 0 && !manual && !override?.add) continue;
    lines.push({ material, measure, wastePct, qty, manual, cost: round2(qty * material.unitCost) });
  }
  return lines;
}

export const totalSquares = (m: Measurements) => (m.areaSqFt + m.flatAreaSqFt) / 100;

export interface LaborResult {
  squares: number;
  hoursPerSquare: number;
  pitchMultiplier: number;
  storyMultiplier: number;
  installHours: number;
  extraLayerHours: number;
  totalHours: number;
  crew: CrewMember[];
  /** Average hourly cost of the crew on this job. */
  blendedRate: number;
  cost: number;
  crewDays: number;
}

export function pitchMultiplier(pitch: number, settings: Settings): number {
  const tiers = [...settings.labor.pitchMultipliers].sort((a, b) => a.minPitch - b.minPitch);
  let mult = 1;
  for (const t of tiers) if (pitch >= t.minPitch) mult = t.multiplier;
  return mult;
}

export function laborFor(estimate: Estimate, settings: Settings): LaborResult {
  const { labor } = settings;
  const m = estimate.measurements;
  const squares = totalSquares(m);
  const hoursPerSquare = estimate.hoursPerSquare ?? labor.hoursPerSquare;
  const pitchMult = pitchMultiplier(m.pitch, settings);
  const storyMult = 1 + (labor.extraStoryPct / 100) * Math.max(0, m.stories - 1);
  const installHours = squares * hoursPerSquare;
  const extraLayerHours = estimate.scope.tearoff?.on ? squares * labor.extraLayerHoursPerSquare * Math.max(0, m.layers - 1) : 0;
  const totalHours = (installHours + extraLayerHours) * pitchMult * storyMult;

  const crew = labor.crew.filter((c) => estimate.crewIds.includes(c.id));
  const hoursPerWeek = labor.hoursPerWeek > 0 ? labor.hoursPerWeek : 40;
  const blendedRate = crew.length ? crew.reduce((s, c) => s + c.weeklyCost / hoursPerWeek, 0) / crew.length : 0;
  const crewHoursPerDay = Math.max(1, crew.length) * Math.max(1, labor.hoursPerDay);
  return {
    squares,
    hoursPerSquare,
    pitchMultiplier: pitchMult,
    storyMultiplier: storyMult,
    installHours: round2(installHours),
    extraLayerHours: round2(extraLayerHours),
    totalHours: round2(totalHours),
    crew,
    blendedRate: round2(blendedRate),
    cost: round2(totalHours * blendedRate),
    crewDays: totalHours > 0 ? Math.ceil(totalHours / crewHoursPerDay - 1e-9) : 0,
  };
}

export interface ScopeChargeLine {
  option: ScopeOption;
  qty: number;
  cost: number;
}

export function scopeCharges(estimate: Estimate, settings: Settings): ScopeChargeLine[] {
  const squares = totalSquares(estimate.measurements);
  const lines: ScopeChargeLine[] = [];
  for (const option of settings.scopeOptions) {
    const sel = estimate.scope[option.id];
    if (!sel?.on) continue;
    const { type, amount } = option.charge;
    let qty = 0;
    if (type === 'fixed') qty = 1;
    else if (type === 'perSquare') qty = squares;
    else if (type === 'perUnit') qty = sel.qty;
    const cost = round2(qty * amount);
    if (cost > 0) lines.push({ option, qty, cost });
  }
  return lines;
}

export interface JobCostLine {
  item: JobCostItem;
  qty: number;
  unitCost: number;
  cost: number;
  isDefault: boolean;
}

export function defaultJobCostQty(item: JobCostItem, estimate: Estimate): number {
  const squares = totalSquares(estimate.measurements);
  if (item.squaresPerUnit && item.squaresPerUnit > 0) return squares > 0 ? Math.ceil(squares / item.squaresPerUnit - 1e-9) : 0;
  return item.defaultQty;
}

export function jobCostLines(estimate: Estimate, settings: Settings): JobCostLine[] {
  return settings.jobCosts.map((item) => {
    const o = estimate.jobCosts[item.id];
    const qty = o?.qty ?? defaultJobCostQty(item, estimate);
    const unitCost = o?.unitCost ?? item.unitCost;
    return { item, qty, unitCost, cost: round2(qty * unitCost), isDefault: o === undefined };
  });
}

export interface Totals {
  materials: MaterialLine[];
  labor: LaborResult;
  charges: ScopeChargeLine[];
  jobCosts: JobCostLine[];
  materialCost: number;
  materialTax: number;
  laborCost: number;
  chargesCost: number;
  otherCost: number;
  directCost: number;
  overhead: number;
  jobCost: number;
  marginPct: number;
  grossProfit: number;
  subtotal: number;
  salesTax: number;
  total: number;
  deposit: number;
  balance: number;
  pricePerSquare: number;
  durationDays: number;
  dailyProfit: number;
  /** Multiplier from a direct cost to its pre-tax customer price. */
  priceFactor: number;
}

export function priceFactor(settings: Settings, marginPct: number): number {
  const margin = Math.min(Math.max(marginPct, 0), 95) / 100;
  return (1 + settings.pricing.overheadPct / 100) / (1 - margin);
}

export function computeTotals(estimate: Estimate, settings: Settings): Totals {
  const { pricing } = settings;
  const materials = materialLines(estimate, settings);
  const labor = laborFor(estimate, settings);
  const charges = scopeCharges(estimate, settings);
  const jobCosts = jobCostLines(estimate, settings);
  const materialCost = round2(materials.reduce((s, l) => s + l.cost, 0));
  const materialTax = round2(materialCost * (pricing.materialTaxPct / 100));
  const chargesCost = round2(charges.reduce((s, l) => s + l.cost, 0));
  const otherCost = round2(jobCosts.reduce((s, l) => s + l.cost, 0));
  const directCost = round2(materialCost + materialTax + labor.cost + chargesCost + otherCost);
  const overhead = round2(directCost * (pricing.overheadPct / 100));
  const jobCost = round2(directCost + overhead);
  const marginPct = estimate.grossMarginPct ?? pricing.grossMarginPct;
  const subtotal = round2(directCost * priceFactor(settings, marginPct));
  const grossProfit = round2(subtotal - jobCost);
  const salesTax = round2(subtotal * (pricing.salesTaxPct / 100));
  const total = round2(subtotal + salesTax);
  const deposit = round2(total * (pricing.depositPct / 100));
  const durationDays = estimate.durationDaysOverride ?? labor.crewDays;
  return {
    materials,
    labor,
    charges,
    jobCosts,
    materialCost,
    materialTax,
    laborCost: labor.cost,
    chargesCost,
    otherCost,
    directCost,
    overhead,
    jobCost,
    marginPct,
    grossProfit,
    subtotal,
    salesTax,
    total,
    deposit,
    balance: round2(total - deposit),
    pricePerSquare: labor.squares > 0 ? round2(total / labor.squares) : 0,
    durationDays,
    dailyProfit: durationDays > 0 ? round2(grossProfit / durationDays) : 0,
    priceFactor: priceFactor(settings, marginPct),
  };
}

/**
 * Customer price (incl. sales tax) for one extra unit of a per-unit scope item, e.g. one
 * sheet of decking: the item's charge plus its manual-quantity materials, priced at the job's margin.
 */
export function unitPriceForScope(option: ScopeOption, settings: Settings, marginPct = settings.pricing.grossMarginPct): number {
  const { pricing } = settings;
  const materialPerUnit = settings.materials
    .filter((m) => option.materialIds.includes(m.id) && m.basis === 'manual')
    .reduce((s, m) => s + m.unitCost, 0);
  const cost = option.charge.amount + materialPerUnit * (1 + pricing.materialTaxPct / 100);
  return round2(cost * priceFactor(settings, marginPct) * (1 + pricing.salesTaxPct / 100));
}

/** Adds working days (Mon–Fri). A 1-day job finishes on its start date. */
export function completionDate(startIso: string, workingDays: number): string {
  if (!startIso || workingDays <= 0) return '';
  const d = new Date(startIso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  let remaining = workingDays - 1;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const num = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits });

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}
