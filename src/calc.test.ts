import { describe, expect, it } from 'vitest';
import { completionDate, computeTotals, laborFor, materialLines, unitPriceForScope } from './calc';
import { defaultSettings, newEstimate } from './defaults';
import type { Estimate } from './types';

const settings = defaultSettings();

/** 60 Malia Uli Rd: 32 sq at 4/12 + 1 sq flat, per the 7/27 material order. */
function maliaUli(): Estimate {
  const e = newEstimate(settings, 'T-1');
  e.measurements = {
    ...e.measurements,
    areaSqFt: 3192.8, flatAreaSqFt: 100, pitch: 4, stories: 1, layers: 1,
    eaves: 165, rakes: 100, ridges: 24, hips: 197, valleys: 0,
    stepFlashing: 21, wallFlashing: 2, pipeBoots: 2,
  };
  e.wastePct = 10;
  e.scope.flatroof = { on: true, qty: 0 };
  return e;
}

const qtyOf = (e: Estimate, id: string) => materialLines(e, settings).find((l) => l.material.id === id)?.qty;

describe('material quantities match the 7/27 order', () => {
  const e = maliaUli();
  it.each([
    ['landmark-pro', 106], // order had 105 (≈9.6% waste); 10% gives 106
    ['swiftstart', 3],
    ['shadow-ridge', 6],
    ['felt-30', 18],
    ['staples', 4],
    ['alum-drip-15', 31],
    ['ridge-vent', 6],
    ['lead-jack-2', 2],
    ['alum-rtw', 1],
    ['step-flash', 15],
    ['coil-34', 1],
    ['base-sheet', 1],
    ['cap-sheet', 2], // 1 sq + 10% waste
    ['delivery', 1],
  ])('%s → %i', (id, qty) => {
    expect(qtyOf(e, id)).toBe(qty);
  });

  it('only orders the chosen shingle line', () => {
    expect(qtyOf(e, 'landmark-ar')).toBeUndefined();
    const ar = { ...e, shingleId: 'landmark-ar' };
    expect(qtyOf(ar, 'landmark-ar')).toBe(106);
    expect(qtyOf(ar, 'landmark-pro')).toBeUndefined();
  });

  it('leaves catalog-only items off unless added', () => {
    expect(qtyOf(e, 'turbine')).toBeUndefined();
    const added = { ...e, materialOverrides: { turbine: { add: true, qty: 1 } } };
    expect(qtyOf(added, 'turbine')).toBe(1);
  });

  it('respects removals and quantity overrides', () => {
    const x = { ...e, materialOverrides: { 'ridge-vent': { off: true }, 'landmark-pro': { qty: 105 } } };
    expect(qtyOf(x, 'ridge-vent')).toBeUndefined();
    expect(qtyOf(x, 'landmark-pro')).toBe(105);
  });

  it('pulls decking sheet count from the per-unit scope item', () => {
    const x = { ...e, scope: { ...e.scope, decking: { on: true, qty: 5 } } };
    expect(qtyOf(x, 'decking-sheet')).toBe(5);
  });
});

describe('labor', () => {
  it('prices 5.7 hrs/sq at the blended crew rate', () => {
    const l = laborFor(maliaUli(), settings);
    const rate = (2222 + 1616 + 1485) / 40 / 3;
    expect(l.squares).toBeCloseTo(32.928);
    expect(l.totalHours).toBeCloseTo(32.928 * 5.7, 1);
    expect(l.blendedRate).toBeCloseTo(rate, 2);
    expect(l.cost).toBeCloseTo(l.totalHours * l.blendedRate, 0);
    expect(l.crewDays).toBe(Math.ceil((32.928 * 5.7) / 24));
  });

  it('applies steep pitch and story multipliers', () => {
    const e = maliaUli();
    e.measurements.pitch = 10;
    e.measurements.stories = 2;
    expect(laborFor(e, settings).totalHours).toBeCloseTo(32.928 * 5.7 * 1.3 * 1.1, 1);
  });
});

describe('pricing', () => {
  it('bids at target gross margin plus tax, like the estimator sheet', () => {
    const t = computeTotals(maliaUli(), settings);
    expect(t.subtotal).toBeCloseTo(t.directCost / 0.7, 0);
    expect(t.grossProfit / t.subtotal).toBeCloseTo(0.3, 3);
    expect(t.total).toBeCloseTo(t.subtotal * 1.04712, 0);
    expect(t.deposit + t.balance).toBeCloseTo(t.total, 2);
  });

  it('defaults dump runs and landfill loads from roof size', () => {
    const t = computeTotals(maliaUli(), settings);
    expect(t.jobCosts.find((j) => j.item.id === 'dump-time')!.qty).toBe(3); // 32.9 sq / 16
    expect(t.jobCosts.find((j) => j.item.id === 'dump-fees')!.qty).toBe(5); // 32.9 sq / 8
  });

  it('reproduces the sheet: $20,581.13 direct at 29.9% GP + 4.712% tax = $30,743.09', () => {
    const s = defaultSettings();
    s.pricing.grossMarginPct = 29.9;
    const e = maliaUli();
    // Price only a fixed cost equal to the sheet's direct cost.
    s.scopeOptions = [{ id: 'x', label: 'x', contractText: '', defaultOn: true, materialIds: [], charge: { type: 'fixed', amount: 20581.13 } }];
    s.materials = [];
    s.jobCosts = [];
    e.scope = { x: { on: true, qty: 0 } };
    e.crewIds = [];
    const t = computeTotals(e, s);
    expect(t.subtotal).toBeCloseTo(29359.67, 1);
    expect(t.total).toBeCloseTo(30743.09, 1);
  });

  it('prices one extra decking sheet with margin and tax', () => {
    const decking = settings.scopeOptions.find((o) => o.id === 'decking')!;
    expect(unitPriceForScope(decking, settings)).toBeCloseTo((35 / 0.7) * 1.04712, 1);
  });
});

describe('completionDate', () => {
  it('skips weekends', () => {
    expect(completionDate('2026-10-02', 1)).toBe('2026-10-02'); // Friday
    expect(completionDate('2026-10-02', 2)).toBe('2026-10-05'); // -> Monday
    expect(completionDate('2026-10-03', 1)).toBe('2026-10-05'); // Saturday start rolls to Monday
  });
});
