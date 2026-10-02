import type { Material, QuantityBasis } from './types';
import { BASIS_LABELS } from './calc';

/** Minimal RFC-4180 style parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'item', 'material', 'description', 'product'],
  unit: ['unit', 'uom', 'unit of measure'],
  cost: ['cost', 'price', 'unit cost', 'unit price', 'each'],
  category: ['category', 'type', 'group'],
  basis: ['basis', 'measure', 'calculated from'],
  coverage: ['coverage', 'covers', 'coverage per unit'],
  waste: ['waste', 'waste %', 'waste pct'],
};

const toNumber = (s: string | undefined) => {
  if (s === undefined) return NaN;
  const cleaned = s.replace(/[$,%\s]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseBasis(s: string | undefined): QuantityBasis | undefined {
  if (!s) return undefined;
  const v = s.trim().toLowerCase();
  for (const [key, label] of Object.entries(BASIS_LABELS)) {
    if (key.toLowerCase() === v || label.toLowerCase() === v) return key as QuantityBasis;
  }
  return undefined;
}

export interface ImportResult {
  materials: Material[];
  updated: number;
  added: number;
  skipped: string[];
}

/**
 * Merges a CSV price list into the existing materials. Rows whose name matches an
 * existing material (case-insensitive) update its cost and any other columns given;
 * new names are added (basis defaults to manual quantity).
 */
export function importPriceList(csv: string, existing: Material[]): ImportResult {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { materials: existing, updated: 0, added: 0, skipped: ['No data rows found.'] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = header.findIndex((h) => aliases.includes(h));
    if (idx >= 0) col[key] = idx;
  }
  if (col.name === undefined || col.cost === undefined) {
    return { materials: existing, updated: 0, added: 0, skipped: ['CSV needs at least a "name" and a "cost" column.'] };
  }

  const materials = existing.map((m) => ({ ...m }));
  let updated = 0;
  let added = 0;
  const skipped: string[] = [];
  for (const r of rows.slice(1)) {
    const name = r[col.name]?.trim();
    const cost = toNumber(r[col.cost]);
    if (!name || Number.isNaN(cost)) {
      skipped.push(`Row "${r.join(',')}" — missing name or cost`);
      continue;
    }
    const unit = col.unit !== undefined ? r[col.unit]?.trim() : undefined;
    const category = col.category !== undefined ? r[col.category]?.trim() : undefined;
    const basis = parseBasis(col.basis !== undefined ? r[col.basis] : undefined);
    const coverage = toNumber(col.coverage !== undefined ? r[col.coverage] : undefined);
    const waste = toNumber(col.waste !== undefined ? r[col.waste] : undefined);

    const match = materials.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (match) {
      match.unitCost = cost;
      if (unit) match.unit = unit;
      if (category) match.category = category;
      if (basis) match.basis = basis;
      if (!Number.isNaN(coverage) && coverage > 0) match.coverage = coverage;
      if (!Number.isNaN(waste)) match.wastePct = waste;
      updated++;
    } else {
      let id = slug(name) || `item-${materials.length}`;
      while (materials.some((m) => m.id === id)) id += '-1';
      materials.push({
        id,
        name,
        category: category || 'Other',
        unit: unit || 'each',
        unitCost: cost,
        basis: basis ?? 'manual',
        coverage: !Number.isNaN(coverage) && coverage > 0 ? coverage : 1,
        ...(Number.isNaN(waste) ? {} : { wastePct: waste }),
      });
      added++;
    }
  }
  return { materials, updated, added, skipped };
}

export function exportPriceList(materials: Material[]): string {
  const esc = (s: string | number | undefined) => {
    const v = s === undefined ? '' : String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = ['name,category,unit,cost,basis,coverage,waste'];
  for (const m of materials) {
    lines.push([m.name, m.category, m.unit, m.unitCost, m.basis, m.coverage, m.wastePct].map(esc).join(','));
  }
  return lines.join('\n');
}
