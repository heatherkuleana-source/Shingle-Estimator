import { describe, expect, it } from 'vitest';
import { importPriceList, parseCsv } from './csv';
import { parseReportText } from './reportParser';
import { defaultSettings } from './defaults';

describe('csv', () => {
  it('parses quoted fields', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });

  it('updates existing items by name and adds new ones', () => {
    const csv = 'Item,Unit,Price\nCT Landmark PRO (3 bundles/sq),BD,$45.50\nGutter apron,piece,12\n,,\n';
    const r = importPriceList(csv, defaultSettings().materials);
    expect(r.updated).toBe(1);
    expect(r.added).toBe(1);
    expect(r.materials.find((m) => m.id === 'landmark-pro')!.unitCost).toBe(45.5);
    expect(r.materials.find((m) => m.name === 'Gutter apron')).toMatchObject({ unitCost: 12, basis: 'manual' });
  });

  it('rejects files without name/cost columns', () => {
    expect(importPriceList('foo,bar\n1,2', []).skipped[0]).toMatch(/name/);
  });
});

describe('report parser', () => {
  it('reads EagleView-style lines', () => {
    const text = `Total Roof Area = 2,845 sq ft  Predominant Pitch = 7/12
      Ridges = 54 ft (4 Ridges) Hips = 89 ft (6 Hips) Valleys = 40 ft
      Rakes = 120 ft Eaves/Starter = 186 ft Step flashing = 33 ft Flashing = 12 ft`;
    expect(parseReportText(text)).toMatchObject({
      areaSqFt: 2845, pitch: 7, ridges: 54, hips: 89, valleys: 40, rakes: 120, eaves: 186, stepFlashing: 33, wallFlashing: 12,
    });
  });

  it('falls back to total squares', () => {
    expect(parseReportText('Total Squares: 28.5').areaSqFt).toBe(2850);
  });
});
